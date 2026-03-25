import { TextScreen } from '../lib/types.js'
import { parseToken, isValidToken } from '../lib/token.js'
import { SessionStore } from '../lib/session.js'
import { RtrApp } from '../lib/routing/types.js'

import {
  welcomeScreen, resumePromptScreen,
  resumeFailScreen, namePromptScreen, tokenScreen,
  mainScreen, helpScreen, quitScreen
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
    res.redirect('/main')
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

  app.on('/setname', (_req, res) => {
    res.send(namePromptScreen())
  })

  app.on('/name/:name', (req, res) => {
    state.session!.name = req.params.name.trim()
    state.session!.dirty = true
    
    res.redirect('/main')
  })

  app.on('/token', (_req, res) => {
    res.send(tokenScreen(state.session!))
  })

  app.on('/help', (_req, res) => {
    res.send(helpScreen())
  })

  app.on('/quit', (_req, res) => {
    state.quit = true
    res.send(quitScreen())
  })
}
