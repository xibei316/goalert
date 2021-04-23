package notification

// OnCall represents a notification of currently on-call users.
type OnCall struct {
	CallbackID string
	Dest       Dest

	ScheduleName string
	ScheduleID   string
	Users        []OnCallUser
}

func (oc OnCall) ID() string        { return oc.CallbackID }
func (oc OnCall) Type() MessageType { return MessageTypeOnCall }
func (oc OnCall) Destination() Dest { return oc.Dest }

// OnCallUser contains information on a currently on-call user.
type OnCallUser struct {
	ID   string
	Name string
}
