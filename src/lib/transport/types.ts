import { Writable } from 'node:stream'

export type LineHandler = (line: string) => void | Promise<void>

export type CreateHandler = (
  stream: Writable, close: () => void
) => LineHandler
