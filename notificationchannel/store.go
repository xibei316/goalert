package notificationchannel

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/target/goalert/permission"
	"github.com/target/goalert/util"
	"github.com/target/goalert/util/sqlutil"
	"github.com/target/goalert/validation/validate"
)

type NamerFunc func(ctx context.Context, id string) (string, error)
type Store interface {
	FindAll(context.Context) ([]Channel, error)
	FindOne(context.Context, string) (*Channel, error)
	FindMany(context.Context, []string) ([]Channel, error)
	CreateTx(context.Context, *sql.Tx, *Channel) (*Channel, error)
	DeleteManyTx(context.Context, *sql.Tx, []string) error
	EnsureTx(ctx context.Context, tx *sql.Tx, chanType Type, value string) (id string, err error)

	SetNameLookupFunc(chanType Type, nameFn NamerFunc)
}

type DB struct {
	db *sql.DB

	nameLookup map[Type]NamerFunc

	findID     *sql.Stmt
	findAll    *sql.Stmt
	findOne    *sql.Stmt
	findMany   *sql.Stmt
	create     *sql.Stmt
	deleteMany *sql.Stmt
}

func NewDB(ctx context.Context, db *sql.DB) (*DB, error) {
	p := &util.Prepare{DB: db, Ctx: ctx}

	return &DB{
		db:         db,
		nameLookup: make(map[Type]NamerFunc),

		findAll: p.P(`
			select id, name, type, value from notification_channels
		`),
		findOne: p.P(`
			select id, name, type, value from notification_channels where id = $1
		`),
		findMany: p.P(`
			select id, name, type, value from notification_channels where id = any($1)
		`),
		findID: p.P(`select id from notification_channels where type = $1 and value = $2`),
		create: p.P(`
			insert into notification_channels (id, name, type, value)
			values ($1, $2, $3, $4)
		`),
		deleteMany: p.P(`DELETE FROM notification_channels WHERE id = any($1)`),
	}, p.Err
}
func (db *DB) SetNameLookupFunc(chanType Type, nameFn NamerFunc) {
	db.nameLookup[chanType] = nameFn
}

func (db *DB) EnsureTx(ctx context.Context, tx *sql.Tx, chanType Type, value string) (id string, err error) {
	err = permission.LimitCheckAny(ctx, permission.System, permission.User)
	if err != nil {
		return "", err
	}

	err = validate.OneOf("Type", chanType, TypeSlack)

	switch chanType {
	case TypeSlack:
		err = validate.Many(err, validate.RequiredText("Value", value, 1, 32))
	}
	if err != nil {
		return "", err
	}

	err = tx.StmtContext(ctx, db.findID).QueryRowContext(ctx, chanType, value).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	ch, err := db.CreateTx(ctx, tx, &Channel{Type: chanType, Value: value})
	if err != nil {
		return "", err
	}

	return ch.ID, nil
}

func (db *DB) CreateTx(ctx context.Context, tx *sql.Tx, c *Channel) (*Channel, error) {
	err := permission.LimitCheckAny(ctx, permission.System, permission.User)
	if err != nil {
		return nil, err
	}

	if c.Name == "" && db.nameLookup[c.Type] != nil {
		c.Name, err = db.nameLookup[c.Type](ctx, c.Value)
		if err != nil {
			return nil, fmt.Errorf("lookup name: %w", err)
		}
	}

	n, err := c.Normalize()
	if err != nil {
		return nil, err
	}

	_, err = tx.StmtContext(ctx, db.create).ExecContext(ctx, n.ID, n.Name, n.Type, n.Value)
	if err != nil {
		return nil, err
	}

	return n, nil
}

func (db *DB) DeleteManyTx(ctx context.Context, tx *sql.Tx, ids []string) error {
	err := permission.LimitCheckAny(ctx, permission.System, permission.User)
	if err != nil {
		return err
	}
	if len(ids) == 0 {
		return nil
	}

	err = validate.Range("Count", len(ids), 0, 100)
	if err != nil {
		return err
	}

	del := db.deleteMany
	if tx != nil {
		tx.StmtContext(ctx, del)
	}

	_, err = del.ExecContext(ctx, sqlutil.UUIDArray(ids))
	return err
}

func (db *DB) FindOne(ctx context.Context, id string) (*Channel, error) {
	err := permission.LimitCheckAny(ctx, permission.System, permission.User)
	if err != nil {
		return nil, err
	}

	err = validate.UUID("ChannelID", id)
	if err != nil {
		return nil, err
	}

	var c Channel
	err = db.findOne.QueryRowContext(ctx, id).Scan(&c.ID, &c.Name, &c.Type, &c.Value)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// FindMany will fetch all channels matching the given ids.
func (db *DB) FindMany(ctx context.Context, ids []string) ([]Channel, error) {
	err := validate.ManyUUID("ChannelID", ids, 50)
	if err != nil {
		return nil, err
	}

	err = permission.LimitCheckAny(ctx, permission.User)
	if err != nil {
		return nil, err
	}

	rows, err := db.findMany.QueryContext(ctx, sqlutil.UUIDArray(ids))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []Channel
	for rows.Next() {
		var c Channel
		err = rows.Scan(&c.ID, &c.Name, &c.Type, &c.Value)
		if err != nil {
			return nil, err
		}
		channels = append(channels, c)
	}

	return channels, nil
}

func (db *DB) FindAll(ctx context.Context) ([]Channel, error) {
	err := permission.LimitCheckAny(ctx, permission.System, permission.User)
	if err != nil {
		return nil, err
	}

	rows, err := db.findAll.QueryContext(ctx)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []Channel
	for rows.Next() {
		var c Channel
		err = rows.Scan(&c.ID, &c.Name, &c.Type, &c.Value)
		if err != nil {
			return nil, err
		}
		channels = append(channels, c)
	}

	return channels, nil
}
