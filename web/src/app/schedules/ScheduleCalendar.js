import React from 'react'
import { PropTypes as p } from 'prop-types'
import { Card, makeStyles } from '@material-ui/core'
import Typography from '@material-ui/core/Typography'
import { Calendar } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import CalendarEventWrapper from './CalendarEventWrapper'
import CalendarToolbar from './calendar-toolbar/CalendarToolbar'
import { DateTime, Interval } from 'luxon'
import { theme } from '../mui'
import LuxonLocalizer from '../util/LuxonLocalizer'
import { parseInterval, trimSpans } from '../util/shifts'
import _ from 'lodash'
import CalendarUserFilter from './calendar-toolbar/CalendarUserFilter'
import CalendarActionsSelect from './calendar-toolbar/CalendarActionsSelect'
import SpinContainer from '../loading/components/SpinContainer'
import { useCalendarNavigation, useCalendarUserFilter } from './hooks'

const localizer = LuxonLocalizer(DateTime, { firstDayOfWeek: 0 })

const useStyles = makeStyles((theme) => ({
  card: {
    padding: theme.spacing(2),
  },
}))

function ScheduleCalendar(props) {
  const { shifts, temporarySchedules } = props

  const classes = useStyles()
  const { weekly, start } = useCalendarNavigation()
  const { userFilter, activeOnly } = useCalendarUserFilter()

  const eventStyleGetter = (event, start, end, isSelected) => {
    if (event.fixed) {
      return {
        style: {
          backgroundColor: isSelected ? '#094F13' : '#0C6618',
          borderColor: '#094F13',
        },
      }
    }
  }

  const getCalEvents = (shifts, _tempScheds) => {
    const tempSchedules = _tempScheds.map((sched) => ({
      start: sched.start,
      end: sched.end,
      user: { name: 'Temporary Schedule' },
      tempSched: sched,
      fixed: true,
    }))

    // flat list of all fixed shifts, with `fixed` set to true
    const fixedShifts = _.flatten(
      _tempScheds.map((sched) => {
        return sched.shifts.map((s) => ({
          ...s,
          tempSched: sched,
          fixed: true,
          isTempSchedShift: true,
        }))
      }),
    )

    const fixedIntervals = tempSchedules.map(parseInterval)
    let filteredShifts = [
      ...tempSchedules,
      ...fixedShifts,

      // Remove shifts within a temporary schedule, and trim any that overlap
      ...trimSpans(shifts, ...fixedIntervals),
    ]

    // if any users in users array, only show the ids present
    if (userFilter.length > 0) {
      filteredShifts = filteredShifts.filter((shift) =>
        userFilter.includes(shift.user.id),
      )
    }

    if (activeOnly) {
      filteredShifts = filteredShifts.filter(
        (shift) =>
          shift.TempSched ||
          Interval.fromDateTimes(
            DateTime.fromISO(shift.start),
            DateTime.fromISO(shift.end),
          ).contains(DateTime.local()),
      )
    }

    return filteredShifts.map((shift) => {
      return {
        title: shift.user.name,
        userID: shift.user.id,
        start: new Date(shift.start),
        end: new Date(shift.end),
        fixed: shift.fixed,
        isTempSchedShift: shift.isTempSchedShift,
        tempSched: shift.tempSched,
      }
    })
  }

  return (
    <React.Fragment>
      <Typography variant='caption' color='textSecondary'>
        <i>
          Times shown are in {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </i>
      </Typography>
      <Card className={classes.card} data-cy='calendar'>
        <CalendarToolbar
          filter={<CalendarUserFilter />}
          endAdornment={<CalendarActionsSelect />}
        />
        <SpinContainer loading={props.loading}>
          <Calendar
            date={DateTime.fromISO(start).toJSDate()}
            localizer={localizer}
            events={getCalEvents(shifts, temporarySchedules)}
            style={{
              height: weekly ? '100%' : '45rem',
              fontFamily: theme.typography.body2.fontFamily,
              fontSize: theme.typography.body2.fontSize,
            }}
            tooltipAccessor={() => null}
            views={['month', 'week']}
            view={weekly ? 'week' : 'month'}
            showAllEvents
            eventPropGetter={eventStyleGetter}
            onNavigate={() => {}} // stub to hide false console err
            onView={() => {}} // stub to hide false console err
            components={{
              eventWrapper: CalendarEventWrapper,
              toolbar: () => null,
            }}
          />
        </SpinContainer>
      </Card>
    </React.Fragment>
  )
}

ScheduleCalendar.propTypes = {
  shifts: p.array.isRequired,
  temporarySchedules: p.array,
  loading: p.bool,
}

export default ScheduleCalendar
