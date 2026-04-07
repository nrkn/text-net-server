import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { RtrApp } from '../routing/types.js'
import { SessionStore } from '../session.js'
import { Maybe, Session } from '../types.js'
import { TextScreen } from '../view/types.js'
import { parseToken, isValidToken, formatToken } from '../token.js'
import { loadStaticScreen } from '../static/middleware.js'
import { maybe } from '../util.js'
import { ConnectionState } from './types.js'

const DEFAULT_DIR = 'data/session/static'

export type SessionRoutesOptions = {
  staticDir?: string
  mainPath?: string
}

const resolveDir = (name: string, consumerDir?: string): string => {
  if (consumerDir && existsSync(join(consumerDir, `${name}.txt`))) {
    return consumerDir
  }

  return DEFAULT_DIR
}

const resolveScreen = (
  name: string, session: Maybe<Session>, consumerDir?: string
): TextScreen =>
  loadStaticScreen(name, resolveDir(name, consumerDir), session)

const SESSION_ROUTES = ['welcome', 'resume', 'token', 'quit', 'setname']

export const useSessionRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
  options: SessionRoutesOptions = {},
) => {
  const { staticDir, mainPath = '/main' } = options

  app.use((_req, _res, next) => {
    if (maybe(state.session))
      state.session.data._formattedToken = formatToken(state.session.token)

    next()
  })

  for (const name of SESSION_ROUTES) {
    const route = '/' + name

    app.on(route, (_req, res) => {
      res.send(resolveScreen(name, state.session, staticDir))
    })
  }

  app.on('/new', (_req, res) => {
    state.session = sessions.create()
    res.redirect(mainPath)
  })

  app.on('/resume/:token', (req, res) => {
    const token = parseToken(req.params.token)

    if (!isValidToken(token)) {
      res.send(resolveScreen('_resume-fail', state.session, staticDir))
      return
    }

    const session = sessions.get(token)

    if (!session) {
      res.send(resolveScreen('_resume-fail', state.session, staticDir))
      return
    }

    state.session = session
    res.redirect(mainPath)
  })

  app.on('/name/:name', (req, res) => {
    state.session!.name = req.params.name.trim()
    state.session!.dirty = true

    res.redirect(mainPath)
  })
}
