import { RtrApp } from '../routing/types.js'
import { RtrRequestHandler } from '../routing/types.js'
import { SessionStore } from '../session.js'
import { Maybe, Session } from '../types.js'

import {
  TextScreen, MenuItem, ScreenPart, ScreenResponse
} from '../view/types.js'

import { ConnectionState, MountOptions, SetupRoutes } from './types.js'

const normalizePrefix = (prefix: string) => {
  if (!prefix.startsWith('/')) prefix = '/' + prefix
  if (prefix.endsWith('/')) prefix = prefix.slice(0, -1)

  return prefix
}

const prefixMenuItem = (prefix: string, item: MenuItem): MenuItem =>
  [item[0], item[1], prefix + item[2]]

const prefixScreenPaths = (prefix: string, screen: TextScreen): TextScreen => {
  const parts: ScreenPart[] = screen.parts.map(part => {
    if (part.type === 'menu') {
      return {
        type: 'menu',
        menu: {
          title: part.menu.title,
          items: part.menu.items.map(item => prefixMenuItem(prefix, item)),
        },
      }
    }

    return part
  })

  const response = prefixResponse(prefix, screen.response)

  return { parts, response }
}

const prefixResponse = (
  prefix: string, response: ScreenResponse
): ScreenResponse => {
  if (response.type === 'menu') {
    return {
      type: 'menu',
      menu: {
        title: response.menu.title,
        items: response.menu.items.map(item => prefixMenuItem(prefix, item)),
      },
    }
  }

  if (response.type === 'input') {
    return {
      type: 'input',
      path: prefix + response.path,
      ...(response.formAction !== undefined
        ? { formAction: prefix + response.formAction }
        : {}),
    }
  }

  return response
}

const createScopedState = (
  parentState: ConnectionState, dataKey?: string
): ConnectionState => {
  if (dataKey === undefined) return parentState

  return {
    get session() {
      const real = parentState.session
      if (real == null) return real

      if (!(dataKey in real.data) || typeof real.data[dataKey] !== 'object') {
        real.data[dataKey] = {}
      }

      return new Proxy(real, {
        get(target, prop) {
          if (prop === 'data') return target.data[dataKey]

          return target[prop as keyof Session]
        },
        set(target, prop, value) {
          if (prop === 'data') {
            target.data[dataKey] = value

            return true
          }

          ; (target as Record<string, unknown>)[prop as string] = value

          return true
        },
      }) as Session
    },
    set session(value: Maybe<Session>) {
      parentState.session = value
    },
  }
}

export const mount = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
  prefix: string,
  setupRoutes: SetupRoutes,
  options: MountOptions,
) => {
  prefix = normalizePrefix(prefix)

  const scopedState = createScopedState(state, options.dataKey)
  const subMiddlewares: RtrRequestHandler<TextScreen>[] = []

  const wrapHandler = (
    handler: RtrRequestHandler<TextScreen>
  ): RtrRequestHandler<TextScreen> =>
    (req, res, next) => {
      const strippedPath = req.path.startsWith(prefix)
        ? req.path.slice(prefix.length) || '/'
        : req.path

      const subReq = { ...req, path: strippedPath }

      const subRes = {
        send: (screen: TextScreen) => {
          if (screen.response.type === 'end') {
            return res.redirect(options.returnPath)
          }

          res.send(prefixScreenPaths(prefix, screen))
        },
        redirect: (path: string) => {
          return res.redirect(prefix + path)
        },
      }

      return handler(subReq, subRes, next)
    }

  const proxyApp: RtrApp<TextScreen> = {
    on: (path, ...handlers) => {
      const wrapped = [...subMiddlewares, ...handlers].map(wrapHandler)

      app.on(prefix + path, ...wrapped)
    },
    use: (...handlers) => {
      subMiddlewares.push(...handlers)
    },
    dispatch: app.dispatch,
  }

  setupRoutes(proxyApp, scopedState, sessions)
}
