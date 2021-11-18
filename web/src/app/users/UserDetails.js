import React, { useState } from 'react'
import { useQuery, gql } from '@apollo/client'
import p from 'prop-types'
import Delete from '@material-ui/icons/Delete'
import EditIcon from '@material-ui/icons/Edit'
import DetailsPage from '../details/DetailsPage'
import StatusUpdateNotification from './UserStatusUpdatePreference'
import { UserAvatar } from '../util/avatars'
import UserContactMethodList from './UserContactMethodList'
import { AddAlarm, SettingsPhone } from '@material-ui/icons'
import SpeedDial from '../util/SpeedDial'
import UserNotificationRuleList from './UserNotificationRuleList'
import { Grid } from '@material-ui/core'
import UserContactMethodCreateDialog from './UserContactMethodCreateDialog'
import UserNotificationRuleCreateDialog from './UserNotificationRuleCreateDialog'
import UserContactMethodVerificationDialog from './UserContactMethodVerificationDialog'
import Spinner from '../loading/components/Spinner'
import { GenericError, ObjectNotFound } from '../error-pages'
import { useConfigValue, useSessionInfo } from '../util/RequireConfig'
import UserEditDialog from './UserEditDialog'
import UserDeleteDialog from './UserDeleteDialog'
import { QuerySetFavoriteButton } from '../util/QuerySetFavoriteButton'

function serviceCount(onCallSteps = []) {
  const set = new Set()
  onCallSteps.forEach((step) =>
    (step.escalationPolicy.assignedTo || []).forEach((svc) => set.add(svc.id)),
  )

  return set.size
}

export default function UserDetails(props) {
  const {
    userID: currentUserID,
    isAdmin,
    ready: isSessionReady,
  } = useSessionInfo()
  const [disclaimer] = useConfigValue('General.NotificationDisclaimer')
  const [createCM, setCreateCM] = useState(false)
  const [createNR, setCreateNR] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showVerifyDialogByID, setShowVerifyDialogByID] = useState(null)
  const [showUserDeleteDialog, setShowUserDeleteDialog] = useState(false)

  const query = gql`
  query profileInfo($id: ID!) {
    user(id: $id) {
      id
      role
      name
      email
      contactMethods {
        id
      }
      onCallSteps {
        id
        escalationPolicy {
          id
          assignedTo {
            id
          }
        }
      }
      ${isAdmin || props.userID === currentUserID ? 'sessions {id}' : ''}
      ${props.userID === currentUserID ? 'calendarSubscriptions {id}' : ''}
    }
  }
`

  const {
    data,
    loading: isQueryLoading,
    error,
  } = useQuery(query, {
    variables: { id: props.userID },
    skip: !isSessionReady,
  })

  const loading = !isSessionReady || isQueryLoading

  if (error) return <GenericError error={error.message} />
  if (!data?.user?.id) return loading ? <Spinner /> : <ObjectNotFound />

  const user = data.user
  const svcCount = serviceCount(user.onCallSteps)
  const sessCount = user.sessions.length
  const subCount = user.calendarSubscriptions.length
  const disableNR = user.contactMethods.length === 0

  const links = [
    {
      label: 'On-Call Assignments',
      url: 'on-call-assignments',
      subText: `On-call for ${svcCount} service${svcCount === 1 ? '' : 's'}`,
    },
  ]

  if (props.userID === currentUserID) {
    links.push({
      label: 'Schedule Calendar Subscriptions',
      url: 'schedule-calendar-subscriptions',
      subText: `${subCount} calendar subscription${subCount === 1 ? '' : 's'}`,
    })
  }

  if (isAdmin || props.userID === currentUserID) {
    links.push({
      label: 'Active Sessions',
      url: 'sessions',
      subText: `${sessCount} active session${sessCount === 1 ? '' : 's'}`,
    })
  }

  return (
    <React.Fragment>
      {showEdit && (
        <UserEditDialog
          onClose={() => setShowEdit(false)}
          userID={props.userID}
          role={user.role}
        />
      )}
      {showUserDeleteDialog && (
        <UserDeleteDialog
          userID={props.userID}
          onClose={() => setShowUserDeleteDialog(false)}
        />
      )}
      {props.readOnly ? null : (
        <SpeedDial
          label='Add Items'
          actions={[
            {
              label: 'Add Contact Method',
              icon: <SettingsPhone />,
              onClick: () => setCreateCM(true),
            },
            {
              label: 'Add Notification Rule',
              icon: <AddAlarm />,
              disabled: disableNR,
              onClick: () => setCreateNR(true),
            },
          ]}
        />
      )}
      {createCM && (
        <UserContactMethodCreateDialog
          userID={props.userID}
          disclaimer={disclaimer}
          onClose={(result) => {
            setCreateCM(false)
            setShowVerifyDialogByID(
              result && result.contactMethodID ? result.contactMethodID : null,
            )
          }}
        />
      )}
      {showVerifyDialogByID && (
        <UserContactMethodVerificationDialog
          contactMethodID={showVerifyDialogByID}
          onClose={() => setShowVerifyDialogByID(null)}
        />
      )}
      {createNR && (
        <UserNotificationRuleCreateDialog
          userID={props.userID}
          onClose={() => setCreateNR(false)}
        />
      )}
      <DetailsPage
        avatar={<UserAvatar userID={props.userID} />}
        title={user.name + (svcCount ? ' (On-Call)' : '')}
        subheader={user.email}
        pageContent={
          <Grid container spacing={2}>
            <UserContactMethodList
              userID={props.userID}
              readOnly={props.readOnly}
            />
            <UserNotificationRuleList
              userID={props.userID}
              readOnly={props.readOnly}
            />
          </Grid>
        }
        primaryActions={
          props.readOnly
            ? []
            : [
                <StatusUpdateNotification
                  key='primary-action-status-updates'
                  userID={props.userID}
                />,
              ]
        }
        secondaryActions={
          isAdmin
            ? [
                {
                  label: 'Delete',
                  icon: <Delete />,
                  handleOnClick: () => setShowUserDeleteDialog(true),
                },
                {
                  label: 'Edit',
                  icon: <EditIcon />,
                  handleOnClick: () => setShowEdit(true),
                },
                <QuerySetFavoriteButton
                  key='secondary-action-favorite'
                  userID={props.userID}
                />,
              ]
            : [
                <QuerySetFavoriteButton
                  key='secondary-action-favorite'
                  userID={props.userID}
                />,
              ]
        }
        links={links}
      />
    </React.Fragment>
  )
}

UserDetails.propTypes = {
  userID: p.string.isRequired,
  readOnly: p.bool,
}
