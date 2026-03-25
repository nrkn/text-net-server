import { Menu, TextScreen } from './types.js'
import { blank, isMenu, menu, sanitizeOutput, wrap } from './output.js'
import { maybe } from './util.js'

type ScreenArg = string | string[] | Menu

const wrapAndSanitize = (line: string) => wrap(sanitizeOutput(line))

export const createScreen = (...args: ScreenArg[]): TextScreen => {
  const lines: string[] = []
  let screenMenu: Menu | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      lines.push(arg)
    } else if (Array.isArray(arg)) {
      lines.push(...arg)
    } else if (isMenu(arg)) {
      if (maybe(screenMenu)) {
        throw Error('Only one menu per screen is supported')
      }

      lines.push(...menu(arg))

      screenMenu = arg
    } else {
      throw Error(`Unexpected screen arg "${arg}"`)
    }
  }

  return {
    lines: lines.flatMap(wrapAndSanitize),
    menu: screenMenu
  }
}
