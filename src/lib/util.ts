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

export const id = <T>(x: T) => x

// numbers

export const assertFinite = (value: number) => {
  if (Number.isFinite(value)) return

  throw Error(`Expected a finite number, saw "${value}"`)
}

export const assertNonZero = (value: number) => {
  assertFinite(value)

  if (value !== 0) return

  throw Error('Expected a non-zero number')
}

export const assertPositive = (value: number) => {
  assertFinite(value)

  if (value >= 0) return

  throw Error(`Expected a positive number, saw "${value}"`)
}

export const assertPositiveInt = (value: number) => {
  assertPositive(value)

  if (Number.isInteger(value)) return

  throw Error(`Expected an integer, saw "${value}"`)
}

export const boolish = (value: number): boolean => value !== 0

export const seq = <T>(length: number, map: (index: number) => T) =>
  Array.from({ length }, (_v, k) => map(k))