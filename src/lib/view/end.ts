import { EndResponse } from './types.js'

export const end = (message: string): EndResponse => ['END', message]

export const isEndResponse = (value: unknown): value is EndResponse =>
  Array.isArray(value) &&
  value.length === 2 &&
  value[0] === 'END' &&
  typeof value[1] === 'string'
  