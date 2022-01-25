package engine

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pkg/errors"
	"github.com/target/goalert/alert"
	alertlog "github.com/target/goalert/alert/log"
	"github.com/target/goalert/engine/message"
	"github.com/target/goalert/notification"
	"github.com/target/goalert/permission"
	"github.com/target/goalert/util/log"
	"go.opencensus.io/trace"
)

func (p *Engine) sendMessage(ctx context.Context, msg *message.Message) (*notification.SendResult, error) {
	ctx, sp := trace.StartSpan(ctx, "Engine.SendMessage")
	defer sp.End()
	sp.AddAttributes(
		trace.StringAttribute("message.id", msg.ID),
		trace.StringAttribute("message.type", msg.Type.String()),
		trace.StringAttribute("dest.type", msg.Dest.Type.String()),
		trace.StringAttribute("dest.id", msg.Dest.ID),
	)

	ctx = log.WithField(ctx, "CallbackID", msg.ID)

	//log.Logf(ctx, "userId : %s", msg.UserID)

	if msg.Dest.Type.IsUserCM() {
		ctx = permission.UserSourceContext(ctx, msg.UserID, permission.RoleUser, &permission.SourceInfo{
			Type: permission.SourceTypeContactMethod,
			ID:   msg.Dest.ID,
		})
	} else {
		ctx = permission.SystemContext(ctx, "SendMessage")
		ctx = permission.SourceContext(ctx, &permission.SourceInfo{
			Type: permission.SourceTypeNotificationChannel,
			ID:   msg.Dest.ID,
		})
	}

	var notifMsg notification.Message
	var isFirstAlertMessage bool
	switch msg.Type {
	case notification.MessageTypeAlertBundle:
		name, count, err := p.am.ServiceInfo(ctx, msg.ServiceID)
		if err != nil {
			return nil, errors.Wrap(err, "lookup service info")
		}
		if count == 0 {
			// already acked/closed, don't send bundled notification
			return &notification.SendResult{
				ID: msg.ID,
				Status: notification.Status{
					Details: "alerts acked/closed before message sent",
					State:   notification.StateFailedPerm,
				},
			}, nil
		}
		notifMsg = notification.AlertBundle{
			Dest:        msg.Dest,
			CallbackID:  msg.ID,
			ServiceID:   msg.ServiceID,
			ServiceName: name,
			Count:       count,
		}
	case notification.MessageTypeAlert:
		a, err := p.am.FindOne(ctx, msg.AlertID)
		if err != nil {
			return nil, errors.Wrap(err, "lookup alert")
		}
		stat, err := p.cfg.NotificationStore.OriginalMessageStatus(ctx, msg.AlertID, msg.Dest)
		if err != nil {
			return nil, fmt.Errorf("lookup original message: %w", err)
		}
		if stat != nil && stat.ID == msg.ID {
			// set to nil if it's the current message
			stat = nil
		}
		notifMsg = notification.Alert{
			Dest:       msg.Dest,
			AlertID:    msg.AlertID,
			Summary:    a.Summary,
			Details:    a.Details,
			CallbackID: msg.ID,

			OriginalStatus: stat,
		}
		isFirstAlertMessage = stat == nil
	case notification.MessageTypeAlertStatus:
		e, err := p.cfg.AlertLogStore.FindOne(ctx, msg.AlertLogID)
		if err != nil {
			return nil, errors.Wrap(err, "lookup alert log entry")
		}
		a, err := p.cfg.AlertStore.FindOne(ctx, msg.AlertID)
		if err != nil {
			return nil, fmt.Errorf("lookup original alert: %w", err)
		}
		stat, err := p.cfg.NotificationStore.OriginalMessageStatus(ctx, msg.AlertID, msg.Dest)
		if err != nil {
			return nil, fmt.Errorf("lookup original message: %w", err)
		}
		if stat == nil {
			return nil, fmt.Errorf("could not find original notification for alert %d to %s", msg.AlertID, msg.Dest.String())
		}

		var status alert.Status
		switch e.Type() {
		case alertlog.TypeAcknowledged:
			status = alert.StatusActive
		case alertlog.TypeEscalated:
			status = alert.StatusTriggered
		case alertlog.TypeClosed:
			status = alert.StatusClosed
		}

		notifMsg = notification.AlertStatus{
			Dest:           msg.Dest,
			AlertID:        e.AlertID(),
			CallbackID:     msg.ID,
			LogEntry:       e.String(),
			Event:          string(e.Type()),
			Time:           e.Timestamp(),
			Summary:        a.Summary,
			Details:        a.Details,
			NewAlertStatus: status,
			OriginalStatus: *stat,
		}
	case notification.MessageTypeTest:
		notifMsg = notification.Test{
			Dest:       msg.Dest,
			CallbackID: msg.ID,
		}
	case notification.MessageTypeVerification:
		code, err := p.cfg.NotificationStore.Code(ctx, msg.VerifyID)
		if err != nil {
			return nil, errors.Wrap(err, "lookup verification code")
		}
		notifMsg = notification.Verification{
			Dest:       msg.Dest,
			CallbackID: msg.ID,
			Code:       code,
		}
	case notification.MessageTypeScheduleOnCallUsers:
		users, err := p.cfg.OnCallStore.OnCallUsersBySchedule(ctx, msg.ScheduleID)
		if err != nil {
			return nil, errors.Wrap(err, "lookup on call users by schedule")
		}
		sched, err := p.cfg.ScheduleStore.FindOne(ctx, msg.ScheduleID)
		if err != nil {
			return nil, errors.Wrap(err, "lookup schedule by id")
		}

		var onCallUsers []notification.User
		for _, u := range users {
			onCallUsers = append(onCallUsers, notification.User{
				Name: u.Name,
				ID:   u.ID,
				URL:  p.cfg.ConfigSource.Config().CallbackURL("/users/" + u.ID),
			})
		}

		notifMsg = notification.ScheduleOnCallUsers{
			Dest:         msg.Dest,
			CallbackID:   msg.ID,
			ScheduleName: sched.Name,
			ScheduleURL:  p.cfg.ConfigSource.Config().CallbackURL("/schedules/" + msg.ScheduleID),
			ScheduleID:   msg.ScheduleID,
			Users:        onCallUsers,
		}
	default:
		log.Log(ctx, errors.New("SEND NOT IMPLEMENTED FOR MESSAGE TYPE"))
		return &notification.SendResult{ID: msg.ID, Status: notification.Status{State: notification.StateFailedPerm}}, nil
	}

	meta := alertlog.NotificationMetaData{
		MessageID: msg.ID,
	}

	res, err := p.cfg.NotificationManager.SendMessage(ctx, notifMsg)
	if err != nil {
		return nil, err
	}

	switch msg.Type {
	case notification.MessageTypeAlert:
		p.cfg.AlertLogStore.MustLog(ctx, msg.AlertID, alertlog.TypeNotificationSent, meta)
	case notification.MessageTypeAlertBundle:
		err = p.cfg.AlertLogStore.LogServiceTx(ctx, nil, msg.ServiceID, alertlog.TypeNotificationSent, meta)
		if err != nil {
			log.Log(ctx, errors.Wrap(err, "append alert log"))
		}
	}

	if isFirstAlertMessage && res.State.IsOK() {
		var chanID, cmID sql.NullString
		if msg.Dest.Type.IsUserCM() {
			cmID.Valid = true
			cmID.String = msg.Dest.ID
		} else {
			chanID.Valid = true
			chanID.String = msg.Dest.ID
		}
		_, err = p.b.trackStatus.ExecContext(ctx, chanID, cmID, msg.AlertID)
		if err != nil {
			// non-fatal, but log because it means status updates will not work for that alert/dest.
			log.Log(ctx, fmt.Errorf("track status updates for alert #%d for %s: %w", msg.AlertID, msg.Dest.String(), err))
		}
	}

	return res, nil
}
