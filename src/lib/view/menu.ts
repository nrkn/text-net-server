import { MenuItem, Menu } from './types.js'
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

export const isMenu = (value: unknown): value is Menu =>
  isRecord(value) &&
  typeof value.title === 'string' &&
  Array.isArray(value.items) &&
  value.items.every(isMenuItem)
