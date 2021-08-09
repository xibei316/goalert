import React from 'react'
import Typography from '@material-ui/core/Typography'
import makeStyles from '@material-ui/core/styles/makeStyles'
import ScheduleIcon from '@material-ui/icons/Schedule'

import { Shift } from './sharedUtils'
import FlatList, { FlatListListItem } from '../../lists/FlatList'
import { useUserInfo } from '../../util/useUserInfo'
import { DateTime } from 'luxon'
import { useURLParam } from '../../actions'
import { parseInterval } from '../../util/shifts'
import {
  getGapItems,
  getSubheaderItems,
  getShiftItems,
  mergeItems,
  SortableFlatListListItem,
} from './listHelpers'

const useStyles = makeStyles({
  shiftsContainer: {
    paddingRight: '0.5rem',
  },
})

type TempSchedShiftsListProps = {
  value: Shift[]
  onRemove: (shift: Shift) => void

  start: string
  end: string

  edit?: boolean
}

export default function TempSchedShiftsList({
  edit,
  start,
  end,
  value,
  onRemove,
}: TempSchedShiftsListProps): JSX.Element {
  const classes = useStyles()
  const shifts = useUserInfo(value)

  const [zone] = useURLParam('tz', 'local')
  const schedInterval = parseInterval({ start, end })

  function items(): FlatListListItem[] {
    // render helpful message if interval is invalid
    // shouldn't ever be seen because of our validation checks, but just in case
    if (!schedInterval.isValid) {
      return [
        {
          id: 'invalid',
          type: 'ERROR',
          message: 'Invalid Start/End',
          transition: true,
          details:
            'Oops! There was a problem with the interval selected in step 1. Please try again.',
        },
      ]
    }

    const shiftItems = getShiftItems(shifts, schedInterval, onRemove)
    const gapItems = getGapItems(shifts, schedInterval)
    const subheaderItems = getSubheaderItems(shifts, schedInterval)

    const startItem = ((): SortableFlatListListItem => {
      let details = `Starts at ${DateTime.fromISO(start).toFormat('h:mm a')}`
      let message = ''

      if (edit && DateTime.fromISO(start) < DateTime.now()) {
        message = 'Currently active'
        details = 'Historical shifts will not be displayed'
      }

      return {
        id: 'day-start_' + start,
        type: 'OK',
        icon: <ScheduleIcon />,
        message,
        details,
        at: start,
        itemType: 'start-notice',
      }
    })()

    const endItem: SortableFlatListListItem = {
      id: 'ends-at_' + end,
      type: 'OK',
      icon: <ScheduleIcon />,
      message: '',
      details: `Ends at ${DateTime.fromISO(end)
        .setZone(zone)
        .toFormat('h:mm a')}`,
      at: end,
      itemType: 'end-notice',
    }

    return mergeItems([
      ...shiftItems,
      ...gapItems,
      ...subheaderItems,
      startItem,
      endItem,
    ])
  }

  return (
    <div className={classes.shiftsContainer}>
      <Typography variant='subtitle1' component='h3'>
        Shifts
      </Typography>
      <FlatList
        data-cy='shifts-list'
        items={items()}
        emptyMessage='Add a user to the left to get started.'
        dense
        transition
      />
    </div>
  )
}
