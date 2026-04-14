import { Writable } from 'node:stream'
import { TextScreen } from '../view/types.js'
import { sanitizeInput, splitCommand } from '../util.js'
import { renderText } from '../render/text/render-text.js'
import { send, sendScreenLines } from '../output.js'
import { CRLF } from '../const.js'
import { SessionStore } from '../session.js'
import { createRouter } from '../routing/create-router.js'
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

    const lines = renderText(screen)

    if (screen.response.type === 'end') {
      send(stream, lines)
    } else {
      sendScreenLines(stream, lines)
    }
  }

  const redirect = (path: string) => {
    return app.dispatch(path)
  }

  const autoSave = () => {
    if (maybe(state.session) && state.session.dirty) {
      sessions.save(state.session)
    }
  }

  const dispatchTo = async (path: string) => {
    await app.dispatch(path)
    autoSave()
    return currentScreen.response.type === 'end'
  }

  const app = createRouter<TextScreen>(sendScreen, redirect)

  setupRoutes(app, state, sessions)

  // initial navigation - use an IIFE to handle the async dispatch
  let pending: Promise<void> = dispatchTo(startPath).then(isEnd => {
    if (isEnd) close()
  })

  const handleResponse = async (line: string) => {
    const input = sanitizeInput(line)

    // echo input back for clients without local echo
    stream.write(input + CRLF + CRLF)

    const cmd = splitCommand(input)

    // blank -> re-render
    if (!cmd) {
      sendScreenLines(stream, renderText(currentScreen))
      return
    }

    const { response } = currentScreen

    // menu navigation
    if (response.type === 'menu') {
      const item = response.menu.items.find(
        ([short, long]) => cmd.name === short || cmd.name === long
      )

      if (item) {
        if (await dispatchTo(item[2])) close()
        return
      }
    }

    // freeform input
    if (response.type === 'input') {
      const path = response.path.replace(/:(\w+)/, input.trim())
      if (await dispatchTo(path)) close()
      return
    }

    // no match
    send(stream, ['', 'INVALID COMMAND'])
    sendScreenLines(stream, renderText(currentScreen))
  }

  // serialize line handling to prevent overlapping async operations
  return (line: string) => {
    pending = pending.then(() => handleResponse(line))
  }
}
