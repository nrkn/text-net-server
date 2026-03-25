import { startHttp } from '../lib/transport/http.js'
import { setupRoutes } from './routes.js'
import { createHttpRequestHandler } from '../lib/app/create-http-handler.js'
import { sessions } from './sessions.js'

const PORT = parseInt(process.env.PORT ?? '8080', 10)

const handleRequest = createHttpRequestHandler(
  setupRoutes, sessions, '/welcome'
)

const start = async () => {
  await sessions.load()

  startHttp(PORT, handleRequest)
}

start().catch(console.error)
