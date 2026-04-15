import { TextScreen } from '../lib/view/types.js'
import { SessionStore } from '../lib/session.js'
import { RtrApp } from '../lib/routing/types.js'
import { ConnectionState } from '../lib/app/types.js'
import { useStaticRoutes } from '../lib/static/middleware.js'
import { useSessionRoutes } from '../lib/app/session-routes.js'
import { mount } from '../lib/app/mount.js'
import { setupNotesRoutes } from './notes.js'
import { setupGameRoutes } from './game.js'
import { setupPvzRoutes } from './pvz.js'

const STATIC_DIR = 'data/test-app/static'

export const setupRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
) => {
  useSessionRoutes(app, state, sessions)

  useStaticRoutes(app, STATIC_DIR, () => state.session)

  mount(app, state, sessions, '/notes', setupNotesRoutes, {
    dataKey: 'notes',
    returnPath: '/main',
  })

  mount(app, state, sessions, '/game', setupGameRoutes, {
    dataKey: 'game',
    returnPath: '/main',
  })

  mount(app, state, sessions, '/pvz', setupPvzRoutes, {
    dataKey: 'pvz',
    returnPath: '/main',
  })
}
