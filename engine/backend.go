package engine

import (
	"context"
	"database/sql"

	"github.com/target/goalert/notification"
	"github.com/target/goalert/util"
	"github.com/target/goalert/validation/validate"

	uuid "github.com/satori/go.uuid"
)

type backend struct {
	db *sql.DB

	findOne     *sql.Stmt
	schedOnCall *sql.Stmt
	schedName   *sql.Stmt

	clientID string
}

func newBackend(db *sql.DB) (*backend, error) {
	p := &util.Prepare{DB: db}

	return &backend{
		db:       db,
		clientID: uuid.NewV4().String(),

		schedName: p.P(`select name from schedules where id = $1`),
		schedOnCall: p.P(`
			select distinct u.id, u.name
			from  schedule_on_call_users oc
			join users u on u.id = oc.user_id
			where oc.schedule_id = $1 and oc.end_time isnull
		`),

		findOne: p.P(`
			SELECT
				id,
				alert_id,
				service_id,
				contact_method_id
			FROM outgoing_messages
			WHERE id = $1
		`),
	}, p.Err
}

func (b *backend) OnCallMessage(ctx context.Context, scheduleID string) (*notification.OnCall, error) {
	var scheduleName string
	err := b.schedName.QueryRowContext(ctx, scheduleID).Scan(&scheduleName)
	if err != nil {
		return nil, err
	}

	rows, err := b.schedOnCall.QueryContext(ctx, scheduleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []notification.OnCallUser
	for rows.Next() {
		var usr notification.OnCallUser
		err = rows.Scan(&usr.ID, &usr.Name)
		if err != nil {
			return nil, err
		}
		users = append(users, usr)
	}

	return &notification.OnCall{
		ScheduleID:   scheduleID,
		ScheduleName: scheduleName,
		Users:        users,
	}, nil
}

func (b *backend) FindOne(ctx context.Context, id string) (*callback, error) {
	err := validate.UUID("CallbackID", id)
	if err != nil {
		return nil, err
	}

	var c callback
	var alertID sql.NullInt64
	var serviceID sql.NullString
	err = b.findOne.QueryRowContext(ctx, id).Scan(&c.ID, &alertID, &serviceID, &c.ContactMethodID)
	if err != nil {
		return nil, err
	}
	c.AlertID = int(alertID.Int64)
	c.ServiceID = serviceID.String
	return &c, nil
}
