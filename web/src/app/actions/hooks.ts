import { urlParamSelector, urlPathSelector } from '../selectors'
import { useSelector } from 'react-redux'
import { warn } from '../util/debug'
import joinURL from '../util/joinURL'
import { pathPrefix } from '../env'
import { useHistory, useLocation } from 'react-router'
import { sanitizeParam } from './main'

export type Value = string | boolean | number | string[]

export function useURLParam<T extends Value>(
  name: string,
  defaultValue: T,
): [T, (newValue: T) => void] {
  const urlParam = useSelector(urlParamSelector)
  const urlPath = joinURL(pathPrefix, useSelector(urlPathSelector))
  const value = urlParam(name, defaultValue) as T
  const location = useLocation()
  const history = useHistory()

  function setValue(newValue: T): void {
    if (window.location.pathname !== urlPath) {
      warn(
        'useURLParam was called to set a parameter, but location.pathname has changed, aborting',
      )
      return
    }

    const value = name === 'search' ? newValue : sanitizeParam(newValue)

    const q = new URLSearchParams(location.search)
    if (Array.isArray(value)) {
      q.delete(name)
      value.forEach((v) => q.append(name, v))
    } else if (value) {
      q.set(name, value)
    } else {
      q.delete(name)
    }

    if (q.sort) q.sort()
    let newSearch = q.toString()
    newSearch = newSearch ? '?' + newSearch : ''

    if (newSearch === location.search) {
      // no action for no param change
      return
    }
    history.replace(location.pathname + newSearch + location.hash)
  }

  return [value, setValue]
}

export function useResetURLParams(...keys: Array<string>): () => void {
  const urlPath = joinURL(pathPrefix, useSelector(urlPathSelector))
  const location = useLocation()
  const history = useHistory()

  function resetURLParams(): void {
    if (window.location.pathname !== urlPath) {
      warn(
        'useResetURLParams was called to reset parameters, but location.pathname has changed, aborting',
      )
      return
    }

    if (!keys.length) return history.replace(location.pathname)

    const q = new URLSearchParams(location.search)
    keys.forEach((key) => {
      q.delete(key)
    })

    if (q.sort) q.sort()
    let newSearch = q.toString()
    newSearch = newSearch ? '?' + newSearch : ''

    if (newSearch === location.search) {
      // no action for no param change
      return
    }
    history.replace(location.pathname + newSearch + location.hash)
  }

  return resetURLParams
}
