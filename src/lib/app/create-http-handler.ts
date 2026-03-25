import { renderHtml } from '../render-html.js'
import { createRouter } from '../routing/index.js'
import { SessionStore } from '../session.js'
import { isValidToken } from '../token.js'
import { HttpRequest, HttpResponse, parseFormBody } from '../transport/http.js'
import { TextScreen } from '../types.js'
import { sanitizeInput } from '../util.js'
import { createConnectionState } from './connection-state.js'
import { SetupRoutes } from './types.js'

const TOKEN_PREFIX_RE = /^\/([A-HJ-NP-Z2-9]{16})(\/.*)?$/

const errorPage = (status: number, message: string): HttpResponse => ({
  status,
  body: `<html><body><pre>${message}</pre></body></html>`,
})

export const createHttpRequestHandler = (
  setupRoutes: SetupRoutes, sessions: SessionStore, startPath = '/',
  onTokenPath = '/main'
) => {
  const handleRequest = (req: HttpRequest): HttpResponse => {
    const form = req.method === 'POST' ? parseFormBody(req.body) : {}

    let path = req.path
    let tokenPrefix = ''

    const state = createConnectionState()

    // extract token prefix from path: /<TOKEN>/subpath
    const match = path.match(TOKEN_PREFIX_RE)

    if (match) {
      const token = match[1]

      if (!isValidToken(token)) return errorPage(404, 'NOT FOUND')

      const session = sessions.get(token)

      if (!session) return errorPage(404, 'SESSION NOT FOUND')

      state.session = session
      tokenPrefix = '/' + token
      path = match[2] || onTokenPath
    }

    // append form input to path (for inputPath forms like /resume/:token)
    if (form.input) {
      const input = sanitizeInput(form.input).trim().replace(/\s+/g, '')

      if (input) path = path + '/' + encodeURIComponent(input)
    }

    // default route
    if (path === '/') path = startPath

    // dispatch and capture result
    let captured: TextScreen | null = null

    const sendScreen = (screen: TextScreen) => { captured = screen }
    const redirect = (rpath: string) => { app.dispatch(rpath) }

    const app = createRouter<TextScreen>(sendScreen, redirect)

    setupRoutes(app, state, sessions)

    try {
      app.dispatch(path)
    } catch {
      return errorPage(404, 'NOT FOUND')
    }

    // set tokenPrefix from newly created session (e.g. /new)
    if (state.session && !tokenPrefix) {
      tokenPrefix = '/' + state.session.token
    }

    if (!captured) return errorPage(500, 'ERROR')

    return { status: 200, body: renderHtml(captured, tokenPrefix) }
  }

  return handleRequest
}

