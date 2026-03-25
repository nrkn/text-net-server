import { createServer as createTcpServer, Server } from 'node:net'
import { CreateHandler } from './types.js'

export const startTelnet = (port: number, createHandler: CreateHandler) => {
  const server = createTcpServer(socket => {
    const handleLine = createHandler(socket, () => socket.end())

    let buffer = ''

    socket.on('data', (data: Buffer) => {
      buffer += data.toString('utf-8')

      let idx: number

      while ((idx = buffer.search(/\r?\n|\r/)) !== -1) {
        const line = buffer.slice(0, idx)

        buffer = buffer.slice(idx + 1)

        if (buffer[0] === '\n') buffer = buffer.slice(1)

        handleLine(line)
      }
    })

    socket.on('error', (err) => {
      console.warn(`Connection error: ${err.message}`)
    })

    socket.on('close', () => {
      buffer = ''
    })
  })

  server.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })

  const shutdown = () => {
    console.log('Shutting down...')

    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}
