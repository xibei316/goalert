import React, { useState } from 'react'
import { Button, Grid, makeStyles } from '@material-ui/core/index'

import _ from 'lodash'
import OnCallNotificationsDialog from './OnCallNotificationsDialog'

const useStyles = makeStyles((theme) => ({
  calIcon: {
    marginRight: theme.spacing(1),
  },
  captionContainer: {
    display: 'grid',
  },
}))

export default function OnCallNotificationsButton(props) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <React.Fragment>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Button
            data-cy='oncall-notifications-btn'
            aria-label='Manage on-call notifications.'
            color='primary'
            onClick={() => setShowDialog(true)}
            variant='contained'
          >
            Manage Notifications
          </Button>
        </Grid>
      </Grid>
      {showDialog && (
        <OnCallNotificationsDialog
          onClose={() => setShowDialog(false)}
          scheduleID={props.scheduleID}
        />
      )}
    </React.Fragment>
  )
}
