import React, { ChangeEvent, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Grid from '@material-ui/core/Grid'
import RadioGroup from '@material-ui/core/RadioGroup'
import Radio from '@material-ui/core/Radio'
import { makeStyles } from '@material-ui/core/styles'
import _ from 'lodash'

import { query, setMutation } from './ScheduleOnCallNotificationsList'
import { Rule } from './ScheduleOnCallNotificationAction'
import FormDialog from '../../dialogs/FormDialog'
import { nonFieldErrors, fieldErrors, FieldError } from '../../util/errutil'
import { FormContainer, FormField } from '../../forms'
import { SlackChannelSelect } from '../../selection'
import { ISOTimePicker } from '../../util/ISOPickers'
import Spinner from '../../loading/components/Spinner'
import { GenericError } from '../../error-pages'
import { SelectOption } from '../../selection/MaterialSelect'
import { OnCallNotificationRuleInput, WeekdayFilter } from '../../../schema'
import { isoToGQLClockTime, days } from '../util'
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@material-ui/core'
import { DateTime } from 'luxon'

interface ScheduleOnCallNotificationFormProps {
  scheduleID: string
  onClose: () => void

  // if set, the form will default with these values
  rule?: Rule
}

enum RuleType {
  OnChange = 'ON_CHANGE',
  OnSchedule = 'ON_SCHEDULE',
}

type Value = {
  slackChannelID: string
  time: string
  weekdayFilter: WeekdayFilter
  ruleType: RuleType
}

const useStyles = makeStyles({
  timeFields: {
    display: 'flex',
  },
  timeField: {
    paddingLeft: '2.5rem',
    paddingRight: 8,
    width: 'fit-content',
  },
})

// getSelectedDays takes WeekdayFilter and returns the included truthy days
// as their given day-index in a week
// e.g. [false, true, true, false, false, true, false]
// -> [{ label: 'Monday', value: '1' }, { label: 'Wednesday', value: '3' }]
export function getSelectedDays(
  weekdayFilter?: WeekdayFilter,
): Array<SelectOption> {
  if (!weekdayFilter) {
    return []
  }
  return weekdayFilter
    .map((dayVal, idx) => ({
      label: days[idx],
      value: dayVal ? idx.toString() : '-1',
    }))
    .filter((dayVal) => dayVal.value !== '-1')
}

export function mapDataToInput(
  rules: Array<Rule> = [],
): Array<OnCallNotificationRuleInput> {
  return rules.map((nr: Rule) => {
    const n = _.pick(nr, 'id', 'target', 'time', 'weekdayFilter')
    n.target = _.pick(n.target, 'id', 'type')
    return n
  }) as Array<OnCallNotificationRuleInput>
}

export default function ScheduleOnCallNotificationFormDialog(
  p: ScheduleOnCallNotificationFormProps,
): JSX.Element {
  const classes = useStyles()
  const [value, setValue] = useState<Value>({
    slackChannelID: '',
    time: DateTime.local().set({ minute: 0, hour: 9 }).toISO(),
    weekdayFilter: new Array(7).fill(true) as WeekdayFilter,
    ruleType: RuleType.OnChange,
  })
  // console.log(value)

  const { loading, error, data } = useQuery(query, {
    variables: {
      id: p.scheduleID,
    },
    nextFetchPolicy: 'cache-first',
  })

  function makeRules(): OnCallNotificationRuleInput[] {
    const existingRules = mapDataToInput(
      data?.schedule?.onCallNotificationRules,
    )

    let newRule: OnCallNotificationRuleInput
    switch (value.ruleType) {
      case RuleType.OnChange:
        newRule = {
          target: {
            id: value.slackChannelID,
            type: 'slackChannel',
          },
          time: isoToGQLClockTime(value.time),
        }
        break

      case RuleType.OnSchedule:
        newRule = {
          target: {
            id: value.slackChannelID,
            type: 'slackChannel',
          },
          time: isoToGQLClockTime(value.time),
          weekdayFilter: value.weekdayFilter,
        }
        break
      default:
        throw new Error('Unknown rule type')
    }

    // // handle editing vs creating
    // const newRules = rules
    // if (p.rule) {
    //   const idx = _.findIndex(rules, ['id', p.rule.id])
    //   newRules[idx] = {
    //     ...rules[idx],
    //     ...newRule,
    //   }
    // } else {
    //   newRules.push(newRule)
    // }

    return existingRules.concat(newRule)
  }

  const [mutate, mutationStatus] = useMutation(setMutation, {
    variables: {
      input: {
        scheduleID: p.scheduleID,
        rules: makeRules(),
      },
    },
    onCompleted: () => p.onClose(),
  })

  if (loading && !data?.schedule) return <Spinner />
  if (error) return <GenericError error={error.message} />

  function handleRadioOnChange(event: ChangeEvent<HTMLInputElement>): void {
    setValue({ ...value, ruleType: event.target.value as RuleType })
  }

  function handleOnChange(value: Value): void {
    setValue(value)
  }

  console.log(mutationStatus.error)

  const formErrors = fieldErrors(mutationStatus.error).concat(
    nonFieldErrors(mutationStatus.error) as FieldError[], // NOTE:
  )

  return (
    <FormDialog
      title={(p.rule ? 'Edit ' : 'Create ') + 'Notification Rule'}
      errors={formErrors}
      onClose={() => p.onClose()}
      onSubmit={() => mutate()}
      form={
        <FormContainer
          value={value}
          onChange={(value: Value) => handleOnChange(value)}
          errors={formErrors}
        >
          <Grid container spacing={2} direction='column'>
            <Grid item>
              <FormField
                component={SlackChannelSelect}
                fullWidth
                label='Select Channel'
                name='slack-channel-id'
                fieldName='slackChannelID'
                required
              />
            </Grid>
            <Grid item>
              <RadioGroup onChange={handleRadioOnChange} value={value.ruleType}>
                <FormControlLabel
                  data-cy='notify-on-change'
                  label='Notify when on-call hands off to a new user'
                  value={RuleType.OnChange}
                  control={<Radio />}
                />
                <FormControlLabel
                  data-cy='notify-at-time'
                  label='Notify at a specific day and time every week'
                  value={RuleType.OnSchedule}
                  control={<Radio />}
                />
              </RadioGroup>
            </Grid>
            <Grid className={classes.timeFields} item>
              <Table padding='none'>
                <TableBody>
                  <TableRow>
                    <TableCell rowSpan={2} padding='none'>
                      <FormField
                        component={ISOTimePicker}
                        fullWidth
                        label='Time'
                        name='time'
                        disabled={value.ruleType !== RuleType.OnSchedule}
                      />
                    </TableCell>
                    {days.map((day, dayIdx) => (
                      <TableCell key={dayIdx} variant='head' align='center'>
                        {day.slice(0, 3)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    {days.map((day, i) => (
                      <TableCell key={i} padding='checkbox'>
                        <FormField
                          noError
                          component={Checkbox}
                          checkbox
                          value={value.weekdayFilter[i]}
                          name={`weekday-filter[${i}]`}
                          fieldName={`weekdayFilter[${i}]`}
                          disabled={value.ruleType !== RuleType.OnSchedule}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        </FormContainer>
      }
    />
  )
}
