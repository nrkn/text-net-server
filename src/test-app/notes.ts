import { TextScreen } from '../lib/view/types.js'
import { RtrApp } from '../lib/routing/types.js'
import { ConnectionState } from '../lib/app/types.js'
import { useStaticRoutes } from '../lib/static/middleware.js'

const STATIC_DIR = 'data/test-app/notes/static'

export const setupNotesRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState
) => {
  useStaticRoutes(app, STATIC_DIR, () => state.session)

  app.on('/note/:note', (req, res) => {
    state.session!.data.note = req.params.note.trim()
    state.session!.dirty = true

    res.redirect('/main')
  })
}
