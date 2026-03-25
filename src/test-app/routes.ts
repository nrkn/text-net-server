import { TextScreen } from '../lib/types.js'
import { parseToken, isValidToken } from '../lib/token.js'
import { SessionStore } from '../lib/session.js'
import { RtrApp } from '../lib/routing/types.js'

import {
  welcomeScreen, newSessionScreen, resumePromptScreen,
  resumeFailScreen, mainScreen, helpScreen,
  savedScreen, quitScreen
} from './views.js'

import { ConnectionState } from '../lib/app/types.js'

export const setupRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
) => {
  app.on('/welcome', (_req, res) => {
    res.send(welcomeScreen())
  })

  app.on('/new', (_req, res) => {
    state.session = sessions.create()
    res.send(newSessionScreen(state.session))
  })

  app.on('/resume', (_req, res) => {
    res.send(resumePromptScreen())
  })

  app.on('/resume/:token', (req, res) => {
    const token = parseToken(req.params.token)

    if (!isValidToken(token)) {
      res.send(resumeFailScreen())
      return
    }

    const session = sessions.get(token)

    if (!session) {
      res.send(resumeFailScreen())
      return
    }

    state.session = session
    res.redirect('/main')
  })

  app.on('/main', (_req, res) => {
    res.send(mainScreen(state.session!))
  })

  app.on('/help', (_req, res) => {
    res.send(helpScreen())
  })

  app.on('/save', (_req, res) => {
    sessions.save(state.session!)
    res.send(savedScreen())
  })

  app.on('/quit', (_req, res) => {
    state.quit = true
    res.send(quitScreen())
  })
}
