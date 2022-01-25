package snoozemanager

import (
	"context"

	"github.com/target/goalert/util/log"

	"github.com/pkg/errors"
)

// UpdateAll will update and cleanup all notification cycles.
func (db *DB) UpdateAll(ctx context.Context) error {
	err := db.update(ctx)
	return err
}

func (db *DB) update(ctx context.Context) error {
	log.Debugf(ctx, "Running check acknowledge alert.")

	tx, err := db.lock.BeginTx(ctx, nil)
	if err != nil {
		return errors.Wrap(err, "begin tx")
	}
	defer tx.Rollback()

	_, err = tx.StmtContext(ctx, db.updateState).ExecContext(ctx)
	if err != nil {
		return errors.Wrap(err, "update state for acknowledge alert")
	}

	_, err = tx.StmtContext(ctx, db.deleteSnoozeAlert).ExecContext(ctx)
	if err != nil {
		return errors.Wrap(err, "delete the updated alert")
	}

	_, err = tx.StmtContext(ctx, db.deleteSnoozeCloseAlert).ExecContext(ctx)
	if err != nil {
		return errors.Wrap(err, "delete the closed alert")
	}

	return tx.Commit()
}
