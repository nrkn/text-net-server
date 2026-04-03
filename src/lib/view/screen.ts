import { MenuItem, ScreenArg, ScreenPart, ScreenResponse, TextScreen } from './types.js'

import { sanitizeOutput, wrapText } from '../output.js'
import { maybe } from '../util.js'
import { isMenu } from './menu.js'
import { isInputResponse } from './input-path.js'
import { isEndResponse } from './end.js'
import { isMeta } from './meta.js'

const wrapAndSanitize = (line: string) => wrapText(sanitizeOutput(line))

const sanitizeMenuItem = ([s, l, p]: MenuItem): MenuItem =>
  [sanitizeOutput(s), sanitizeOutput(l), p]

const sanitizeMenu = (menu: { title: string, items: MenuItem[] }) => ({
  title: sanitizeOutput(menu.title),
  items: menu.items.map(sanitizeMenuItem)
})

const mixedResponseErr = Error('Cannot mix menu with input or end response')
const multiResponseErr = Error('Only one input or end response per screen')
const noResponseErr = Error('Screen did not contain a response')

const verifyMenuCommands = (items: MenuItem[]) => {
  const seen = new Set<string>()

  for (const [short, long] of items) {
    const s = short.toUpperCase()
    const l = long.toUpperCase()

    if (seen.has(s)) throw Error(`Duplicate menu command: ${s}`)
    if (seen.has(l)) throw Error(`Duplicate menu command: ${l}`)

    seen.add(s)
    seen.add(l)
  }
}

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
  const allMenuItems: MenuItem[] = []

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
      if (maybe(response)) throw mixedResponseErr

      const menu = sanitizeMenu(arg)

      parts.push({ type: 'menu', menu })
      allMenuItems.push(...menu.items)
    } else if (isInputResponse(arg)) {
      if (maybe(response) || allMenuItems.length > 0) throw mixedResponseErr

      response = arg
    } else if (isMeta(arg)) {
      parts.push(arg)
    } else {
      throw Error(`Unexpected screen arg "${arg}"`)
    }
  }

  if (allMenuItems.length > 0) {
    verifyMenuCommands(allMenuItems)
    response = { type: 'menu', menu: { title: '', items: allMenuItems } }
  }

  if (!maybe(response)) throw noResponseErr

  return { parts, response }
}
