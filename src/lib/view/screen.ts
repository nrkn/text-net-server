import { MenuItem, ParagraphPart, ScreenArg, ScreenPart, ScreenResponse, TextScreen } from './types.js'

import { maybe } from '../util.js'
import { isMenu } from './menu.js'
import { isInputResponse } from './input-path.js'
import { isEndResponse } from './end.js'
import { isMeta } from './meta.js'
import { isTable } from './table.js'

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

const isParagraph = (value: unknown): value is ParagraphPart =>
  typeof value === 'object' && value !== null &&
  (value as any).type === 'paragraph' &&
  Array.isArray((value as any).lines)

const pushParagraph = (parts: ScreenPart[], lines: string[]) => {
  parts.push({ type: 'paragraph', lines: [...lines] })
}

export const screen = (...args: ScreenArg[]): TextScreen => {
  const parts: ScreenPart[] = []
  const allMenuItems: MenuItem[] = []

  let response: ScreenResponse | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      pushParagraph(parts, [arg])
    } else if (isEndResponse(arg)) {
      if (maybe(response)) throw multiResponseErr

      response = arg

      pushParagraph(parts, [arg.message])
    } else if (isParagraph(arg)) {
      pushParagraph(parts, arg.lines)
    } else if (isTable(arg)) {
      parts.push(arg)
    } else if (isMenu(arg)) {
      if (maybe(response)) throw mixedResponseErr

      parts.push({ type: 'menu', menu: arg })
      allMenuItems.push(...arg.items)
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
