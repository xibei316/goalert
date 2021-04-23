package schedule

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/target/goalert/permission"
	"github.com/target/goalert/validation/validate"
)

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
