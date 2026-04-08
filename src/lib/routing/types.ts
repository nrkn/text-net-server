import type { RouteKey } from './path-to-regexp.js'

export type RtrRequest = {
  path: string
  params: Record<string, string>
}

export type RtrResponse<Content> = {
  send: RtrSend<Content>
  redirect: RtrRedirect
}

export type RtrNextFunction = (arg?: 'route') => void | Promise<void>

export type RtrRequestHandler<Content> = (
  req: RtrRequest, res: RtrResponse<Content>, next: RtrNextFunction
) => void | Promise<void>

export type RtrRouteMatcher<Content> = (
  path: string, ...handlers: RtrRequestHandler<Content>[]
) => void

export type RtrMiddlewareHandler<Content> = (
  ...handlers: RtrRequestHandler<Content>[]
) => void

export type RtrSend<Content> = (content: Content) => void

export type RtrRedirect = (path: string) => void | Promise<void>

export type RtrPathRegexp = {
  keys: RouteKey[]
  regexp: RegExp
}

export type RtrDispatch = (path: string) => void | Promise<void>

export type RtrApp<Content> = {
  on: RtrRouteMatcher<Content>
  use: RtrMiddlewareHandler<Content>
  dispatch: RtrDispatch
}
