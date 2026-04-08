import { createStatelessHandler } from '../lib/app/create-stateless-handler.js'
import { setupRoutes } from './routes.js'
import { sessions } from './sessions.js'

const start = async () => {
  await sessions.load()

  const handle = createStatelessHandler(setupRoutes, sessions, '/welcome')

  const result = await handle(process.argv.slice(2))

  process.stdout.write(result + '\n')
}

start().catch(console.error)
