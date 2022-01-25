package alertsnooze

import "time"

type AlertSnooze struct {
	ID           int        `json:"id"`
	AlertID      int        `json:"alert_id"`
	ServiceID    string     `json:"service_id"`
	LastAckTime  *time.Time `json:"last_ack_time"`
	DelayMinutes int        `json:"delay_minutes"`
}
