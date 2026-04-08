import {
  mkdirSync, createWriteStream, existsSync, createReadStream, writeFileSync,
  readFileSync, renameSync
} from 'node:fs'

import { join } from 'node:path'

import { Log, ReplayHandler, Reducer } from './types.js'
import { createInterface } from 'node:readline'

export const createLog = (dir: string, name: string): Log => {
  mkdirSync(dir, { recursive: true })

  const logFile = join(dir, `${name}.log`)
  const snapshotFile = join(dir, `${name}.snapshot.json`)

  let stream = createWriteStream(logFile, { flags: 'a', encoding: 'utf8' })

  const append = (payload: string, ts = Date.now()) => {
    stream.write(`${ts} ${payload}\n`)
  }

  const appendJSON = (data: unknown, ts = Date.now()) => {
    stream.write(`${ts} ${JSON.stringify(data)}\n`)
  }

  const flush = () =>
    new Promise<void>((resolve, reject) => {
      stream.write('', err => (err ? reject(err) : resolve()))
    })

  const replay = async (handler: ReplayHandler) => {
    await flush()

    if (!existsSync(logFile)) {
      throw Error(`log file does not exist: "${logFile}"`)
    }

    const rl = createInterface({
      input: createReadStream(logFile)
    })

    for await (const line of rl) {
      const i = line.indexOf(' ')

      if (i === -1) {
        console.warn(`skipping malformed log line: "${line}"`)

        continue
      }

      const ts = Number(line.slice(0, i))

      if (!Number.isFinite(ts)) {
        console.warn(`skipping log line with invalid timestamp: "${line}"`)

        continue
      }

      const payload = line.slice(i + 1)

      try {
        handler({ ts, data: payload })
      } catch (err: unknown) {
        // skip corrupted entries
        console.warn(`skipping log line that caused error: "${line}"`)
        console.error(err)
      }
    }
  }

  const replayReduce = async <State>(
    initial: State,
    reduce: Reducer<State>
  ) => {
    let state = initial

    await replay(entry => {
      state = reduce(state, entry)
    })

    return state
  }

  const writeSnapshot = (state: unknown) => {
    writeFileSync(snapshotFile, JSON.stringify(state))
  }

  const readSnapshot = <T>() => {
    if (!existsSync(snapshotFile)) return null
    return JSON.parse(readFileSync(snapshotFile, 'utf8')) as T
  }

  const compact = () => {
    stream.close()

    const archive = `${logFile}.${Date.now()}`
    if (existsSync(logFile)) renameSync(logFile, archive)

    stream = createWriteStream(logFile, { flags: 'a', encoding: 'utf8' })
  }

  const close = () => {
    stream.close()
  }

  return {
    append,
    appendJSON,
    replay,
    replayReduce,
    writeSnapshot,
    readSnapshot,
    compact,
    close
  }
}