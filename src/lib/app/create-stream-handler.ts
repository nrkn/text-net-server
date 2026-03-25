import { Writable } from 'node:stream'
import { TextScreen } from '../view/types.js'
import { sanitizeInput, splitCommand } from '../util.js'
import { send, sendScreenLines } from '../output.js'
import { SessionStore } from '../session.js'
import { createRouter } from '../routing/index.js'
import { createConnectionState } from './connection-state.js'
import { SetupRoutes } from './types.js'
import { maybe } from '../util.js'

export const createStreamHandler = (
  setupRoutes: SetupRoutes,
  sessions: SessionStore,
  startPath = '/'
) => (stream: Writable, close: () => void) => {
  const state = createConnectionState()

  let currentScreen: TextScreen

  const sendScreen = (screen: TextScreen) => {
    currentScreen = screen

    if (screen.response[0] === 'END') {
      send(stream, screen.lines)
    } else {
      sendScreenLines(stream, screen.lines)
    }
  }

  const redirect = (path: string) => {
    app.dispatch(path)
  }

  const autoSave = () => {
    if (maybe(state.session) && state.session.dirty) {
      sessions.save(state.session)
    }
  }

  const dispatchTo = (path: string) => {
    app.dispatch(path)
    autoSave()
    return currentScreen.response[0] === 'END'
  }

  const app = createRouter<TextScreen>(sendScreen, redirect)

  setupRoutes(app, state, sessions)

  // initial navigation
  if (dispatchTo(startPath)) {
    close()
    return () => {}
  }

  const handleResponse = (line: string) => {
    const input = sanitizeInput(line)
    const cmd = splitCommand(input)

    // blank → re-render
    if (!cmd) {
      sendScreenLines(stream, currentScreen.lines)
      return
    }

    const [kind, arg] = currentScreen.response

    // menu navigation
    if (kind === 'MENU') {
      const item = arg.items.find(
        ([short, long]) => cmd.name === short || cmd.name === long
      )

      if (item) {
        if (dispatchTo(item[2])) close()
        return
      }
    }

    // freeform input
    if (kind === 'INPUT') {
      const path = arg.replace(/:(\w+)/, input.trim())
      if (dispatchTo(path)) close()
      return
    }

    // no match
    send(stream, ['', 'INVALID COMMAND'])
    sendScreenLines(stream, currentScreen.lines)
  }

  return handleResponse
}
