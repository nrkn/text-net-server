import { pathToRegexp } from './path-to-regexp.js'

import {
  RtrRequestHandler, RtrRouteMatcher, RtrPathRegexp, RtrMiddlewareHandler,
  RtrDispatch, RtrNextFunction, RtrRequest, RtrResponse, RtrSend,
  RtrApp, RtrRedirect
} from './types.js'

export const createRouter = <Content>(
  send: RtrSend<Content>, redirect: RtrRedirect
) => {
  const getRegexpMap = new Map<string, RtrPathRegexp>()
  const getHandlersMap = new Map<string, RtrRequestHandler<Content>[]>()
  const middlewares: RtrRequestHandler<Content>[] = []

  const on: RtrRouteMatcher<Content> = (route, ...handlers) => {
    const { keys, regexp } = pathToRegexp(route)

    getRegexpMap.set(route, { keys, regexp })
    getHandlersMap.set(route, handlers)
  }

  const use: RtrMiddlewareHandler<Content> = (...handlers) => {
    middlewares.push(...handlers)
  }

  const dispatch: RtrDispatch = path => {
    const route = [...getRegexpMap.keys()].find(mapPath => {
      const { regexp } = getRegexpMap.get(mapPath)!

      return regexp.test(path)
    })

    if (!route) throw Error(`${path} not found`)

    const { keys, regexp } = getRegexpMap.get(route)!
    const handlers = getHandlersMap.get(route)!

    const exec = [...regexp.exec(path)!]

    const params: Record<string, string> = keys.reduce((map, key, i) => {
      const raw = exec[i + 1]
      map[key.name] = raw !== undefined ? decodeURIComponent(raw) : raw

      return map
    }, {} as Record<string, string>)

    const req: RtrRequest = { path, params }
    const res: RtrResponse<Content> = { send, redirect }

    let middlewareIndex = -1
    let handlerIndex = -1

    const next: RtrNextFunction = arg => {
      if (arg === 'route') {
        middlewareIndex = middlewares.length
      } else {
        middlewareIndex++
      }

      let handler = middlewares[middlewareIndex]

      if (handler !== undefined) {
        handler(req, res, next)

        return
      }

      handlerIndex++

      handler = handlers[handlerIndex]

      if (handler === undefined)
        throw Error('Unexpected next, no more handlers')

      handler(req, res, next)
    }

    next()
  }

  const app: RtrApp<Content> = { on, use, dispatch }

  return app
}
