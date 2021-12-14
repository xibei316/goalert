export const SET_SHOW_NEW_USER_FORM = 'SET_SHOW_NEW_USER_FORM'

export const sanitizeParam = (value) => {
  if (value === true) value = '1' // explicitly true
  if (!value) value = '' // any falsey value
  if (!Array.isArray(value)) return value.trim()

  const filtered = value.filter((v) => v)
  if (filtered.length === 0) return null

  return filtered
}

export function setShowNewUserForm(search) {
  return {
    type: SET_SHOW_NEW_USER_FORM,
    payload: search,
  }
}
