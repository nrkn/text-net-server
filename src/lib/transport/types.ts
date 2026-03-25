import { Writable } from 'node:stream'

export type LineHandler = (line: string) => void

export type CreateHandler = (
  stream: Writable, close: () => void
) => LineHandler
