import { MenuItem, Menu } from '../types.js'
import { isRecord } from '../util.js'

export const menu = (
  title: string, ...items: MenuItem[]
): Menu => ({ title, items })

const isMenuItem = (value: unknown): value is MenuItem =>
  Array.isArray(value) &&
  value.length === 3 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string' &&
  typeof value[2] === 'string'

export const isMenu = (value: unknown): value is Menu => {
  if (!isRecord(value)) return false
  if (typeof value.title !== 'string') return false
  if (!Array.isArray(value.items)) return false
  if (!value.items.every(isMenuItem)) return false

  return true
}
