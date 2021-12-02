import React from 'react'
import {
  Typography,
  TableCell,
  CardContent,
  TableHead,
  TableBody,
} from '@material-ui/core'
import _ from 'lodash'
import { TableRow, Card, Table } from 'mdi-material-ui'
import Countdown from 'react-countdown'
import { RotationLink, ScheduleLink, UserLink } from '../../links'
import AppLink from '../../util/AppLink'

export default function AlertDefaultsEPInfo(): JSX.Element {
  function renderRotations(rotations, stepID): JSX.Element[] {
    return _.sortBy(rotations, 'name').map((rotation, i) => {
      const sep = i === 0 ? '' : ', '
      return (
        <span key={stepID + rotation.id}>
          {sep}
          {RotationLink(rotation)}
        </span>
      )
    })
  }

  function renderSchedules(schedules, stepID): JSX.Element[] {
    return _.sortBy(schedules, 'name').map((schedule, i) => {
      const sep = i === 0 ? '' : ', '
      return (
        <span key={stepID + schedule.id}>
          {sep}
          {ScheduleLink(schedule)}
        </span>
      )
    })
  }

  function renderUsers(users, stepID): JSX.Element[] {
    return _.sortBy(users, 'name').map((user, i) => {
      const sep = i === 0 ? '' : ', '
      return (
        <span key={stepID + user.id}>
          {sep}
          {UserLink(user)}
        </span>
      )
    })
  }

  /*
   * Returns properties from the escalation policy
   * for easier use in functions.
   */
  function epsHelper(): JSX.Element {
    const ep = props.data.service.escalationPolicy
    const alert = props.data
    const state = props.data.state

    return {
      repeat: state?.repeatCount,
      numSteps: ep.steps.length,
      steps: ep.steps,
      status: alert.status,
      currentLevel: state?.stepNumber,
      lastEscalation: state?.lastEscalation,
    }
  }

  function canAutoEscalate(): JSX.Element {
    const { repeat, numSteps, status, currentLevel } = epsHelper()
    if (status !== 'StatusUnacknowledged') return false
    if (repeat === -1) return true
    return currentLevel + 1 < numSteps * (repeat + 1)
  }

  /*
   * Renders a timer that counts down time until the next escalation
   */
  function renderTimer(index, delayMinutes): JSX.Element {
    const { currentLevel, numSteps, lastEscalation } = epsHelper()
    const prevEscalation = new Date(lastEscalation)

    if (currentLevel % numSteps === index && canAutoEscalate()) {
      return (
        <Countdown
          date={new Date(prevEscalation.getTime() + delayMinutes * 60000)}
          renderer={(props) => {
            const { hours, minutes, seconds } = props

            const hourTxt = parseInt(hours)
              ? `${hours} hour${parseInt(hours) === 1 ? '' : 's'} `
              : ''
            const minTxt = parseInt(minutes)
              ? `${minutes} minute${parseInt(minutes) === 1 ? '' : 's'} `
              : ''
            const secTxt = `${seconds} second${
              parseInt(seconds) === 1 ? '' : 's'
            }`

            return hourTxt + minTxt + secTxt
          }}
        />
      )
    }
    return <Typography>&mdash;</Typography>
  }

  function renderEscalationPolicySteps(): JSX.Element {
    const { steps, status, currentLevel } = epsHelper()

    if (!steps.length) {
      return (
        <TableRow>
          <TableCell>No steps</TableCell>
          <TableCell>&mdash;</TableCell>
          <TableCell>&mdash;</TableCell>
        </TableRow>
      )
    }

    return steps.map((step, index) => {
      const { delayMinutes, id, targets } = step

      const rotations = targets.filter((t) => t.type === 'rotation')
      const schedules = targets.filter((t) => t.type === 'schedule')
      const users = targets.filter((t) => t.type === 'user')

      let rotationsRender
      if (rotations.length > 0) {
        rotationsRender = <div>Rotations: {renderRotations(rotations, id)}</div>
      }

      let schedulesRender
      if (schedules.length > 0) {
        schedulesRender = <div>Schedules: {renderSchedules(schedules, id)}</div>
      }

      let usersRender
      if (users.length > 0) {
        usersRender = <div>Users: {renderUsers(users, id)}</div>
      }

      let className
      if (status !== 'closed' && currentLevel % steps.length === index) {
        className = classes.highlightRow
      }

      return (
        <TableRow key={index} className={className}>
          <TableCell>Step #{index + 1}</TableCell>
          <TableCell>
            {!targets.length && <Typography>&mdash;</Typography>}
            {rotationsRender}
            {schedulesRender}
            {usersRender}
          </TableCell>
          <TableCell>{renderTimer(index, delayMinutes)}</TableCell>
        </TableRow>
      )
    })
  }

  return (
    <Card className={getCardClassName()} style={{ overflowX: 'auto' }}>
      <CardContent>
        <Typography component='h3' variant='h5'>
          <AppLink
            to={`/escalation-policies/${alert.service.escalationPolicy.id}`}
          >
            Escalation Policy
          </AppLink>
        </Typography>
      </CardContent>
      <CardContent className={classes.tableCardContent}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Step</TableCell>
              <TableCell>Alert</TableCell>
              <TableCell>
                {canAutoEscalate()
                  ? 'Time Until Next Escalation'
                  : 'Time Between Escalations'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderEscalationPolicySteps()}</TableBody>
        </Table>
      </CardContent>
      <CardContent>
        <Typography color='textSecondary' variant='caption'>
          Visit this escalation policy for more information.
        </Typography>
      </CardContent>
    </Card>
  )
}
