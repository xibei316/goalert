package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	alertlog "github.com/target/goalert/alert/log"

	"github.com/target/goalert/util/log"

	"github.com/target/goalert/config"
	"github.com/target/goalert/notification"
)

const (
	test         = "Test"
	verification = "Verification"
	alert        = "Alert"
	alertBundle  = "AlertBundle"
	alertStatus  = "AlertStatus"
)

type Sender struct{}

// POSTDataAlert represents fields in outgoing alert notification.
type POSTDataAlert struct {
	Type    string
	AlertID int
	Summary string
	Details string
	UserID  string
}

// POSTDataAlertBundle represents fields in outgoing alert bundle notification.
type POSTDataAlertBundle struct {
	Type        string
	ServiceID   string
	ServiceName string
	Count       int
	UserID      string
}

// POSTDataAlertStatus represents fields in outgoing alert status notification.
type POSTDataAlertStatus struct {
	Type     string
	AlertID  int
	Summary  string
	Details  string
	LogEntry string
	Event    string
	Time     time.Time
	UserID   string
}

// POSTDataAlertStatusBundle represents fields in outgoing alert status bundle notification.
type POSTDataAlertStatusBundle struct {
	Type     string
	AlertID  int
	LogEntry string
	Count    int
	UserID   string
}

// POSTDataVerification represents fields in outgoing verification notification.
type POSTDataVerification struct {
	Type   string
	Code   string
	UserID string
}

// POSTDataTest represents fields in outgoing test notification.
type POSTDataTest struct {
	Type   string
	UserID string
}

func NewSender(ctx context.Context) *Sender {
	return &Sender{}
}

// Send will send an alert for the provided message type
func (s *Sender) Send(ctx context.Context, msg notification.Message) (*notification.SentMessage, error) {
	var (
		payload   interface{}
		userid    string
		alertType string
		find      bool
	)

	//log.Logf(ctx, "start to send")
	fieldMap := log.ContextFields(ctx)
	for k, v := range fieldMap {
		if k == "AuthUserID" {
			userid, find = v.(string)
			if !find {
				log.Log(ctx, fmt.Errorf("not found userId, value %v", v))
				return nil, fmt.Errorf("not found user-id")
			}
		}
	}

	switch m := msg.(type) {
	case notification.Test:
		alertType = test
		payload = POSTDataTest{
			Type:   alertType,
			UserID: userid,
		}
	case notification.Verification:
		alertType = verification
		payload = POSTDataVerification{
			Type:   alertType,
			Code:   strconv.Itoa(m.Code),
			UserID: userid,
		}
	case notification.Alert:
		alertType = alert
		payload = POSTDataAlert{
			Type:    alertType,
			Details: m.Details,
			AlertID: m.AlertID,
			Summary: m.Summary,
			UserID:  userid,
		}
	case notification.AlertBundle:
		alertType = alertBundle
		payload = POSTDataAlertBundle{
			Type:        alertType,
			ServiceID:   m.ServiceID,
			ServiceName: m.ServiceName,
			Count:       m.Count,
			UserID:      userid,
		}
	case notification.AlertStatus:

		// ack state not send
		if m.Event != string(alertlog.TypeClosed) {
			return &notification.SentMessage{State: notification.StateSent}, nil
		}

		alertType = alertStatus
		payload = POSTDataAlertStatus{
			Type:     alertType,
			AlertID:  m.AlertID,
			Details:  m.Details,
			Summary:  m.Summary,
			LogEntry: m.LogEntry,
			Event:    m.Event,
			Time:     m.Time,
			UserID:   userid,
		}
	default:
		return nil, fmt.Errorf("message type '%s' not supported", m.Type().String())
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, time.Second*3)
	defer cancel()

	cfg := config.FromContext(ctx)
	if !cfg.ValidWebhookURL(msg.Destination().Value) {
		// fail permanently if the URL is not currently valid/allowed
		return &notification.SentMessage{
			State:        notification.StateFailedPerm,
			StateDetails: "invalid or not allowed URL",
		}, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, msg.Destination().Value, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	// appending to existing query args
	q := req.URL.Query()
	q.Add("type", alertType)

	// assign encoded query string to http request
	req.URL.RawQuery = q.Encode()

	req.Header.Add("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	byt, _ := io.ReadAll(resp.Body)
	//log.Logf(ctx, "resp", string(byt))
	//log.Logf(ctx, "dest : %s", msg.Destination().Value)
	if resp.StatusCode == http.StatusInternalServerError {
		return nil, fmt.Errorf("send failed, %s", string(byt))
	}

	return &notification.SentMessage{State: notification.StateSent}, nil
}
