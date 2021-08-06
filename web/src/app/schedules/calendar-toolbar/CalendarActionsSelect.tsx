import React, { useContext, useState } from 'react'
import GroupAdd from '@material-ui/icons/GroupAdd'
import { Button, Menu, MenuItem } from '@material-ui/core'
import { ScheduleCalendarContext } from '../ScheduleDetails'

function CalendarActionsSelect(): JSX.Element {
  const { onNewTempSched, setOverrideDialog } = useContext(
    ScheduleCalendarContext,
  )
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <React.Fragment>
      <Button
        aria-controls='simple-menu'
        aria-haspopup='true'
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size='medium'
        variant='contained'
        color='primary'
        startIcon={<GroupAdd />}
      >
        Override
      </Button>
      <Menu
        onBlur={() => setAnchorEl(null)}
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setOverrideDialog({ variant: 'add' })}>
          Add User
        </MenuItem>
        <MenuItem onClick={() => setOverrideDialog({ variant: 'remove' })}>
          Remove User
        </MenuItem>
        <MenuItem onClick={() => setOverrideDialog({ variant: 'replace' })}>
          Replace User
        </MenuItem>
        <MenuItem onClick={onNewTempSched}>Create Temporary Schedule</MenuItem>
      </Menu>
    </React.Fragment>
  )
}

export default CalendarActionsSelect
