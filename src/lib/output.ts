import { Writable } from 'node:stream'
import { CRLF, PROMPT } from './const.js'

export const blank = (n = 1) => Array<string>(n).fill('')

export const join = (lines: string[]) => lines.join(CRLF)

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
