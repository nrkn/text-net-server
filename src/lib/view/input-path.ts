import { InputResponse } from './types.js'
import { isRecord } from '../util.js'

export const input = (path: string): InputResponse => ({ type: 'input', path })

export const isInputResponse = (value: unknown): value is InputResponse =>
  isRecord(value) &&
  value.type === 'input' &&
  typeof value.path === 'string'
