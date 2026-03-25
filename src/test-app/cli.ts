import { startCli } from '../lib/transport/cli.js'
import { createAppStreamHandler } from './handler.js'

const start = async () => {
  const handler = await createAppStreamHandler()

  startCli(handler)
}

start().catch(console.error)
