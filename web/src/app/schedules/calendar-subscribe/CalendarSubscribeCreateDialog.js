import React, { useState } from 'react'
import { useMutation, gql } from '@apollo/client'
import { PropTypes as p } from 'prop-types'
import { Alert, AlertTitle } from '@material-ui/lab'
import FormDialog from '../../dialogs/FormDialog'
import CalendarSubscribeForm from './CalendarSubscribeForm'
import { fieldErrors, nonFieldErrors } from '../../util/errutil'
import { CheckCircleOutline } from '@material-ui/icons'
import CalenderSuccessForm from './CalendarSuccessForm'

const mutation = gql`
  mutation ($input: CreateUserCalendarSubscriptionInput!) {
    createUserCalendarSubscription(input: $input) {
      id
      url
    }
  }
`

export default function CalendarSubscribeCreateDialog(props) {
  const [value, setValue] = useState({
    name: '',
    scheduleID: props.scheduleID || null,
    reminderMinutes: [],
  })

  const [createSubscription, status] = useMutation(mutation, {
    variables: {
      input: {
        scheduleID: value.scheduleID,
        name: value.name,
        reminderMinutes: [0], // default reminder at shift start time
        disabled: false,
      },
    },
  })

  const isComplete = Boolean(status?.data?.createUserCalendarSubscription?.url)
  const subTitle = isComplete ? (
    <Alert severity='success' icon={<CheckCircleOutline />}>
      <AlertTitle>Subscription was created successfully.</AlertTitle>
      You can manage subscriptions from your profile at any time.
    </Alert>
  ) : (
    'This will generate an iCalendar subscription URL to be used in your preferred calendar application.'
  )

  const form = isComplete ? (
    <CalenderSuccessForm url={status.data.createUserCalendarSubscription.url} />
  ) : (
    <CalendarSubscribeForm
      errors={fieldErrors(status.error)}
      loading={status.loading}
      onChange={setValue}
      scheduleReadOnly={Boolean(props.scheduleID)}
      value={value}
    />
  )

  return (
    <FormDialog
      title='Create New Calendar Subscription'
      subTitle={subTitle}
      onClose={props.onClose}
      alert={isComplete}
      errors={nonFieldErrors(status.error)}
      primaryActionLabel={isComplete ? 'Done' : null}
      onSubmit={() => (isComplete ? props.onClose() : createSubscription())}
      form={form}
    />
  )
}

CalendarSubscribeCreateDialog.propTypes = {
  onClose: p.func.isRequired,
  scheduleID: p.string,
}
