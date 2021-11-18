import React from 'react'
import { PropTypes as p } from 'prop-types'
import { Button, FormHelperText, Grid, makeStyles } from '@material-ui/core'
import OpenInNewIcon from '@material-ui/icons/OpenInNew'
import CopyText from '../../util/CopyText'
import Markdown from '../../util/Markdown'

const useStyles = makeStyles((theme) => ({
  caption: {
    width: '100%',
  },
  flex: {
    display: 'flex',
  },
  urlNote: {
    marginLeft: theme.spacing(1),
  },
  subscribeButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
}))

export default function CalenderSuccessForm(props) {
  const classes = useStyles()
  const url = props.url.replace(/^https?:\/\//, 'webcal://')
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} className={classes.subscribeButtonContainer}>
        <Button
          color='primary'
          variant='contained'
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          endIcon={<OpenInNewIcon />}
        >
          Subscribe
        </Button>
      </Grid>

      <Grid item xs={12} style={{ paddingBottom: 0 }}>
        <FormHelperText className={classes.flex}>
          <CopyText value={props.url} placement='top' />
          <span className={classes.urlNote}>
            Click to copy the URL below. Some applications require you to enter
            this manually.
          </span>
        </FormHelperText>
      </Grid>

      <Grid item xs={12} style={{ paddingTop: 0 }}>
        <Markdown value={'```\n' + props.url + '\n```'} />
      </Grid>
    </Grid>
  )
}

CalenderSuccessForm.propTypes = {
  url: p.string.isRequired,
}
