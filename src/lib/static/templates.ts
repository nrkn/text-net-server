import { Maybe, Session } from '../types.js'
import { maybe } from '../util.js'

const TAG_RE = /\{\{([^}]+)\}\}/g

const getDeep = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('/')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined

    current = (current as Record<string, unknown>)[part]
  }

  return current
}

export const resolveTemplates = (
  text: string, session: Maybe<Session>
): string =>
  text.replace(TAG_RE, (_match, inner: string) => {
    const trimmed = inner.trim()

    // {{/path}} or {{/path fallback}} — session.data deep path
    if (trimmed.startsWith('/')) {
      const spaceIdx = trimmed.indexOf(' ')
      const path = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx)
      const fallback = spaceIdx === -1 ? undefined : trimmed.slice(spaceIdx + 1)

      if (!maybe(session))
        if (fallback !== undefined) return fallback
        else throw Error(`Template {{${trimmed}}}: no session`)

      const value = getDeep(session.data, path)

      if (value === undefined || value === null)
        if (fallback !== undefined) return fallback
        else throw Error(`Template {{${trimmed}}}: key not found in session.data`)

      return String(value)
    }

    // {{key}} or {{key fallback}} — session top-level
    const spaceIdx = trimmed.indexOf(' ')
    const key = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
    const fallback = spaceIdx === -1 ? undefined : trimmed.slice(spaceIdx + 1)

    if (!maybe(session))
      if (fallback !== undefined) return fallback
      else throw Error(`Template {{${trimmed}}}: no session`)

    const value = (session as Record<string, unknown>)[key]

    if (value === undefined || value === null || value === '')
      if (fallback !== undefined) return fallback
      else throw Error(`Template {{${trimmed}}}: key "${key}" not found or empty`)

    return String(value)
  })
