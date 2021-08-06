import React from 'react'
import Grid from '@material-ui/core/Grid'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'

import FilterContainer from '../../util/FilterContainer'
import { UserSelect } from '../../selection'
import { useCalendarUserFilter } from '../hooks'

function CalendarUserFilter(): JSX.Element {
  const {
    userFilter,
    setUserFilter,
    activeOnly,
    setActiveOnly,
    resetUserFilter,
  } = useCalendarUserFilter()

  return (
    <FilterContainer
      onReset={resetUserFilter}
      iconButtonProps={{
        size: 'small',
      }}
    >
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              value='activeOnly'
            />
          }
          label='Active shifts only'
        />
      </Grid>
      <Grid item xs={12}>
        <UserSelect
          label='Filter users...'
          multiple
          value={userFilter}
          onChange={setUserFilter}
        />
      </Grid>
    </FilterContainer>
  )
}

export default CalendarUserFilter
