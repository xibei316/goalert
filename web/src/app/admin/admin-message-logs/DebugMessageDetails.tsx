import React from 'react'
import {
  ClickAwayListener,
  Divider,
  Drawer,
  Grid,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import { DateTime } from 'luxon'
import AppLink from '../../util/AppLink'
import { DebugMessage } from '../../../schema'
import makeStyles from '@mui/styles/makeStyles/makeStyles'
import { theme } from '../../mui'

interface Props {
  open: boolean
  onClose: () => void
  log?: DebugMessage | null
}

const useStyles = makeStyles<typeof theme>((theme) => ({
  newTab: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath xmlns='http://www.w3.org/2000/svg' d='M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h5c.55 0 1-.45 1-1s-.45-1-1-1H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6c0-.55-.45-1-1-1s-1 .45-1 1v5c0 .55-.45 1-1 1zM14 4c0 .55.45 1 1 1h2.59l-9.13 9.13a.996.996 0 1 0 1.41 1.41L19 6.41V9c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1h-5c-.55 0-1 .45-1 1z' fill='${encodeURIComponent(
      theme.palette.anchor.main,
    )}' /%3E%3C/svg%3E");`,
    backgroundPosition: 'center right',
    backgroundRepeat: 'no-repeat',
    paddingRight: '17px',
    backgroundSize: 'contain',
  },
}))

export default function DebugMessageDetails(props: Props): JSX.Element {
  const { open, onClose, log } = props
  const classes = useStyles()

  return (
    <ClickAwayListener onClickAway={onClose} mouseEvent='onMouseUp'>
      <Drawer anchor='right' open={open} variant='persistent'>
        <Toolbar />
        <Grid style={{ width: '30vw' }}>
          <Typography variant='h6' style={{ margin: '16px' }}>
            Log Details
          </Typography>
          <Divider />
          <List disablePadding>
            {log?.id && (
              <ListItem divider>
                <ListItemText primary='ID' secondary={log.id} />
              </ListItem>
            )}
            {log?.createdAt && (
              <ListItem divider>
                <ListItemText
                  primary='Created At'
                  secondary={DateTime.fromISO(log.createdAt).toFormat('fff')}
                />
              </ListItem>
            )}
            {log?.updatedAt && (
              <ListItem divider>
                <ListItemText
                  primary='Updated At'
                  secondary={DateTime.fromISO(log.updatedAt).toFormat('fff')}
                />
              </ListItem>
            )}
            {log?.type && (
              <ListItem divider>
                <ListItemText
                  primary='Notification Type'
                  secondary={log.type}
                />
              </ListItem>
            )}
            {log?.status && (
              <ListItem divider>
                <ListItemText primary='Current Status' secondary={log.status} />
              </ListItem>
            )}

            {log?.userID && log?.userName && (
              <ListItem divider>
                <ListItemText
                  primary='User'
                  secondary={
                    <AppLink
                      to={`/users/${log?.userID}`}
                      newTab
                      className={classes.newTab}
                    >
                      {log.userName}
                    </AppLink>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            )}
            {log?.serviceID && log?.serviceName && (
              <ListItem divider>
                <ListItemText
                  primary='Service'
                  secondary={
                    <AppLink
                      to={`/services/${log.serviceID}`}
                      newTab
                      className={classes.newTab}
                    >
                      {log.serviceName}
                    </AppLink>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            )}
            {log?.alertID && (
              <ListItem divider>
                <ListItemText
                  primary='Alert'
                  secondary={
                    <AppLink
                      to={`/alerts/${log.alertID}`}
                      newTab
                      className={classes.newTab}
                    >
                      {log.alertID}
                    </AppLink>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            )}

            {log?.source && (
              <ListItem divider>
                <ListItemText primary='Source' secondary={log.source} />
              </ListItem>
            )}
            {log?.destination && (
              <ListItem divider>
                <ListItemText
                  primary='Destination'
                  secondary={log.destination}
                />
              </ListItem>
            )}
            {log?.providerID && (
              <ListItem divider>
                <ListItemText
                  primary='Provider ID'
                  secondary={log.providerID}
                />
              </ListItem>
            )}
          </List>
        </Grid>
      </Drawer>
    </ClickAwayListener>
  )
}
