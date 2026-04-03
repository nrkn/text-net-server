import { TextScreen } from '../lib/view/types.js'
import { parseToken, isValidToken, formatToken } from '../lib/token.js'
import { SessionStore } from '../lib/session.js'
import { RtrApp } from '../lib/routing/types.js'
import { ConnectionState } from '../lib/app/types.js'
import { useStaticRoutes, loadStaticScreen } from '../lib/static/middleware.js'
import { maybe } from '../lib/util.js'

const STATIC_DIR = 'data/test-app/static'

export const setupRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
) => {
  app.use((_req, _res, next) => {
    if (maybe(state.session))
      state.session.data._formattedToken = formatToken(state.session.token)

    next()
  })

  useStaticRoutes(app, STATIC_DIR, () => state.session)

  app.on('/new', (_req, res) => {
    state.session = sessions.create()
    res.redirect('/main')
  })

  app.on('/resume/:token', (req, res) => {
    const token = parseToken(req.params.token)

    if (!isValidToken(token)) {
      res.send(loadStaticScreen('_resume-fail', STATIC_DIR, state.session))
      return
    }

    const session = sessions.get(token)

    if (!session) {
      res.send(loadStaticScreen('_resume-fail', STATIC_DIR, state.session))
      return
    }

    state.session = session
    res.redirect('/main')
  })

  app.on('/name/:name', (req, res) => {
    state.session!.name = req.params.name.trim()
    state.session!.dirty = true

    res.redirect('/main')
  })
}
