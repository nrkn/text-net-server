import { TextScreen } from '../view/types.js'
import { sanitizeInput, splitCommand, maybe } from '../util.js'
import { screenToLines, join } from '../output.js'
import { SessionStore } from '../session.js'
import { createRouter } from '../routing/index.js'
import { createConnectionState } from './connection-state.js'
import { isValidToken, parseToken, formatToken } from '../token.js'
import { SetupRoutes } from './types.js'

const SESSION_PATH_KEY = '_path'

export const createStatelessHandler = (
  setupRoutes: SetupRoutes,
  sessions: SessionStore,
  startPath = '/'
) => {
  const handle = (args: string[]): string => {
    const state = createConnectionState()
    const output: string[] = []

    let captured: TextScreen | undefined
    let lastPath = ''

    const sendScreen = (screen: TextScreen) => { captured = screen }
    const redirect = (path: string) => {
      lastPath = path
      app.dispatch(path)
    }

    const app = createRouter<TextScreen>(sendScreen, redirect)

    setupRoutes(app, state, sessions)

    const dispatchTo = (path: string) => {
      lastPath = path
      captured = undefined
      app.dispatch(path)
    }

    // parse args: [token] [command...]
    let currentPath = startPath
    let command = ''

    if (args.length > 0) {
      const maybeToken = parseToken(args[0])

      if (isValidToken(maybeToken)) {
        const session = sessions.get(maybeToken)

        if (session) {
          state.session = session
          currentPath = (session.data[SESSION_PATH_KEY] as string) || startPath
          command = args.slice(1).join(' ')
        } else {
          return 'SESSION NOT FOUND'
        }
      } else {
        command = args.join(' ')
      }
    }

    // dispatch to current path to get the screen
    dispatchTo(currentPath)

    if (!captured) return 'ERROR'

    // if command provided, interpret against current screen
    if (command) {
      const input = sanitizeInput(command)
      const cmd = splitCommand(input)

      if (cmd) {
        const { response } = captured
        let nextPath = ''

        if (response.type === 'menu') {
          const item = response.menu.items.find(
            ([short, long]) => cmd.name === short || cmd.name === long
          )

          if (item) nextPath = item[2]
        }

        if (response.type === 'input') {
          nextPath = response.path.replace(/:(\w+)/, input.trim())
        }

        if (nextPath) {
          dispatchTo(nextPath)
          if (!captured) return 'ERROR'

          // chain: menu led to input screen with remaining args
          if (cmd.args.length > 0 && captured.response.type === 'input') {
            const fill = sanitizeInput(cmd.args.join(' ')).trim()
            if (fill) {
              dispatchTo(captured.response.path.replace(/:(\w+)/, fill))
              if (!captured) return 'ERROR'
            }
          }
        } else {
          return 'INVALID COMMAND'
        }
      }
    }

    // echo token on new session creation
    if (state.session && !args.some(a => isValidToken(parseToken(a)))) {
      output.push('SESSION ' + formatToken(state.session.token))
      output.push('')
    }

    // save session with current path - reset on end response, to prevent 
    // getting stuck on the end screen after disconnecting and reconnecting
    // with the same token
    if (maybe(state.session)) {
      state.session.data[SESSION_PATH_KEY] =
        captured.response.type === 'end' ? startPath : lastPath
      sessions.save(state.session)
    }

    output.push(...screenToLines(captured))

    return join(output)
  }

  return handle
}
