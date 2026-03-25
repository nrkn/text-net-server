import { Writable } from 'node:stream'
import { TextScreen } from '../types.js'
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
    sendScreenLines(stream, screen.lines)
  }

  const redirect = (path: string) => {
    app.dispatch(path)
  }

  const autoSave = () => {
    if (maybe(state.session) && state.session.dirty) {
      sessions.save(state.session)
    }
  }

  const app = createRouter<TextScreen>(sendScreen, redirect)

  setupRoutes(app, state, sessions)

  // initial navigation
  app.dispatch(startPath)
  autoSave()

  const handleLine = (line: string) => {
    const input = sanitizeInput(line)
    const cmd = splitCommand(input)

    // blank → re-render
    if (!cmd) {
      sendScreenLines(stream, currentScreen.lines)
      return
    }

    // menu navigation
    if (currentScreen.menu) {
      const item = currentScreen.menu.items.find(
        ([short, long]) => cmd.name === short || cmd.name === long
      )

      if (item) {
        app.dispatch(item[2])
        autoSave()
        if (state.quit) close()
        return
      }
    }

    // freeform input
    if (currentScreen.inputPath) {
      const path = currentScreen.inputPath.replace(/:(\.+)/, input.trim())
      app.dispatch(path)
      autoSave()
      if (state.quit) close()
      return
    }

    // no match
    send(stream, ['', 'INVALID COMMAND'])
    sendScreenLines(stream, currentScreen.lines)
  }

  return handleLine
}
