import { gql, QueryResult, useQuery } from '@apollo/client'
import { Shift } from './sharedUtils'
import {
  getCoverageGapItems,
  getOutOfBoundsItems,
  getScheduleEndItem,
  getScheduleStartItem,
  getShiftItems,
  getSubheaderItems,
} from './shiftsListUtil'
import { useMemo } from 'react'
import { DateTime, Interval } from 'luxon'
import { ClassNameMap } from '@material-ui/core/styles/withStyles'
import { FlatListListItem } from '../../lists/FlatList'

const schedTZQuery = gql`
  query ($id: ID!) {
    schedule(id: $id) {
      id
      timeZone
    }
  }
`
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

export interface ShiftOptions {
  schedInterval: Interval
  handleCoverageGapClick: (coverageGap: Interval) => void
  zone: string
  start: string
  end: string
  onRemove: (shift: Shift) => void
  edit?: boolean
  now: DateTime
  classes: ClassNameMap
}
interface UseShiftListProps {
  shifts: Shift[]
  options: ShiftOptions
}

export function useShiftList({ shifts, options }: UseShiftListProps): {
  [key: string]: FlatListListItem[]
} {
  const shiftListItems = useMemo(() => {
    // render helpful message if interval is invalid
    // shouldn't ever be seen because of our validation checks, but just in case
    if (!options.schedInterval.isValid) {
      return {
        invalid: [
          {
            id: 'invalid-sched-interval',
            type: 'ERROR',
            message: 'Invalid Start/End',
            details:
              'Oops! There was a problem with the interval selected for your temporary schedule. Please try again.',
          },
        ],
      }
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

    const shiftItems = getShiftItems(shifts, options)

    const startItem = getScheduleStartItem(shifts, options)

    const endItem = getScheduleEndItem(shifts, options)

    const shiftListItems = [
      ...shiftItems,
      ...coverageGapItems,
      ...subheaderItems,
      ...outOfBoundsItems,
      startItem,
      endItem,
    ]

    const result = shiftListItems.reduce<{ [key: string]: FlatListListItem[] }>(
      (resultObj, item) => {
        const day = item.at.startOf('day').toString()

        if (!resultObj[day]) {
          resultObj[day] = [] // start a new chunk
        }

        resultObj[day].push(item)

        return resultObj
      },
      {},
    )

    return result
  }, [shifts, options])

  return shiftListItems
}

/*

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

return {
        id: 'sched-start_' + options.start,
        type: 'OK',
        icon: <ScheduleIcon />,
        message,
        details,
        at: DateTime.fromISO(options.start, { zone: options.zone }),
        itemType: 'start',
      } as Sortable<FlatListNotice>

return {
        id: 'sched-end_' + options.end,
        type: 'OK',
        icon: <ScheduleIcon />,
        message: '',
        details,
        at,
        itemType: 'end',
      } as Sortable<FlatListNotice>



 */
