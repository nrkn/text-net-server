import { startHttp } from '../lib/transport/http.js'
import { createSessionStore } from '../lib/session.js'
import { setupRoutes } from './routes.js'
import { createHttpRequestHandler } from '../lib/app/create-http-handler.js'

const PORT = parseInt(process.env.PORT ?? '8080', 10)

const sessions = createSessionStore('data/sessions')

const handleRequest = createHttpRequestHandler(
  setupRoutes, sessions, '/welcome'
)

const start = async () => {
  await sessions.load()

  startHttp(PORT, handleRequest)
}

start().catch(console.error)
