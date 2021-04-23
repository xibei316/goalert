import React from 'react'
import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import { FormContainer, FormField } from '../../forms'
import NumberField from '../util/NumberField'
import {
  Select,
  Table,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
  IconButton,
  MenuItem,
} from '@material-ui/core'
import { ISOTimePicker } from '../../util/ISOPickers'
import { SlackChannelSelect } from '../../selection'
import { Add } from '../../icons'

export interface Value {
  onCallNotifications: {
    weekday: number
    time: string
    channel: string
  }[]
}
interface OnCallNotificationsFormProps {
  value: Value

  errors: {
    field: 'name' | 'timeoutMinutes'
    message: string
  }[]

  onChange: (val: Value) => void
}

export default function OnCallNotificationsForm(
  props: OnCallNotificationsFormProps,
): JSX.Element {
  const { ...formProps } = props
  return (
    <FormContainer {...formProps} optionalLabels>
      <Table data-cy='target-rules'>
        <TableHead>
          <TableRow>
            <TableCell>Weekday</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Channel</TableCell>
            <TableCell padding='none'>
              <IconButton
                aria-label='Add rule'
                onClick={() =>
                  props.onChange({
                    ...props.value,
                    onCallNotifications: [
                      ...props.value.onCallNotifications,
                      {
                        weekday: 0,
                        time: '00:00',
                        channel: '',
                      },
                    ],
                  })
                }
              >
                <Add />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.value.onCallNotifications.map((val, idx) => (
            <TableRow>
              <TableCell>
                <FormField
                  fullWidth
                  component={Select}
                  name={`onCallNotifications[${idx}].weekday`}
                  required
                >
                  <MenuItem value={0}>Sun</MenuItem>
                  <MenuItem value={1}>Mon</MenuItem>
                  <MenuItem value={2}>Tue</MenuItem>
                  <MenuItem value={3}>Wed</MenuItem>
                  <MenuItem value={4}>Thu</MenuItem>
                  <MenuItem value={5}>Fri</MenuItem>
                  <MenuItem value={6}>Sat</MenuItem>
                </FormField>
              </TableCell>
              <TableCell>
                <FormField
                  fullWidth
                  component={ISOTimePicker}
                  required
                  name={`onCallNotifications[${idx}].time`}
                  label=''
                />
              </TableCell>
              <TableCell>
                <FormField
                  component={SlackChannelSelect}
                  required
                  fullWidth
                  label=''
                  name={`onCallNotifications[${idx}].channel`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </FormContainer>
  )
}
