import { InputPath, Menu, TextScreen } from '../types.js'
import { menuToLines, sanitizeOutput, wrap } from '../output.js'
import { maybe } from '../util.js'
import { isMenu } from './menu.js'
import { isInputPath } from './input-path.js'

type ScreenArg = string | string[] | Menu | InputPath

const wrapAndSanitize = (line: string) => wrap(sanitizeOutput(line))

export const screen = (...args: ScreenArg[]): TextScreen => {
  const lines: string[] = []
  let screenMenu: Menu | undefined
  let inputPath: string | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      lines.push(arg)
    } else if (Array.isArray(arg)) {
      lines.push(...arg)
    } else if (isMenu(arg)) {
      if (maybe(screenMenu)) {
        throw Error('Only one menu per screen is supported')
      }

      lines.push(...menuToLines(arg))

      screenMenu = arg
    } else if (isInputPath(arg)) {
      if (maybe(inputPath)) {
        throw Error('Only one input per screen is supported')
      }

      inputPath = arg.inputPath
    } else {
      throw Error(`Unexpected screen arg "${arg}"`)
    }
  }

  const hasMenu = maybe(screenMenu)
  const hasInput = maybe(inputPath)

  // can't have both
  if (hasMenu && hasInput) {
    throw Error('A screen should have either a menu or input, but saw both')
  }

  return {
    lines: lines.flatMap(wrapAndSanitize),
    menu: screenMenu,
    inputPath
  }
}

