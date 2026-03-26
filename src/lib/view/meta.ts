import { isRecord } from '../util.js'
import { MetaPart } from './types.js'

export const meta = (meta: Record<string, unknown>) => ({ type: 'meta', meta })

export const isMeta = (value: unknown): value is MetaPart =>
  isRecord(value) &&
  value.type === 'meta' &&
  isRecord(value.meta)
  