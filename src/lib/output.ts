import { Writable } from 'node:stream'
import { CRLF, MAX_COLS, PROMPT } from './const.js'
import { Menu, TextScreen } from './view/types.js'
import { MapMono } from './types.js'
import { id } from './util.js'

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

// flatten structured screen parts to plain lines
export const screenToLines = (screen: TextScreen): string[] => {
  const lines: string[] = []

  for (const part of screen.parts) {
    if (part.type === 'text') {
      lines.push(...part.lines)
    } else if (part.type === 'meta') {
      continue
    } else if (part.type === 'menu') {
      lines.push(...menuToLines(part.menu).flatMap(l => wrapText(l)))
    } else {
      throw Error(`Unknown screen part type: ${(part as any).type}`)
    }
  }

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
