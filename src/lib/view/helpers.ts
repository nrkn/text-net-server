import { MAX_COLS } from '../const.js'
import { blank, wrap } from '../output.js'

export const br = blank()

export const p = (line: string) => [line, ...br]

export const table = (...rows: string[][]): string[] => {
  const lines: string[] = []

  const colCount = Math.max(...rows.map(r => r.length))

  const colWidths: number[] = []

  for (let c = 0; c < colCount - 1; c++) {
    colWidths.push(Math.max(...rows.map(r => (r[c] ?? '').length)))
  }

  for (const row of rows) {
    const parts: string[] = []

    for (let c = 0; c < colCount; c++) {
      const cell = row[c] ?? ''

      if (c < colCount - 1) {
        parts.push(cell.padEnd(colWidths[c]))
      } else {
        const prefix = parts.join('')
        const remaining = MAX_COLS - prefix.length
        const wrapped = wrap(cell, remaining)

        lines.push(prefix + wrapped[0])

        const indent = ' '.repeat(prefix.length)

        for (let i = 1; i < wrapped.length; i++) {
          lines.push(indent + wrapped[i])
        }
      }
    }
  }

  lines.push(...br)

  return lines
}