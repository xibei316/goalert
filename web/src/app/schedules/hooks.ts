import { DateTime } from 'luxon'
import { useResetURLParams, useURLParam } from '../actions'
import { getStartOfWeek } from '../util/luxon-helpers'

interface CalendarNavigation {
  weekly: boolean
  setWeekly: (val: boolean) => void
  start: string
  setStart: (val: string) => void
}

export function useCalendarNavigation(): CalendarNavigation {
  const [weekly, setWeekly] = useURLParam<boolean>('weekly', false)
  const [start, setStart] = useURLParam(
    'start',
    weekly
      ? getStartOfWeek().toISODate()
      : DateTime.now().startOf('month').toISODate(),
  )

  return {
    weekly,
    setWeekly,
    start,
    setStart,
  }
}

interface CalendarUserFilter {
  activeOnly: boolean
  setActiveOnly: (newValue: boolean) => void
  userFilter: string[]
  setUserFilter: (newValue: string[]) => void
  resetUserFilter: () => void
}

export function useCalendarUserFilter(): CalendarUserFilter {
  const [activeOnly, setActiveOnly] = useURLParam<boolean>('activeOnly', false)
  const [userFilter, setUserFilter] = useURLParam<string[]>('userFilter', [])
  const resetUserFilter = useResetURLParams('userFilter', 'activeOnly')

  return {
    activeOnly,
    setActiveOnly,
    userFilter,
    setUserFilter,
    resetUserFilter,
  }
}
