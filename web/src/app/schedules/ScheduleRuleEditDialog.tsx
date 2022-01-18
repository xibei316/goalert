import React, { useState } from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import _ from 'lodash'
import FormDialog from '../dialogs/FormDialog'
import ScheduleRuleForm from './ScheduleRuleForm'
import { fieldErrors, nonFieldErrors } from '../util/errutil'
import { gqlClockTimeToISO, isoToGQLClockTime } from './util'
import { ClockTime, ScheduleTarget, WeekdayFilter } from '../../schema'

const query = gql`
  query ($id: ID!, $tgt: TargetInput!) {
    schedule(id: $id) {
      id
      timeZone
      target(input: $tgt) {
        rules {
          id
          start
          end
          weekdayFilter
        }
      }
    }
  }
`

const mutation = gql`
  mutation ($input: ScheduleTargetInput!) {
    updateScheduleTarget(input: $input)
  }
`

interface Value {
  targetID: string
  rules: { start: ClockTime; end: ClockTime; weekdayFilter: WeekdayFilter }[]
}

interface ScheduleRuleEditDialogProps {
  scheduleID: string
  target: {
    id: string
    type: 'rotation' | 'user'
  }
  onClose: () => void
}

export default function ScheduleRuleEditDialog(
  props: ScheduleRuleEditDialogProps,
): JSX.Element {
  const [value, setValue] = useState<Value | null>(null)

  const q = useQuery(query, {
    variables: {
      id: props.scheduleID,
      tgt: props.target,
    },
    fetchPolicy: 'network-only',
    pollInterval: 0,
  })

  const data: ScheduleTarget | undefined = q.data?.schedule?.target
  const zone: string = q.data?.schedule?.timeZone || ''

  const [commit, m] = useMutation(mutation, {
    variables: {
      input: {
        target: props.target,
        scheduleID: props.scheduleID,

        rules:
          value?.rules?.map((r) => ({
            ...r,
            start: isoToGQLClockTime(r.start, zone),
            end: isoToGQLClockTime(r.end, zone),
          })) ?? [],
      },
    },
    onCompleted: props.onClose,
  })

  const defaults: Value = {
    targetID: props.target.id,
    rules:
      data?.rules?.map((r) => ({
        id: r.id,
        weekdayFilter: r.weekdayFilter,
        start: gqlClockTimeToISO(r.start, zone),
        end: gqlClockTimeToISO(r.end, zone),
      })) ?? [],
  }

  return (
    <FormDialog
      loading={m.loading}
      onClose={props.onClose}
      title={`Edit Rules for ${_.startCase(props.target.type)}`}
      errors={nonFieldErrors(m.error).concat(nonFieldErrors(q.error))}
      maxWidth='md'
      onSubmit={() => {
        if (!value) {
          // no changes
          props.onClose()
          return
        }
        commit()
      }}
      form={
        <ScheduleRuleForm
          targetType={props.target.type}
          targetDisabled
          scheduleID={props.scheduleID}
          disabled={q.loading || m.loading}
          errors={fieldErrors(m.error).concat(fieldErrors(q.error))}
          value={value || defaults}
          onChange={(v: Value) => setValue(v)}
        />
      }
    />
  )
}
