import { createStreamHandler } from '../lib/app/create-stream-handler.js'
import { createSessionStore } from '../lib/session.js'
import { setupRoutes } from './routes.js'

const sessions = createSessionStore('data/sessions')

export const createAppStreamHandler = async () => {
  await sessions.load()

  return createStreamHandler(setupRoutes, sessions, '/welcome')
}
