import { TablePart } from './types.js'
import { isRecord } from '../util.js'

export const tab = (...rows: string[][]): TablePart =>
  ({ type: 'table', rows })

export const isTable = (value: unknown): value is TablePart =>
  isRecord(value) &&
  value.type === 'table' &&
  Array.isArray(value.rows) &&
  value.rows.every(Array.isArray)