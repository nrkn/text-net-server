import { MenuItem, ScreenArg, ScreenPart, ScreenResponse, TextScreen } from './types.js'

import { sanitizeOutput, wrapText } from '../output.js'
import { maybe } from '../util.js'
import { isMenu } from './menu.js'
import { isInputResponse } from './input-path.js'
import { isEndResponse } from './end.js'

const wrapAndSanitize = (line: string) => wrapText(sanitizeOutput(line))

const sanitizeMenuItem = ([s, l, p]: MenuItem): MenuItem =>
  [sanitizeOutput(s), sanitizeOutput(l), p]

const sanitizeMenu = (menu: { title: string, items: MenuItem[] }) => ({
  title: sanitizeOutput(menu.title),
  items: menu.items.map(sanitizeMenuItem)
})

const multiResponseErr = Error('Only one response per screen is supported')
const noResponseErr = Error('Screen did not contain a response')

const pushText = (parts: ScreenPart[], lines: string[]) => {
  const last = parts[parts.length - 1]

  if (last && last.type === 'text') {
    last.lines.push(...lines.flatMap(wrapAndSanitize))
  } else {
    parts.push({ type: 'text', lines: lines.flatMap(wrapAndSanitize) })
  }
}

export const screen = (...args: ScreenArg[]): TextScreen => {
  const parts: ScreenPart[] = []

  let response: ScreenResponse | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      pushText(parts, [arg])
    } else if (isEndResponse(arg)) {
      if (maybe(response)) throw multiResponseErr

      response = arg

      pushText(parts, [arg.message])
    } else if (Array.isArray(arg)) {
      pushText(parts, arg)
    } else if (isMenu(arg)) {
      if (maybe(response)) throw multiResponseErr

      const menu = sanitizeMenu(arg)

      parts.push({ type: 'menu', menu })

      response = { type: 'menu', menu }
    } else if (isInputResponse(arg)) {
      if (maybe(response)) throw multiResponseErr

      response = arg
    } else {
      throw Error(`Unexpected screen arg "${arg}"`)
    }
  }

  if (!maybe(response)) throw noResponseErr

  return { parts, response }
}
