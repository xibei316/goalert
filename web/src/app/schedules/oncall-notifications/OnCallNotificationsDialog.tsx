import React, { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'

import { fieldErrors, nonFieldErrors } from '../../util/errutil'
import FormDialog from '../../dialogs/FormDialog'
import _ from 'lodash'
import OnCallNotificationsForm, { Value } from './OnCallNotificationsForm'
import { OnCallNotification, TargetType } from '../../../schema'

const query = gql`
  query($id: ID!) {
    schedule(id: $id) {
      id
      name
      onCallNotifications {
        weekday
        time
        target {
          type
          id
        }
      }
    }
  }
`
const mutation = gql`
  mutation($input: SetScheduleOnCallNotificationsInput!) {
    setScheduleOnCallNotifications(input: $input)
  }
`

export default function OnCallNotificationsDialog({ scheduleID, onClose }) {
  const [value, setValue] = useState(null as Value)
  const { data, ...dataStatus } = useQuery(query, {
    variables: { id: scheduleID },
  })

  let notifications: OnCallNotification[] = _.get(
    data,
    'schedule.onCallNotifications',
    [],
  ).map((n: OnCallNotification) => ({
    ..._.omit(n, '__typename'),
    target: _.omit(n?.target, '__typename'),
  }))
  console.log(notifications)
  const nonSlackNotifications = notifications.filter(
    (n) => n.target.type != 'slackChannel' && n.target.type != 'unspecified',
  )
  const slackNotifications = notifications.filter(
    (n) => n.target.type === 'slackChannel',
  )

  let onCallNotifications = notifications
  if (value) {
    onCallNotifications = [
      ...nonSlackNotifications,
      ...value.onCallNotifications.map((v) => ({
        weekday: v.weekday,
        time: v.time,
        target: { type: 'slackChannel' as TargetType, id: v.channel },
      })),
    ]
  }

  const [save, saveStatus] = useMutation(mutation, {
    variables: {
      input: {
        onCallNotifications,
        scheduleID,
      },
    },
    onCompleted: onClose,
  })

  const defaults = {
    onCallNotifications: slackNotifications.map((n) => ({
      weekday: n.weekday,
      time: n.time,
      channel: n.target.id,
    })),
  }

  const fieldErrs = fieldErrors(saveStatus.error)

  return (
    <FormDialog
      title='Manage On-Call Notifications'
      loading={saveStatus.loading || (!data && dataStatus.loading)}
      errors={nonFieldErrors(saveStatus.error).concat(
        nonFieldErrors(dataStatus.error),
      )}
      onClose={onClose}
      onSubmit={() => save()}
      form={
        <OnCallNotificationsForm
          errors={fieldErrs}
          disabled={Boolean(
            saveStatus.loading ||
              (!data && dataStatus.loading) ||
              dataStatus.error,
          )}
          value={value || defaults}
          onChange={(value) => setValue(value)}
        />
      }
    />
  )
}
