import { createShellHandler } from '../lib/app/create-shell-handler.js'
import { setupRoutes } from './routes.js'
import { sessions } from './sessions.js'

const start = async () => {
  await sessions.load()

  const handle = createShellHandler(setupRoutes, sessions, '/welcome')

  const result = handle(process.argv.slice(2))

  process.stdout.write(result + '\n')
}

start().catch(console.error)
