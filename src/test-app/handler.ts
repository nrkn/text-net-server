import { createStreamHandler } from '../lib/app/create-stream-handler.js'
import { setupRoutes } from './routes.js'
import { sessions } from './sessions.js'

export const createAppStreamHandler = async () => {
  await sessions.load()

  return createStreamHandler(setupRoutes, sessions, '/welcome')
}
