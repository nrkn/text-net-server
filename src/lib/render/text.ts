import { MAX_COLS } from '../const.js'
import { Menu, MenuItem, TextScreen } from '../view/types.js'
import { MapMono } from '../types.js'
import { id } from '../util.js'

// # strings

// uppercase and strip anything outside level 0 charset
export const sanitizeOutput = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9 .,:\-]/g, '')

// wrap a string to MAX_COLS, breaking on spaces where possible
export const wrapText = (text: string, cols = MAX_COLS): string[] => {
  if (text.length <= cols) return [text]

  const lines: string[] = []

  let remaining = text

  while (remaining.length > cols) {
    let breakAt = remaining.lastIndexOf(' ', cols)

    if (breakAt <= 0) breakAt = cols

    lines.push(remaining.slice(0, breakAt))

    remaining = remaining.slice(breakAt).trimStart()
  }

  if (remaining) lines.push(remaining)

  return lines
}

// # sanitize helpers

const sanitizeMenuItem = ([s, l, p]: MenuItem): MenuItem =>
  [sanitizeOutput(s), sanitizeOutput(l), p]

const sanitizeMenu = (menu: Menu): Menu => ({
  title: sanitizeOutput(menu.title),
  items: menu.items.map(sanitizeMenuItem)
})

type MapCommand = (cmd: string, other: string, path: string) => string

// format a menu block from [short, long] pairs
export const menuToLines = (
  { title, items }: Menu,
  mapTitle: MapMono = id,
  mapShort: MapCommand = id,
  mapLong: MapCommand = id
) => {
  const lines = [mapTitle(title)]

  for (const [short, long, path] of items)
    lines.push(`${mapShort(short, long, path)} ${mapLong(long, short, path)}`)

  lines.push('')

  return lines
}

// # table layout

const allocateWidths = (
  naturalWidths: number[], maxCols: number
): number[] => {
  const n = naturalWidths.length
  const total = naturalWidths.reduce((a, b) => a + b, 0)

  if (total <= maxCols) return [...naturalWidths]

  const widths = new Array(n).fill(0)
  const flexible = new Array(n).fill(true)

  let available = maxCols
  let numFlex = n

  // lock columns that fit within their fair share
  let changed = true

  while (changed) {
    changed = false
    const share = Math.floor(available / numFlex)

    for (let c = 0; c < n; c++) {
      if (!flexible[c]) continue
      if (naturalWidths[c] <= share) {
        widths[c] = naturalWidths[c]
        flexible[c] = false
        available -= naturalWidths[c]
        numFlex--
        changed = true
      }
    }
  }

  // distribute remaining space among overflowing columns
  if (numFlex > 0) {
    const share = Math.floor(available / numFlex)

    let remainder = available - share * numFlex

    for (let c = 0; c < n; c++) {
      if (!flexible[c]) continue
      widths[c] = share + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
    }
  }

  // floor of 1 per column so wrap() never gets 0
  for (let c = 0; c < n; c++) {
    if (widths[c] < 1) widths[c] = 1
  }

  return widths
}

const tableToLines = (rows: string[][]): string[] => {
  if (rows.length === 0) return ['']

  const lines: string[] = []
  const colCount = Math.max(...rows.map(r => r.length))

  if (colCount === 0) return ['']

  // sanitize cells and compute natural widths
  const sanitizedRows = rows.map(row =>
    row.map(cell => sanitizeOutput(cell))
  )

  const naturalWidths: number[] = []

  for (let c = 0; c < colCount; c++) {
    naturalWidths.push(
      Math.max(...sanitizedRows.map(r => (r[c] ?? '').length))
    )
  }

  const colWidths = allocateWidths(naturalWidths, MAX_COLS)

  for (const row of sanitizedRows) {
    const wrappedCells: string[][] = []

    for (let c = 0; c < colCount; c++) {
      const cell = row[c] ?? ''

      wrappedCells.push(wrapText(cell, colWidths[c]))
    }

    const maxLines = Math.max(...wrappedCells.map(w => w.length))

    for (let l = 0; l < maxLines; l++) {
      let line = ''

      for (let c = 0; c < colCount; c++) {
        const cellLine = wrappedCells[c][l] ?? ''

        line += c < colCount - 1
          ? cellLine.padEnd(colWidths[c])
          : cellLine
      }

      lines.push(line)
    }
  }

  lines.push('')

  return lines
}

// flatten structured screen parts to plain lines
export const renderText = (screen: TextScreen): string[] => {
  const lines: string[] = []

  for (const part of screen.parts) {
    if (part.type === 'paragraph') {
      for (const line of part.lines) {
        lines.push(...wrapText(sanitizeOutput(line)))
      }

      lines.push('')
    } else if (part.type === 'table') {
      lines.push(...tableToLines(part.rows))
    } else if (part.type === 'meta') {
      continue
    } else if (part.type === 'menu') {
      lines.push(
        ...menuToLines(sanitizeMenu(part.menu)).flatMap(l => wrapText(l))
      )
    } else {
      throw Error(`Unknown screen part type: ${(part as any).type}`)
    }
  }

  return lines
}
