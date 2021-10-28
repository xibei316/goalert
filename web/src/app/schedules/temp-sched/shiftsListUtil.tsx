import React from 'react'

import { Tooltip, Chip } from '@material-ui/core'
import _ from 'lodash'
import { DateTime, Interval } from 'luxon'

import {
  FlatListItem,
  FlatListListItem,
  FlatListNotice,
  FlatListSub,
} from '../../lists/FlatList'
import { UserAvatar } from '../../util/avatars'
import { ExplicitZone, splitAtMidnight } from '../../util/luxon-helpers'
import { parseInterval } from '../../util/shifts'
import { Shift } from './sharedUtils'
import Delete from '@material-ui/icons/Delete'
import Error from '@material-ui/icons/Error'
import Tooltip from '@material-ui/core/Tooltip/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import { ShiftOptions } from './hooks'

export const fmtTime = (dt: DateTime): string =>
  dt.toLocaleString(DateTime.TIME_SIMPLE)

export type Sortable<T> = T & {
  // at is the earliest point in time for a list item
  at: DateTime
  // itemType categorizes a list item
  itemType: 'subheader' | 'gap' | 'shift' | 'start' | 'end' | 'outOfBounds'
}

export function getSubheaderItems(
  schedInterval: Interval,
  shifts: Shift[],
  zone: ExplicitZone,
): Sortable<FlatListSub>[] {
  if (!schedInterval.isValid) {
    return []
  }

  // get earliest and farthest out start/end times
  const lowerBound = DateTime.min(
    schedInterval.start,
    ...shifts.map((s) => DateTime.fromISO(s.start, { zone })),
  )

  const upperBound = DateTime.max(
    schedInterval.end,
    ...shifts.map((s) => DateTime.fromISO(s.end, { zone })),
  )

  const dayInvs = splitAtMidnight(
    Interval.fromDateTimes(lowerBound, upperBound),
  )

  return dayInvs.map((day) => {
    const at = day.start.startOf('day')
    return {
      id: 'header_' + at.toISO(),
      subHeader: day.start.toFormat('cccc, LLLL d'),
      at,
      itemType: 'subheader',
    }
  })
}

export function getOutOfBoundsItems(
  schedInterval: Interval,
  shifts: Shift[],
  zone: ExplicitZone,
): Sortable<FlatListNotice>[] {
  if (!schedInterval.isValid) {
    return []
  }

  // get earliest and farthest out start/end times
  const lowerBound = DateTime.min(
    schedInterval.start,
    ...shifts.map((s) => DateTime.fromISO(s.start, { zone })),
  )

  const upperBound = DateTime.max(
    schedInterval.end,
    ...shifts.map((s) => DateTime.fromISO(s.end, { zone })),
  )

  const beforeStart = Interval.fromDateTimes(
    lowerBound,
    schedInterval.start,
  ).mapEndpoints((e) => e.startOf('day')) // ensure sched start date is not included

  const afterEnd = Interval.fromDateTimes(
    schedInterval.end,
    upperBound,
  ).mapEndpoints((e) => e.plus({ day: 1 }).startOf('day')) // ensure sched end date is not included

  const daysBeforeStart = splitAtMidnight(beforeStart)
  const daysAfterEnd = splitAtMidnight(afterEnd)
  const intervals = daysBeforeStart.concat(daysAfterEnd)

  let details = ''
  return intervals.map((interval) => {
    if (interval.end <= schedInterval.start) {
      details = 'This day is before the set start date.'
    } else if (interval.start >= schedInterval.end) {
      details = 'This day is after the set end date.'
    }

    return {
      id: 'day-out-of-bounds_' + interval.start.toISO(),
      type: 'INFO',
      message: '',
      details,
      at: interval.start.startOf('day'),
      itemType: 'outOfBounds',
    }
  })
}

export function getCoverageGapItems(
  schedInterval: Interval,
  shifts: Shift[],
  zone: ExplicitZone,
  handleCoverageClick: (coverageGap: Interval) => void,
): Sortable<FlatListNotice>[] {
  if (!schedInterval.isValid) {
    return []
  }
  const shiftIntervals = shifts.map((s) => parseInterval(s, zone))
  const gapIntervals = _.flatMap(
    schedInterval.difference(...shiftIntervals),
    (inv) => splitAtMidnight(inv),
  )
  return gapIntervals.map((gap) => {
    let details = 'No coverage'
    if (gap.length('hours') === 24) {
      // nothing to do
    } else if (gap.start.equals(gap.start.startOf('day'))) {
      details += ` until ${fmtTime(gap.end)}`
    } else if (gap.end.equals(gap.start.plus({ day: 1 }).startOf('day'))) {
      details += ` after ${fmtTime(gap.start)}`
    } else {
      details += ` from ${fmtTime(gap.start)} to ${fmtTime(gap.end)}`
    }

    return {
      'data-cy': 'day-no-coverage',
      id: 'day-no-coverage_' + gap.start.toISO(),
      type: 'WARNING',
      message: '',
      details,
      at: gap.start,
      ends: gap.end,
      itemType: 'gap',
      disabled: gap.end < DateTime.now().setZone(zone),
      handleOnClick: () => {
        handleCoverageClick(gap)
      },
    }
  })
}

export function getShiftItems(
  shifts: Shift[],
  options: ShiftOptions,
): Sortable<FlatListItem>[] {
  return _.flatMap(shifts, (s) => {
    const shiftInv = parseInterval(s, options.zone)
    const isValid = options.schedInterval.engulfs(shiftInv)
    const dayInvs = splitAtMidnight(shiftInv)

    return dayInvs.map((inv, index) => {
      const startTime = fmtTime(inv.start)
      const endTime = fmtTime(inv.end)
      const isHistoricShift =
        DateTime.fromISO(s.end, { zone: options.zone }) < options.now

      let subText = ''
      if (inv.length('hours') === 24) {
        // shift spans all day
        subText = 'All day'
      } else if (inv.engulfs(shiftInv)) {
        // shift is inside the day
        subText = `From ${startTime} to ${endTime}`
      } else if (inv.end === shiftInv.end) {
        subText = `Active until ${endTime}`
      } else {
        // shift starts and continues on for the rest of the day
        subText = `Active starting at ${startTime}\n`
      }

      const item: Sortable<FlatListItem> = {
        scrollIntoView: true,
        id: s.start + s.userID + index.toString(),
        title: s.user?.name,
        subText,
        userID: s.userID,
        icon: <UserAvatar userID={s.userID} />,
        disabled: isHistoricShift,
        secondaryAction:
          index === 0 ? (
            <div className={options.classes.secondaryActionWrapper}>
              {!isValid && !isHistoricShift && (
                <Tooltip
                  title='This shift extends beyond the start and/or end of this temporary schedule'
                  placement='left'
                >
                  <Error color='error' />
                </Tooltip>
              )}
              {isHistoricShift ? (
                <Chip style={{ opacity: 0.6 }} label='Concluded' />
              ) : (
                <IconButton
                  aria-label='delete shift'
                  onClick={() => options.onRemove(s)}
                >
                  <Delete />
                </IconButton>
              )}
            </div>
          ) : null,
        at: inv.start,
        itemType: 'shift',
      }

      return item
    })
  })
}

export function getScheduleStartItem(
  shifts: Shift[],
  options: ShiftOptions,
): Sortable<FlatListItem>[] {
  let details = `Starts at ${fmtTime(
    DateTime.fromISO(options.start, { zone: options.zone }),
  )}`
  let message = ''

  if (
    options.edit &&
    DateTime.fromISO(options.start, { zone: options.zone }) < now
  ) {
    message = 'Currently active'
    details = 'Historical shifts will not be displayed'
  }

  return {
    id: 'sched-start_' + options.start,
    type: 'OK',
    icon: <ScheduleIcon />,
    message,
    details,
    at: DateTime.fromISO(options.start, { zone: options.zone }),
    itemType: 'start',
  } as Sortable<FlatListNotice>
}

export function getScheduleEndItem(
  shifts: Shift[],
  options: ShiftOptions,
): Sortable<FlatListItem> {
  let details = `Starts at ${fmtTime(
    DateTime.fromISO(options.start, { zone: options.zone }),
  )}`
  let message = ''

  if (
    options.edit &&
    DateTime.fromISO(options.start, { zone: options.zone }) < options.now
  ) {
    message = 'Currently active'
    details = 'Historical shifts will not be displayed'
  }

  const item: Sortable<FlatListNotice> = {
    id: 'sched-start_' + options.start,
    type: 'OK',
    icon: <ScheduleIcon />,
    message,
    details,
    at: DateTime.fromISO(options.start, { zone: options.zone }),
    itemType: 'start',
  }

  return item
}

export function sortItems(
  items: Sortable<FlatListListItem>[],
): Sortable<FlatListListItem>[] {
  // const dayLists: any[] = []
  // items.forEach((item) => {

  // })

  const newItems = items.sort((a, b) => {
    if (a.at.startOf('day') < b.at.startOf('day')) return -1
    if (a.at.startOf('day') > b.at.startOf('day')) return 1
    return 0
  })

  console.log('i', items, newItems)

  return newItems.sort((a, b) => {
    if (a.at < b.at) return -1
    if (a.at > b.at) return 1

    // a and b are at same time; use item type priority instead
    // subheaders first
    if (a.itemType === 'subheader') return -1
    if (b.itemType === 'subheader') return 1
    // out of bounds info next
    if (a.itemType === 'outOfBounds') return -1
    if (b.itemType === 'outOfBounds') return 1
    // then start notice
    if (a.itemType === 'start') return -1
    if (b.itemType === 'start') return 1
    // then gaps
    if (a.itemType === 'gap') return -1
    if (b.itemType === 'gap') return 1
    // then shifts
    if (
      // both shifts
      a.itemType === 'shift' &&
      b.itemType === 'shift' &&
      // typescript hints
      'title' in a &&
      'title' in b &&
      a.title &&
      b.title
    ) {
      return a.title < b.title ? -1 : 1
    }
    if (a.itemType === 'shift') return -1
    if (b.itemType === 'shift') return 1
    // then end notice
    if (a.itemType === 'end') return -1
    if (b.itemType === 'end') return 1

    // identical items; should never get to this point
    return 0
  })
}
