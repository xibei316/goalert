package smoketest

import (
	"encoding/json"
	"fmt"
	"github.com/target/goalert/smoketest/harness"
	"testing"
)

// TestGraphQLCreateSchedule tests that all steps for creating a schedule (without default rotation) are carried out without any errors.
func TestGraphQLCreateSchedule(t *testing.T) {
	t.Parallel()

	const sql = `
	insert into users (id, name, email)
	values
		({{uuid "u1"}}, 'bob', 'joe'),
		({{uuid "u2"}}, 'ben', 'josh');
`
	h := harness.NewHarness(t, sql, "ids-to-uuids")
	defer h.Close()

	doQL := func(query string, res interface{}) {
		g := h.GraphQLQuery2(query)
		for _, err := range g.Errors {
			t.Error("GraphQL Error:", err.Message)
		}
		if len(g.Errors) > 0 {
			t.Fatal("errors returned from GraphQL")
		}
		t.Log("Response:", string(g.Data))
		if res == nil {
			return
		}
		err := json.Unmarshal(g.Data, &res)
		if err != nil {
			t.Fatal("failed to parse response:", err)
		}
	}

	var sched struct {
		CreateSchedule struct {
			ID      string
			Name    string
			Targets []struct {
				ScheduleID string
				Target     struct{ ID string }
			}
		}
	}

	doQL(fmt.Sprintf(`
		mutation {
  			createSchedule(input: {
      			name: "default_testing"
				description: "default testing"
      			timeZone: "America/Chicago"
      			targets: {
					newRotation: {
						name: "foobar"
						timeZone: "America/Chicago"
						start: "2019-07-25T02:22:33Z"
						type: daily
					}
					rules: {
						start: "12:00"
						end: "14:00"
						weekdayFilter: [true, true, true, true, true]
					}
      			}
    		}){
    			id
   				name
				targets {
					scheduleID
					target {
						id
					}
				}
  			}
		}
	`), &sched)

	sID := sched.CreateSchedule.ID
	t.Log("Created Schedule ID :", sID)

	if len(sched.CreateSchedule.Targets) != 1 {
		t.Errorf("got %d schedule targets; want 1", len(sched.CreateSchedule.Targets))
	}
}
