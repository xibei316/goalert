import React from 'react'
import { IconButton, Tooltip } from '@material-ui/core'
import _ from 'lodash'
import { Interval, DateTime } from 'luxon'
import { FlatListListItem } from '../../lists/FlatList'
import { UserAvatar } from '../../util/avatars'
import { splitAtMidnight } from '../../util/luxon-helpers'
import { parseInterval } from '../../util/shifts'
import { relativeDate } from '../../util/timeFormat'
import { Shift } from './sharedUtils'
import Error from '@material-ui/icons/Error'
import Delete from '@material-ui/icons/Delete'

export type SortableFlatListListItem = FlatListListItem & {
  // at is a timestamp in ISO format
  at: string
  // itemType categorizes list items
  itemType: 'subheader' | 'gap' | 'shift' | 'start-notice' | 'end-notice'
}

export function getSubheaderItems(
  shifts: Shift[],
  schedInterval: Interval,
): SortableFlatListListItem[] {
  const lowerBound = shifts.length
    ? DateTime.min(
        schedInterval.start,
        DateTime.fromISO(_.sortBy(shifts, 'start')[0].start),
      )
    : schedInterval.start

  const upperBound = shifts.reduce((result, candidate) => {
    const end = DateTime.fromISO(candidate.end)
    return end > result ? end : result
  }, schedInterval.end)

  const dayInvs = splitAtMidnight(
    Interval.fromDateTimes(lowerBound, upperBound),
  )

  return dayInvs.map((day) => {
    const at = day.start.toISO()
    return {
      id: 'header_' + at,
      subHeader: relativeDate(at),
      at,
      itemType: 'subheader',
    }
  })
}

export function getGapItems(
  shifts: Shift[],
  schedInterval: Interval,
): SortableFlatListListItem[] {
  const shiftIntervals = shifts.map((s) => parseInterval(s))
  const gapIntervals = _.flatMap(
    schedInterval.difference(...shiftIntervals),
    (inv) => splitAtMidnight(inv),
  )
  return gapIntervals.map((g) => ({
    id: 'day-no-coverage_' + g.start.toISO(),
    type: 'WARNING',
    message: '',
    details: 'No coverage',
    at: g.start.toISO(),
    itemType: 'gap',
  }))
}

export function getShiftItems(
  shifts: Shift[],
  schedInterval: Interval,
  onRemove: (s: Shift) => void,
): SortableFlatListListItem[] {
  return _.flatMap(_.sortBy(shifts, 'start'), (s) => {
    const isValid = schedInterval.engulfs(parseInterval(s))
    const shiftIntervals = splitAtMidnight(parseInterval(s))

    return shiftIntervals.map((inv, index) => {
      const startTime = inv.start.toLocaleString({
        hour: 'numeric',
        minute: 'numeric',
      })
      const endTime = inv.end.toLocaleString({
        hour: 'numeric',
        minute: 'numeric',
      })

      let subText = ''
      if (inv.length('day') === 1) {
        subText = 'All day'
      } else if (inv.start.day === inv.end.day) {
        subText = `From ${startTime} to ${endTime}`
      } else if (inv.start === inv.start.startOf('day')) {
        subText = `Active until ${endTime}`
      } else {
        subText = `Active starting at ${startTime}`
      }

      return {
        scrollIntoView: true,
        id: s.start + s.userID,
        title: s.user?.name,
        subText,
        userID: s.userID,
        icon: <UserAvatar userID={s.userID} />,
        secondaryAction:
          index === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {!isValid && (
                <Tooltip
                  title='This shift extends beyond the start and/or end of this temporary schedule'
                  placement='left'
                >
                  <Error color='error' />
                </Tooltip>
              )}
              <IconButton aria-label='delete shift' onClick={() => onRemove(s)}>
                <Delete />
              </IconButton>
            </div>
          ) : null,
        at: inv.start.toISO(),
        itemType: 'shift',
      }
    })
  })
}

export function mergeItems(
  items: SortableFlatListListItem[],
): FlatListListItem[] {
  return items.sort((a, b) => {
    if (DateTime.fromISO(a.at) < DateTime.fromISO(b.at)) return -1
    if (DateTime.fromISO(a.at) > DateTime.fromISO(b.at)) return 1

    // a and b are at same time; use item type priority instead
    // subheaders first
    if (a.itemType === 'subheader') return -1
    if (b.itemType === 'subheader') return 1
    // then start notice
    if (a.itemType === 'start-notice') return -1
    if (b.itemType === 'start-notice') return 1
    // then gaps
    if (a.itemType === 'gap') return -1
    if (b.itemType === 'gap') return 1
    // then shifts
    if (a.itemType === 'shift') return -1
    if (b.itemType === 'shift') return 1
    // then end notice
    if (a.itemType === 'end-notice') return -1
    if (b.itemType === 'end-notice') return 1

    // identical items; should never get to this point
    return 0
  })
}
