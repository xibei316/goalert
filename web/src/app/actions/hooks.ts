import { warn } from '../util/debug'
import joinURL from '../util/joinURL'
import { pathPrefix } from '../env'
import { useHistory, useLocation } from 'react-router-dom'
import { sanitizeParam } from './main'

export type Value = string | boolean | number | string[]

function useGetURLParamValue(
  name: string,
  _default: string | boolean | number | string[] | null = null,
): string | boolean | number | string[] | null {
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  if (!params.has(name)) return _default

  if (Array.isArray(_default)) return params.getAll(name)
  if (typeof _default === 'boolean') return Boolean(params.get(name))
  if (typeof _default === 'number') return +(params.get(name) as string) // already checked .has()

  return params.get(name)
}

export function useURLParam<T extends Value>(
  name: string,
  defaultValue: T,
): [T, (newValue: T) => void] {
  const location = useLocation()
  const history = useHistory()
  const value = useGetURLParamValue(name, defaultValue) as T
  const urlPath = joinURL(pathPrefix, location.pathname)

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
  const location = useLocation()
  const history = useHistory()
  const urlPath = joinURL(pathPrefix, location.pathname)

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
