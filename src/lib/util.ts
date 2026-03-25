import { Maybe, Command } from './types.js'
import { MAX_INPUT } from './const.js'

export const maybe = <T>(value: Maybe<T>): value is T =>
  value !== null && value !== undefined

export const expect = <T>(
  value: Maybe<T>, message = 'Expected value to be defined'
): T => {
  if (maybe(value)) return value

  throw Error(message)
}

// strip control chars < 32 except CR/LF, cap length
export const sanitizeInput = (raw: string) =>
  raw.replace(/[^\x20-\x7E\r\n]/g, '').slice(0, MAX_INPUT)

// trim, collapse whitespace, uppercase - for command parsing only
export const normalizeInput = (s: string) =>
  s.trim().replace(/\s+/g, ' ').toUpperCase()

// strip spaces, hyphens etc and uppercase for token comparison
export const normalizeToken = (s: string) =>
  s.replace(/[\s\-]/g, '').toUpperCase()

// split normalized input into command name + args, null on empty
export const splitCommand = (input: string): Command | null => {
  const normalized = normalizeInput(input)

  if (!normalized) return null

  const [name, ...args] = normalized.split(' ')

  return { name, args }
}

export const isRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
