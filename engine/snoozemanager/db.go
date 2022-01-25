package snoozemanager

import (
	"context"
	"database/sql"

	"github.com/target/goalert/alert"
	"github.com/target/goalert/engine/processinglock"
	"github.com/target/goalert/util"
)

type DB struct {
	lock *processinglock.Lock

	alertStore alert.Store

	//insertAckAlert         *sql.Stmt
	updateState            *sql.Stmt
	deleteSnoozeAlert      *sql.Stmt
	deleteSnoozeCloseAlert *sql.Stmt
}

// Name returns the name of the module.
func (db *DB) Name() string { return "Engine.SnoozeAlertManager" }

// NewDB creates a new DB.
func NewDB(ctx context.Context, db *sql.DB) (*DB, error) {
	lock, err := processinglock.NewLock(ctx, db, processinglock.Config{
		Type:    processinglock.TypeHeartbeat,
		Version: 1,
	})
	if err != nil {
		return nil, err
	}

	p := &util.Prepare{Ctx: ctx, DB: db}

	return &DB{
		lock: lock,

		//  查询告警状态为 'active' 以及对应的时间，并插入或更新到 snooze 表中，
		//insertAckAlert: p.P(`
		//	with ack_alert as (
		//		select
		//			a.id as alert_id,
		//			a.service_id as service_id,
		//			max(log.timestamp) as last_ack
		//		from alerts a
		//		join escalation_policy_state state on a.id = state.alert_id
		//		left join alert_logs log on a.id = log.alert_id
		//		where a.status = 'active' and state.last_escalation < now() and state.force_escalation = false and log.event = 'acknowledged'
		//		group by a.id
		//	)
		//	insert into acked (
		//		alert_id,
		//		service_id,
		//		last_ack_time
		//	)
		//	select
		//		 alert_id,
		//		 service_id,
		//		 last_ack
		//	from ack_alert
		//	on conflict(alert_id) do update
		//	set last_ack_time = (select last_ack from ack_alert)
		//`),

		updateState: p.P(`
			with snooze_alert as (
				select
					alert_id,
					service_id,
					last_ack_time,
					delay_minutes
				from snooze_alert
			), next_delay_time as (
				select
					sa.alert_id,
					sa.last_ack_time,
					sa.delay_minutes,
					ep_step.delay
				from snooze_alert sa
				join services svc on sa.service_id = svc.id
				join escalation_policy_state ep_state on sa.alert_id = ep_state.alert_id
				join escalation_policy_steps ep_step on svc.escalation_policy_id = ep_state.escalation_policy_id
				where ep_state.escalation_policy_step_number = ep_step.step_number and ep_state.escalation_policy_step_id = ep_step.id
			), update_ep_state as(
				update escalation_policy_state ep_state
				 set 
					 next_escalation  = now() + (cast(nd.delay as text)||' minutes')::interval
				 from next_delay_time nd
				 where ep_state.alert_id  = nd.alert_id and now() - nd.last_ack_time > (cast(nd.delay_minutes as text)||' minutes')::interval
				 returning ep_state.alert_id
			) update alerts a
				set status = 'triggered'
				from snooze_alert sa, escalation_policy_state ep_state, update_ep_state up_ep_state
				where a.id = sa.alert_id and a.id = ep_state.alert_id and a.id = up_ep_state.alert_id
		`),
		deleteSnoozeAlert: p.P(`
			delete from snooze_alert sa  
			using alerts a, escalation_policy_state ep_state 
			where a.status = 'triggered' and sa.alert_id = a.id and ep_state.alert_id = sa.alert_id and ep_state.next_escalation > now() 
		`),
		deleteSnoozeCloseAlert: p.P(`
			delete from snooze_alert sa  
			using alerts a
			where sa.alert_id = a.id and a.status = 'closed'
		`),
	}, p.Err
}
