import { gql, QueryResult, useQuery } from '@apollo/client'
import _ from 'lodash'
import { parseInterval } from '../../util/shifts'
import { Shift } from './sharedUtils'
import {
  fmtTime,
  getCoverageGapItems,
  getOutOfBoundsItems,
  getSubheaderItems,
  Sortable,
} from './shiftsListUtil'
import ScheduleIcon from '@material-ui/icons/Schedule'
import React, { useMemo } from 'react'
import IconButton from '@material-ui/core/IconButton'
import makeStyles from '@material-ui/core/styles/makeStyles'
import Tooltip from '@material-ui/core/Tooltip/Tooltip'
import Delete from '@material-ui/icons/Delete'
import Error from '@material-ui/icons/Error'
import { DateTime, Interval } from 'luxon'
import { FlatListItem, FlatListNotice } from '../../lists/FlatList'
import { UserAvatar } from '../../util/avatars'
import { splitAtMidnight } from '../../util/luxon-helpers'
import { Chip } from '@material-ui/core'

const schedTZQuery = gql`
  query ($id: ID!) {
    schedule(id: $id) {
      id
      timeZone
    }
  }
`

const useStyles = makeStyles({
  secondaryActionWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  spinContainer: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    marginTop: '15rem',
  },
})

interface ScheduleTZResult {
  // q is the Apollo query status
  q: QueryResult
  // zone is schedule time zone name if ready; else empty string
  zone: string
  // isLocalZone is true if schedule and system time zone are equal
  isLocalZone: boolean
  // zoneAbbr is schedule time zone abbreviation if ready; else empty string
  zoneAbbr: string
}

export function useScheduleTZ(scheduleID: string): ScheduleTZResult {
  const q = useQuery(schedTZQuery, {
    variables: { id: scheduleID },
  })
  const zone = q.data?.schedule?.timeZone ?? ''
  const isLocalZone = zone === DateTime.local().zoneName
  const zoneAbbr = zone ? DateTime.fromObject({ zone }).toFormat('ZZZZ') : ''

  if (q.error) {
    console.error(
      `useScheduleTZ: issue getting timezone for schedule ${scheduleID}: ${q.error.message}`,
    )
  }

  return { q, zone, isLocalZone, zoneAbbr }
}

interface UseShiftListProps {
  shifts: Shift[]
  options: {
    schedInterval: Interval
    handleCoverageGapClick: (coverageGap: Interval) => void
    zone: string
    start: string
    end: string
    onRemove: (shift: Shift) => void
    edit?: boolean
  }
}

export function useShiftList({ shifts, options }: UseShiftListProps): any {
  const now = useMemo(
    () => DateTime.now().setZone(options.zone),
    [options.zone],
  )
  const classes = useStyles()

  const results = useMemo(() => {
    // render helpful message if interval is invalid
    // shouldn't ever be seen because of our validation checks, but just in case
    if (!options.schedInterval.isValid) {
      return [
        {
          id: 'invalid-sched-interval',
          type: 'ERROR',
          message: 'Invalid Start/End',
          details:
            'Oops! There was a problem with the interval selected for your temporary schedule. Please try again.',
        },
      ]
    }

    const subheaderItems = getSubheaderItems(
      options.schedInterval,
      shifts,
      options.zone,
    )
    const coverageGapItems = getCoverageGapItems(
      options.schedInterval,
      shifts,
      options.zone,
      options.handleCoverageGapClick,
    )
    const outOfBoundsItems = getOutOfBoundsItems(
      options.schedInterval,
      shifts,
      options.zone,
    )

    const shiftItems = (() => {
      return _.flatMap(shifts, (s) => {
        const shiftInv = parseInterval(s, options.zone)
        const isValid = options.schedInterval.engulfs(shiftInv)
        const dayInvs = splitAtMidnight(shiftInv)

        return dayInvs.map((inv, index) => {
          const startTime = fmtTime(inv.start)
          const endTime = fmtTime(inv.end)
          const isHistoricShift =
            DateTime.fromISO(s.end, { zone: options.zone }) < now

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

          return {
            scrollIntoView: true,
            id: s.start + s.userID + index.toString(),
            title: s.user?.name,
            subText,
            userID: s.userID,
            icon: <UserAvatar userID={s.userID} />,
            disabled: isHistoricShift,
            secondaryAction:
              index === 0 ? (
                <div className={classes.secondaryActionWrapper}>
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
          } as Sortable<FlatListItem>
        })
      })
    })()

    const startItem = (() => {
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
    })()

    const endItem = (() => {
      const at = DateTime.fromISO(options.end, { zone: options.zone })
      const details = at.equals(at.startOf('day'))
        ? 'Ends at midnight'
        : 'Ends at ' + fmtTime(at)

      return {
        id: 'sched-end_' + options.end,
        type: 'OK',
        icon: <ScheduleIcon />,
        message: '',
        details,
        at,
        itemType: 'end',
      } as Sortable<FlatListNotice>
    })()

    const shiftsx = [
      ...shiftItems,
      ...coverageGapItems,
      ...subheaderItems,
      ...outOfBoundsItems,
      startItem,
      endItem,
    ]

    const result = shiftsx.reduce<any>((resultObj, item) => {
      const day = item.at.startOf('day').toString()

      if (!resultObj[day]) {
        resultObj[day] = [] // start a new chunk
      }

      resultObj[day].push(item)

      return resultObj
    }, {})

    console.log(result)
    return result

    // return sortItems([
    //   ...shiftItems,
    //   ...coverageGapItems,
    //   ...subheaderItems,
    //   ...outOfBoundsItems,
    //   startItem,
    //   endItem,
    // ])
  }, [shifts, options])

  return results
}
