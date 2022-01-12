import {
  Grid,
  Select,
  InputLabel,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { DateTime } from 'luxon'
import React from 'react'
import { useURLParam } from '../../actions/hooks'

interface AlertMetricsFilterProps {
  now: DateTime
}

export const MAX_WEEKS_COUNT = 4
export const DATE_FORMAT = 'y-MM-dd'

export default function AlertMetricsFilter({
  now,
}: AlertMetricsFilterProps): JSX.Element {
  const [since, setSince] = useURLParam<string>('since', '')
  const [showEscalatedAlerts, setShowEscalatedAlerts] = useURLParam<boolean>(
    'showEscalatedAlerts',
    false,
  )

  const dateRangeValue = since
    ? Math.floor(
        now.diff(
          DateTime.fromFormat(since, DATE_FORMAT).minus({ day: 1 }),
          'weeks',
        ).weeks,
      )
    : MAX_WEEKS_COUNT // default

  const handleDateRangeChange = (e: SelectChangeEvent<number>): void => {
    const weeks = e.target.value as number
    setSince(
      now
        .minus({ weeks })
        .plus({ days: 1 })
        .startOf('day')
        .toFormat(DATE_FORMAT),
    )
  }

  return (
    <FormControl sx={{ width: '100%', marginLeft: '3rem' }}>
      <Grid container>
        <Grid item xs={4}>
          <InputLabel id='demo-simple-select-helper-label'>
            Date Range
          </InputLabel>
          <Select
            fullWidth
            labelId='demo-simple-select-helper-label'
            id='demo-simple-select-helper'
            value={dateRangeValue}
            label='Date Range'
            name='date-range'
            onChange={handleDateRangeChange}
          >
            <MenuItem value={1}>Past week</MenuItem>
            <MenuItem value={2}>Past 2 weeks</MenuItem>
            <MenuItem value={3}>Past 3 weeks</MenuItem>
            <MenuItem value={4}>Past 4 weeks</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={4} sx={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showEscalatedAlerts}
                onChange={(e) => setShowEscalatedAlerts(e.target.checked)}
                value='showEscalatedAlerts'
              />
            }
            label='Show escalated alerts'
          />
        </Grid>
      </Grid>
    </FormControl>
  )
}
