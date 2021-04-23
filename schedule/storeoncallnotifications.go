package schedule

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/target/goalert/permission"
	"github.com/target/goalert/validation"
	"github.com/target/goalert/validation/validate"
)

func (store *Store) SetOnCallNotifications(ctx context.Context, tx *sql.Tx, scheduleID string, notif []OnCallNotification) error {
	err := permission.LimitCheckAny(ctx, permission.User)
	if err != nil {
		return err
	}

	err = validate.Many(
		validate.UUID("ScheduleID", scheduleID),
		validate.Range("OnCallNotifications", len(notif), 0, 10),
	)
	if err != nil {
		return err
	}
	for i, n := range notif {
		if n.ChannelID == "" && n.Channel != nil {
			n.ChannelID = n.Channel.ID
		}
		err = validate.Many(err,
			validate.Range(fmt.Sprintf("OnCallNotifications[%d].Weekday", i), int(n.Weekday), 0, 7),
		)
		if n.ChannelID == "" && n.Channel == nil {
			err = validate.Many(err, validation.NewFieldError(fmt.Sprintf("OnCallNotifications[%d].Channel", i), "is required"))
			continue
		}
		if n.ChannelID != "" {
			err = validate.Many(err, validate.UUID(fmt.Sprintf("OnCallNotifications[%d].ChannelID", i), n.ChannelID))
		}
	}
	if err != nil {
		return err
	}

	return store.updateScheduleData(ctx, tx, scheduleID, func(data *Data) error {
		chanIDs := make(map[string]struct{})
		var err error
		for i := range notif {
			if notif[i].ChannelID == "" {
				notif[i].ChannelID, err = store.nc.EnsureTx(ctx, tx, notif[i].Channel.Type, notif[i].Channel.Value)
				if err != nil {
					return err
				}
			}
		}

		var toDelete []string
		for _, n := range data.V1.OnCallNotifications {
			_, ok := chanIDs[n.ChannelID]
			if ok {
				continue
			}
			toDelete = append(toDelete, n.ChannelID)
		}

		data.V1.OnCallNotifications = notif
		return store.nc.DeleteManyTx(ctx, tx, toDelete)
	})
}

// OnCallNotifications will return the current set for the provided scheduleID.
func (store *Store) OnCallNotifications(ctx context.Context, tx *sql.Tx, scheduleID string) ([]OnCallNotification, error) {
	err := permission.LimitCheckAny(ctx, permission.User)
	if err != nil {
		return nil, err
	}

	err = validate.UUID("ScheduleID", scheduleID)
	if err != nil {
		return nil, err
	}

	stmt := store.findData
	if tx != nil {
		stmt = tx.StmtContext(ctx, stmt)
	}
	var rawData json.RawMessage
	err = stmt.QueryRowContext(ctx, scheduleID).Scan(&rawData)
	if err == sql.ErrNoRows {
		err = nil
	}
	if err != nil {
		return nil, err
	}

	var data Data
	if len(rawData) > 0 {
		err = json.Unmarshal(rawData, &data)
		if err != nil {
			return nil, err
		}
	}

	return data.V1.OnCallNotifications, nil
}
