import { EndResponse } from './types.js'
import { isRecord } from '../util.js'

export const end = (message: string): EndResponse => ({ type: 'end', message })

export const isEndResponse = (value: unknown): value is EndResponse =>
  isRecord(value) &&
  value.type === 'end' &&
  typeof value.message === 'string'
  