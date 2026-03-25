import { InputPath } from './types.js'
import { isRecord } from '../util.js'

export const input = (inputPath: string): InputPath => ({ inputPath })

export const isInputPath = (value: unknown): value is InputPath => {
  if (!isRecord(value)) return false
  if (typeof value.inputPath !== 'string') return false

  return true
}
