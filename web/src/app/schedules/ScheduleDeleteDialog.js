import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import p from 'prop-types'
import { Redirect } from 'react-router-dom'
import { get } from 'lodash'
import FormDialog from '../dialogs/FormDialog'
import Spinner from '../loading/components/Spinner'

const query = gql`
  query ($id: ID!) {
    schedule(id: $id) {
      id
      name
    }
  }
`
const mutation = gql`
  mutation delete($input: [TargetInput!]!) {
    deleteAll(input: $input)
  }
`

function usePersistentData(fn, ...deps) {
  const [value, setValue] = useState(fn())
  useEffect(() => {
    const newValue = fn()
    if (!newValue) return

    setValue(newValue)
  }, deps)

  return value
}

export default function ScheduleDeleteDialog(props) {
  const { data, loading: dataLoading } = useQuery(query, {
    onClose: p.func,
    variables: { id: props.scheduleID },
  })

  const name = usePersistentData(() => data?.schedule?.name, [data])

  const [deleteSchedule, deleteScheduleStatus] = useMutation(mutation, {
    onCompleted: props.onClose,
    variables: {
      input: [
        {
          type: 'schedule',
          id: props.scheduleID,
        },
      ],
    },
  })

  if (!data && dataLoading) return <Spinner />

  return (
    <React.Fragment>
      {deleteScheduleStatus.called && <Redirect to='/schedules' />}
      <FormDialog
        title='Are you sure?'
        confirm
        subTitle={`This will delete the schedule: ${name}`}
        caption='Deleting a schedule will also delete all associated rules and overrides.'
        loading={deleteScheduleStatus.loading}
        errors={deleteScheduleStatus.error ? [deleteScheduleStatus.error] : []}
        onClose={props.onClose}
        onSubmit={() => deleteSchedule()}
      />
    </React.Fragment>
  )
}

ScheduleDeleteDialog.propTypes = {
  scheduleID: p.string.isRequired,
  onClose: p.func,
}
