import { createRouter } from '../routing/index.js'
import { SessionStore } from '../session.js'
import { isValidToken } from '../token.js'
import { HttpRequest, HttpResponse } from '../transport/http.js'
import { TextScreen } from '../view/types.js'
import { sanitizeInput, maybe } from '../util.js'
import { createConnectionState } from './connection-state.js'
import { SetupRoutes } from './types.js'

const TOKEN_PREFIX_RE = /^\/([A-HJ-NP-Z2-9]{16})(\/.*)?$/

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  ...CORS_HEADERS,
}

const jsonError = (status: number, error: string): HttpResponse => ({
  status,
  headers: jsonHeaders,
  body: JSON.stringify({ error, status }),
})

const parseJsonBody = (body: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(body)

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
      return parsed

    return null
  } catch {
    return null
  }
}

export const createJsonRequestHandler = (
  setupRoutes: SetupRoutes, sessions: SessionStore, startPath = '/',
  onTokenPath = '/main'
) => {
  const handleRequest = (req: HttpRequest): HttpResponse => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: CORS_HEADERS, body: '' }
    }

    const json = req.method === 'POST' ? parseJsonBody(req.body) : null

    let path = req.path
    let tokenPrefix = ''

    const state = createConnectionState()

    // extract token prefix from path: /<TOKEN>/subpath
    const match = path.match(TOKEN_PREFIX_RE)

    if (match) {
      const token = match[1]

      if (!isValidToken(token)) return jsonError(404, 'NOT FOUND')

      const session = sessions.get(token)

      if (!session) return jsonError(404, 'SESSION NOT FOUND')

      state.session = session
      tokenPrefix = '/' + token
      path = match[2] || onTokenPath
    }

    // apply json input to path using server-tracked input path
    if (req.method === 'POST' && json && typeof json.input === 'string') {
      const input = sanitizeInput(json.input).trim()

      if (input && state.session) {
        const inputPath = state.session.data._inputPath as string | undefined
        if (inputPath) {
          path = inputPath.replace(/:(\w+)/, encodeURIComponent(input))
        } else {
          path = path + '/' + encodeURIComponent(input)
        }
      }
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
      return jsonError(404, 'NOT FOUND')
    }

    // auto-save on dirty
    if (maybe(state.session) && state.session.dirty) {
      sessions.save(state.session)
    }

    // set tokenPrefix from newly created session (e.g. /new)
    if (state.session && !tokenPrefix) {
      tokenPrefix = '/' + state.session.token
    }

    if (!captured) return jsonError(500, 'ERROR')

    const result = captured as TextScreen

    // track input path in session for next POST
    if (result.response.type === 'input' && state.session) {
      state.session.data._inputPath = result.response.path
      state.session.dirty = true
      sessions.save(state.session)
    }

    const token = state.session?.token ?? undefined

    return {
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ parts: result.parts, response: result.response, token }),
    }
  }

  return handleRequest
}
