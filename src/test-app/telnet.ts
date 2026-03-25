import { startTelnet } from '../lib/transport/telnet.js'
import { createAppStreamHandler } from './handler.js'

const PORT = parseInt(process.env.PORT ?? '2323', 10)

const start = async () => {
  const handler = await createAppStreamHandler()

  startTelnet(PORT, handler)
}

start().catch(console.error)
