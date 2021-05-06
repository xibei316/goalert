import React, { MouseEventHandler } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Button from '@material-ui/core/Button'
import MUICardActions from '@material-ui/core/CardActions'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { Grid } from '@material-ui/core'

interface CardActionsProps {
  primaryActions?: Array<Action | JSX.Element>
  secondaryActions?: Array<Action | JSX.Element>
}

export type Action = {
  label: string // primary button text, use for a tooltip if secondary action
  handleOnClick: MouseEventHandler<HTMLButtonElement>

  icon?: JSX.Element // if true, adds a start icon to a button with text
}

const useStyles = makeStyles({
  p8: {
    padding: 8,
  },
  primaryActions: {
    display: 'flex',
    alignItems: 'end',
  },
  secondaryActions: {
    display: 'flex',
    alignItems: 'end',
    marginRight: -8,
    marginBottom: -8,
  },
})

function makeActions(
  actions?: Array<Action | JSX.Element>,
  secondary?: boolean,
): JSX.Element[] {
  if (!actions) return []

  return actions.map((action, i) => {
    if (!('label' in action && 'handleOnClick' in action)) {
      // generic JSX element
      return action
    }

    if (secondary) {
      return (
        <Tooltip key={i} title={action.label} placement='top'>
          <IconButton onClick={action.handleOnClick}>{action.icon}</IconButton>
        </Tooltip>
      )
    }

    return (
      <Button key={i} onClick={action.handleOnClick} startIcon={action.icon}>
        {action.label}
      </Button>
    )
  })
}

export default function CardActions(p: CardActionsProps): JSX.Element {
  const classes = useStyles()
  const primaryActions = makeActions(p.primaryActions)
  const secondaryActions = makeActions(p.secondaryActions, true)

  return (
    <MUICardActions data-cy='card-actions'>
      <Grid container justify='space-between' className={classes.p8}>
        <Grid item className={classes.primaryActions}>
          {primaryActions}
        </Grid>
        <Grid item className={classes.secondaryActions}>
          {secondaryActions}
        </Grid>
      </Grid>
    </MUICardActions>
  )
}
