import React, { useMemo } from 'react'
import makeStyles from '@material-ui/core/styles/makeStyles'
import { DateTime, Interval } from 'luxon'

import { Shift } from './sharedUtils'
import FlatList from '../../lists/FlatList'

import { parseInterval } from '../../util/shifts'
import { useScheduleTZ, useShiftList } from './hooks'
import { CircularProgress } from '@material-ui/core'

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

type TempSchedShiftsListProps = {
  value: Shift[]
  onRemove: (shift: Shift) => void
  start: string
  end: string
  edit?: boolean
  scheduleID: string
  handleCoverageGapClick: (coverageGap: Interval) => void
}

export default function TempSchedShiftsList({
  edit,
  start,
  end,
  value,
  onRemove,
  scheduleID,
  handleCoverageGapClick,
}: TempSchedShiftsListProps): JSX.Element {
  const classes = useStyles()
  const { q, zone } = useScheduleTZ(scheduleID)
  const schedInterval = parseInterval({ start, end }, zone)

  const now = useMemo(() => DateTime.now().setZone(zone), [zone])

  const shiftListItems = useShiftList({
    shifts: value,
    options: {
      zone,
      edit,
      start,
      end,
      onRemove,
      handleCoverageGapClick,
      schedInterval,
      now,
      classes,
    },
  })

  // wait for zone
  if (q.loading || zone === '') {
    return (
      <div className={classes.spinContainer}>
        <CircularProgress />
      </div>
    )
  }

  return (
    <div data-cy='shifts-list'>
      {Object.entries(shiftListItems).map(([key, value]) => (
        <FlatList
          key={key}
          items={value}
          emptyMessage='Add a user to the left to get started.'
          dense
          transition
        />
      ))}
    </div>
  )
}

// function items(schedInterval: Interval, shifts: Shift[]): any {
//   // render helpful message if interval is invalid
//   // shouldn't ever be seen because of our validation checks, but just in case
//   if (!schedInterval.isValid) {
//     return [
//       {
//         id: 'invalid-sched-interval',
//         type: 'ERROR',
//         message: 'Invalid Start/End',
//         details:
//           'Oops! There was a problem with the interval selected for your temporary schedule. Please try again.',
//       },
//     ]
//   }

//   const subheaderItems = getSubheaderItems(schedInterval, shifts, zone)
//   const coverageGapItems = getCoverageGapItems(
//     schedInterval,
//     shifts,
//     zone,
//     handleCoverageGapClick,
//   )
//   const outOfBoundsItems = getOutOfBoundsItems(schedInterval, shifts, zone)

//   const shiftItems = (() => {
//     return _.flatMap(shifts, (s) => {
//       const shiftInv = parseInterval(s, zone)
//       const isValid = schedInterval.engulfs(shiftInv)
//       const dayInvs = splitAtMidnight(shiftInv)

//       return dayInvs.map((inv, index) => {
//         const startTime = fmtTime(inv.start)
//         const endTime = fmtTime(inv.end)
//         const isHistoricShift = DateTime.fromISO(s.end, { zone }) < now

//         let subText = ''
//         if (inv.length('hours') === 24) {
//           // shift spans all day
//           subText = 'All day'
//         } else if (inv.engulfs(shiftInv)) {
//           // shift is inside the day
//           subText = `From ${startTime} to ${endTime}`
//         } else if (inv.end === shiftInv.end) {
//           subText = `Active until ${endTime}`
//         } else {
//           // shift starts and continues on for the rest of the day
//           subText = `Active starting at ${startTime}\n`
//         }

//         return {
//           scrollIntoView: true,
//           id: s.start + s.userID + index.toString(),
//           title: s.user.name,
//           subText,
//           userID: s.userID,
//           icon: <UserAvatar userID={s.userID} />,
//           disabled: isHistoricShift,
//           secondaryAction:
//             index === 0 ? (
//               <div className={classes.secondaryActionWrapper}>
//                 {!isValid && !isHistoricShift && (
//                   <Tooltip
//                     title='This shift extends beyond the start and/or end of this temporary schedule'
//                     placement='left'
//                   >
//                     <Error color='error' />
//                   </Tooltip>
//                 )}
//                 {isHistoricShift ? (
//                   <Chip style={{ opacity: 0.6 }} label='Concluded' />
//                 ) : (
//                   <IconButton
//                     aria-label='delete shift'
//                     onClick={() => onRemove(s)}
//                   >
//                     <Delete />
//                   </IconButton>
//                 )}
//               </div>
//             ) : null,
//           at: inv.start,
//           itemType: 'shift',
//         } as Sortable<FlatListItem>
//       })
//     })
//   })()

//   const startItem = (() => {
//     let details = `Starts at ${fmtTime(DateTime.fromISO(start, { zone }))}`
//     let message = ''

//     if (edit && DateTime.fromISO(start, { zone }) < now) {
//       message = 'Currently active'
//       details = 'Historical shifts will not be displayed'
//     }

//     return {
//       id: 'sched-start_' + start,
//       type: 'OK',
//       icon: <ScheduleIcon />,
//       message,
//       details,
//       at: DateTime.fromISO(start, { zone }),
//       itemType: 'start',
//     } as Sortable<FlatListNotice>
//   })()

//   const endItem = (() => {
//     const at = DateTime.fromISO(end, { zone })
//     const details = at.equals(at.startOf('day'))
//       ? 'Ends at midnight'
//       : 'Ends at ' + fmtTime(at)

//     return {
//       id: 'sched-end_' + end,
//       type: 'OK',
//       icon: <ScheduleIcon />,
//       message: '',
//       details,
//       at,
//       itemType: 'end',
//     } as Sortable<FlatListNotice>
//   })()

//   const shiftsx = [
//     ...shiftItems,
//     ...coverageGapItems,
//     ...subheaderItems,
//     ...outOfBoundsItems,
//     startItem,
//     endItem,
//   ]

//   const result = shiftsx.reduce<any>((resultObj, item) => {
//     const day = item.at.startOf('day').toString()

//     if (!resultObj[day]) {
//       resultObj[day] = [] // start a new chunk
//     }

//     resultObj[day].push(item)

//     return resultObj
//   }, {})

//   console.log(result)
//   return result

//   // return sortItems([
//   //   ...shiftItems,
//   //   ...coverageGapItems,
//   //   ...subheaderItems,
//   //   ...outOfBoundsItems,
//   //   startItem,
//   //   endItem,
//   // ])
// }
