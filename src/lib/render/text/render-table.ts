import { MAX_COLS } from '../../const.js'
import { sanitizeOutput, wrapText } from './text-util.js'

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

export const tableToLines = (
  rows: string[][], cols = MAX_COLS,
  cellMapper = sanitizeOutput
): string[] => {
  if (rows.length === 0) return ['']

  const lines: string[] = []
  const colCount = Math.max(...rows.map(r => r.length))

  if (colCount === 0) return ['']

  // map cells and compute natural widths
  const sanitizedRows = rows.map(row =>
    row.map(cell => cellMapper(cell))
  )

  const naturalWidths: number[] = []

  for (let c = 0; c < colCount; c++) {
    naturalWidths.push(
      Math.max(...sanitizedRows.map(r => (r[c] ?? '').length))
    )
  }

  const colWidths = allocateWidths(naturalWidths, cols)

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

        line += (
          c < colCount - 1
            ? cellLine.padEnd(colWidths[c])
            : cellLine
        )
      }

      lines.push(line)
    }
  }

  lines.push('')

  return lines
}
