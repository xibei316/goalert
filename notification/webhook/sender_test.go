package webhook

import (
	"context"
	"reflect"
	"testing"

	"github.com/target/goalert/notification"
)

func TestSender_Send(t *testing.T) {
	type args struct {
		ctx context.Context
		msg notification.Message
	}
	tests := []struct {
		name    string
		args    args
		want    *notification.SentMessage
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &Sender{}
			got, err := s.Send(tt.args.ctx, tt.args.msg)
			if (err != nil) != tt.wantErr {
				t.Errorf("Send() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Send() got = %v, want %v", got, tt.want)
			}
		})
	}
}
