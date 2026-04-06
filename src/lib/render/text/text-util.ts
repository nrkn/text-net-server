import { MAX_COLS } from '../../const.js'

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
