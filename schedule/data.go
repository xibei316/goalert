package schedule

import (
	"time"

	"github.com/target/goalert/util/timeutil"
)

// Data contains configuration for a single schedule.
type Data struct {
	V1 struct {
		TemporarySchedules []TemporarySchedule

		OnCallNotifications []OnCallNotification
	}
}

// An OnCallNotification is used to send a notification of currently active on-call users.
type OnCallNotification struct {
	ChannelID string
	Weekday   time.Weekday
	Time      timeutil.Clock
}

// TempOnCall will calculate any on-call users for the given time. isActive will
// be true if a temporary schedule is active.
func (data *Data) TempOnCall(t time.Time) (isActive bool, users []string) {
	if data == nil {
		return false, nil
	}

	for _, temp := range data.V1.TemporarySchedules {
		if t.Before(temp.Start) || !t.Before(temp.End) {
			continue
		}
		isActive = true
		for _, shift := range temp.Shifts {
			if t.Before(shift.Start) || !t.Before(shift.End) {
				continue
			}
			users = append(users, shift.UserID)
		}

		// only one TemporarySchedule will ever be active (should be merged & sorted)
		break
	}

	return isActive, users
}
