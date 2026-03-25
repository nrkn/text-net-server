import { Writable } from 'node:stream'
import { CRLF, MAX_COLS, PROMPT } from './const.js'
import { Menu } from './view/types.js'

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

export const blank = (n = 1) => Array<string>(n).fill('')

export const join = (lines: string[]) => lines.join(CRLF)

// format a menu block from [short, long] pairs
export const menuToLines = (
  { title, items }: Menu
) => {
  const lines = [title, '']

  for (const [short, long] of items)
    lines.push(`${short} ${long}`)

  return lines
}

// # streams

export const send = (stream: Writable, lines: string[]) => {
  stream.write(join(lines) + CRLF)
}

export const sendPrompt = (stream: Writable) => {
  stream.write(CRLF + PROMPT)
}

export const sendScreenLines = (stream: Writable, lines: string[]) => {
  send(stream, lines)
  sendPrompt(stream)
}
