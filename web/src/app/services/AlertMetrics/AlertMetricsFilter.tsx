import React from 'react'
import { DateTime } from 'luxon'
import { Grid } from '@mui/material'
import { useURLParams } from '../../actions/hooks'
import { ISODatePicker } from '../../util/ISOPickers'

interface AlertMetricsFilterProps {
  // dateRange is an ordered array of length 2: [min, max]
  dateRange: DateTime[]
}

export const MAX_DAY_COUNT = 28
export const DATE_FORMAT = 'y-MM-dd'

export default function AlertMetricsFilter(
  props: AlertMetricsFilterProps,
): JSX.Element {
  const [minDate, maxDate] = props.dateRange
  const [params, setParams] = useURLParams({
    since: minDate.toFormat(DATE_FORMAT),
    until: maxDate.toFormat(DATE_FORMAT),
  })
  const since = DateTime.fromFormat(params.since, DATE_FORMAT)
  const until = DateTime.fromFormat(params.until, DATE_FORMAT)

  const setDateParam = (name: string, iso: string): void => {
    let value = DateTime.fromISO(iso)
    if (!value.isValid) return
    value = DateTime.max(value, minDate)
    value = DateTime.min(value, maxDate)

    if (name === 'since' && value <= until) {
      setParams({ since: value.toFormat(DATE_FORMAT) })
    }
    if (name === 'until' && value >= since) {
      setParams({ until: value.toFormat(DATE_FORMAT) })
    }
  }

  return (
    <Grid container justifyContent='space-around'>
      <Grid item xs={5}>
        <ISODatePicker
          label='Since'
          onChange={(v) => setDateParam('since', v as string)}
          fullWidth
          value={params.since}
          min={minDate.toISO()}
          max={until.toISO()}
          required
        />
      </Grid>
      <Grid item xs={5}>
        <ISODatePicker
          label='Until'
          onChange={(v) => setDateParam('until', v as string)}
          fullWidth
          value={params.until}
          min={since.toISO()}
          max={maxDate.toISO()}
          required
        />
      </Grid>
    </Grid>
  )
}
