import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Session } from './types.js'
import { generateToken, isValidToken } from './token.js'
import { isRecord } from './util.js'

export const isSession = (value: unknown): value is Session => {
  if (!isRecord(value)) return false
  if (!isValidToken(value.token)) return false
  if (typeof value.name !== 'string') return false
  if (typeof value.created !== 'number') return false
  if (!isRecord(value.data)) return false
  if (typeof value.dirty !== 'boolean') return false

  return true
}

export type SessionStore = {
  create: () => Session
  get: (token: string) => Session | null
  save: (session: Session) => Promise<void>
  load: () => Promise<void>
}

export const createSessionStore = (saveDir: string): SessionStore => {
  const sessions = new Map<string, Session>()

  let loaded = false

  const create = (): Session => {
    if (!loaded) {
      throw Error('Sessions must be loaded first')
    }

    let token = generateToken()

    while (sessions.has(token)) token = generateToken()

    const session: Session = {
      token,
      name: '',
      created: Date.now(),
      data: {},
      dirty: false,
    }

    sessions.set(token, session)

    return session
  }

  const get = (token: string) => sessions.get(token) ?? null

  const save = async (session: Session) => {
    if (!isSession(session)) throw Error('Invalid session object')

    await mkdir(saveDir, { recursive: true })

    const file = join(saveDir, `${session.token}.json`)

    await writeFile(file, JSON.stringify(session), 'utf-8')

    session.dirty = false
  }

  const load = async () => {
    try {
      await mkdir(saveDir, { recursive: true })

      const files = await readdir(saveDir)

      for (const file of files) {
        if (!file.endsWith('.json')) {
          throw Error(`Non-json file in sessions directory: ${file}`)
        }

        const raw = await readFile(join(saveDir, file), 'utf-8')

        const session: Session = JSON.parse(raw)

        if (!isSession(session)) {
          throw Error(`Invalid session data in file: ${file}`)
        }

        sessions.set(session.token, session)
      }
    } catch (err) {
      sessions.clear()

      console.warn('Failed to load sessions, clearing any existing sessions')

      throw err
    }

    loaded = true
  }

  return { create, get, save, load }
}
