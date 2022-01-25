package alertsnooze

import (
	"context"
	"database/sql"

	"github.com/lib/pq"

	"github.com/target/goalert/permission"
	"github.com/target/goalert/util/log"
	"go.opencensus.io/trace"

	"github.com/target/goalert/util"
)

type Store interface {
	Snooze(context.Context, *AlertSnooze) (*AlertSnooze, error)

	DeleteByAlertIds(ctx context.Context, id []int) error
	DeleteByAlertIdsTx(ctx context.Context, id []int) error
	DeleteByServiceId(ctx context.Context, serviceId string) error
	DeleteByServiceIdTx(ctx context.Context, serviceId string) error
}

// DB implements the ContactMethodStore against a *sql.DB backend.
type DB struct {
	db *sql.DB

	find              *sql.Stmt
	create            *sql.Stmt
	update            *sql.Stmt
	deleteByAlertIds  *sql.Stmt
	deleteByServiceId *sql.Stmt
}

func NewDB(ctx context.Context, db *sql.DB) (*DB, error) {
	p := &util.Prepare{DB: db, Ctx: ctx}
	return &DB{
		db: db,
		find: p.P(`
				SELECT id FROM snooze_alert
				WHERE alert_id = $1
			`),
		create: p.P(`
				INSERT INTO snooze_alert (alert_id, service_id, last_ack_time, delay_minutes)
				VALUES ($1,$2,$3,$4)
				RETURNING id
			`),
		update: p.P(`
				UPDATE snooze_alert SET delay_minutes = $2 WHERE alert_id = $1
				RETURNING id
			`),
		deleteByAlertIds: p.P(`
				DELETE FROM snooze_alert
  				WHERE alert_id = ANY($1)
			`),
		deleteByServiceId: p.P(`
				DELETE FROM snooze_alert
  				WHERE service_id = $1
			`),
	}, p.Err
}

func (db *DB) Snooze(ctx context.Context, sz *AlertSnooze) (*AlertSnooze, error) {

	err := permission.LimitCheckAny(ctx,
		permission.System,
		permission.Admin,
		permission.User,
		permission.MatchService(sz.ServiceID),
	)
	if err != nil {
		return nil, err
	}

	tx, err := db.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	n, err := db._createOrUpdate(ctx, tx, sz)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	trace.FromContext(ctx).Annotate(
		[]trace.Attribute{
			trace.StringAttribute("service.id", n.ServiceID),
			trace.Int64Attribute("snooze.id", int64(n.ID)),
		},
		"Snooze created.",
	)
	ctx = log.WithFields(ctx, log.Fields{"SnoozeID": n.ID, "AlertID": n.AlertID, "ServiceID": n.ServiceID})
	log.Logf(ctx, "Snooze created.")

	return n, nil
}

func (db *DB) _createOrUpdate(ctx context.Context, tx *sql.Tx, sz *AlertSnooze) (*AlertSnooze, error) {
	findRow := tx.StmtContext(ctx, db.find).QueryRowContext(ctx, sz.AlertID)
	err := findRow.Scan(&sz.ID)
	if err == sql.ErrNoRows {
		// not find -> create
		row := tx.StmtContext(ctx, db.create).QueryRowContext(ctx, sz.AlertID, sz.ServiceID, sz.LastAckTime, sz.DelayMinutes)
		err = row.Scan(&sz.ID)
		if err != nil {
			return nil, err
		}
		return sz, nil

	} else if err != nil {
		return nil, err
	}

	// find id -> update delay_minutes
	row := tx.StmtContext(ctx, db.update).QueryRowContext(ctx, sz.AlertID, sz.DelayMinutes)
	err = row.Scan(&sz.ID)
	if err != nil {
		return nil, err
	}

	return sz, nil
}

func (db *DB) DeleteByAlertIds(ctx context.Context, ids []int) error {
	return db.DeleteByAlertIdsTx(ctx, ids)
}

func (db *DB) DeleteByAlertIdsTx(ctx context.Context, ids []int) error {
	err := permission.LimitCheckAny(ctx, permission.Admin, permission.User)
	if err != nil {
		log.Log(ctx, err)
		return err
	}
	tx, err := db.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	_, err = tx.StmtContext(ctx, db.deleteByAlertIds).QueryContext(ctx, pq.Array(ids))
	if err != nil {
		log.Log(ctx, err)
		return err
	}

	return tx.Commit()
}

func (db *DB) DeleteByServiceId(ctx context.Context, serviceId string) error {
	return db.DeleteByServiceIdTx(ctx, serviceId)
}

func (db *DB) DeleteByServiceIdTx(ctx context.Context, serviceId string) error {
	err := permission.LimitCheckAny(ctx, permission.Admin, permission.User)
	if err != nil {
		log.Log(ctx, err)
		return err
	}

	//_, err = wrapTx(ctx, tx, db.deleteByServiceId).ExecContext(ctx, serviceId)
	//if err != nil {
	//	log.Log(ctx, err)
	//}

	tx, err := db.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	_, err = tx.StmtContext(ctx, db.deleteByServiceId).QueryContext(ctx, serviceId)
	if err != nil {
		log.Log(ctx, err)
		return err
	}

	return tx.Commit()
	//return err
}

func wrapTx(ctx context.Context, tx *sql.Tx, stmt *sql.Stmt) *sql.Stmt {
	if tx == nil {
		return stmt
	}

	return tx.StmtContext(ctx, stmt)
}
