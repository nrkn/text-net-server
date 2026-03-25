import { createServer, IncomingMessage } from 'node:http'

export type HttpRequest = {
  method: string
  path: string
  body: string
}

export type HttpResponse = {
  status: number
  headers?: Record<string, string>
  body: string
}

export type HttpRequestHandler = (
  req: HttpRequest
) => HttpResponse | Promise<HttpResponse>

const MAX_BODY = 4096

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    req.on('data', (chunk: Buffer) => {
      size += chunk.length

      if (size > MAX_BODY) {
        req.destroy()
        reject(Error('Body too large'))
        return
      }

      chunks.push(chunk)
    })

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })

export const parseFormBody = (body: string): Record<string, string> => {
  const result: Record<string, string> = {}

  if (!body) return result

  for (const pair of body.split('&')) {
    const [key, ...rest] = pair.split('=')

    if (key) {
      result[decodeURIComponent(key.replace(/\+/g, ' '))] =
        decodeURIComponent(rest.join('=').replace(/\+/g, ' '))
    }
  }

  return result
}

export const startHttp = (port: number, handler: HttpRequestHandler) => {
  const server = createServer(async (req, res) => {
    const method = (req.method ?? 'GET').toUpperCase()
    const path = (req.url ?? '/').split('?')[0]

    let body = ''

    if (method === 'POST') {
      try {
        body = await readBody(req)
      } catch {
        res.writeHead(413, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<html><body><pre>REQUEST TOO LARGE</pre></body></html>')
        return
      }
    }

    const result = await handler({ method, path, body })

    res.writeHead(result.status, {
      'Content-Type': 'text/html; charset=utf-8',
      ...result.headers,
    })

    res.end(result.body)
  })

  server.listen(port, () => {
    console.log(`HTTP listening on port ${port}`)
  })

  const shutdown = () => {
    console.log('Shutting down...')
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}
