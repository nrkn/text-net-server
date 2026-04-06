import { MapMono } from '../../types.js'
import { id } from '../../util.js'
import { Menu, MenuItem } from '../../view/types.js'
import { sanitizeOutput } from './text-util.js'

// # sanitize helpers

const sanitizeMenuItem = ([s, l, p]: MenuItem): MenuItem =>
  [sanitizeOutput(s), sanitizeOutput(l), p]

export const sanitizeMenu = (menu: Menu): Menu => ({
  title: sanitizeOutput(menu.title),
  items: menu.items.map(sanitizeMenuItem)
})

type MapCommand = (cmd: string, other: string, path: string) => string

// format a menu block from [short, long] pairs
export const menuToLines = (
  { title, items }: Menu,
  mapTitle: MapMono = id,
  mapShort: MapCommand = id,
  mapLong: MapCommand = id,
  shortLongSep = ' '
) => {
  const lines = [mapTitle(title)]

  for (const [short, long, path] of items) {
    const s = mapShort(short, long, path)
    const l = mapLong(long, short, path)

    lines.push(s + shortLongSep + l)
  }

  lines.push('')

  return lines
}
