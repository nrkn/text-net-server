import { InputPath, Menu, MenuItem, TextScreen } from './types.js'
import { menuToLines, sanitizeOutput, wrap } from './output.js'
import { isRecord, maybe } from './util.js'

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

  if (maybe(screenMenu) && maybe(inputPath)) {
    throw Error('A screen should have either a menu or input, but saw both')
  }

  return {
    lines: lines.flatMap(wrapAndSanitize),
    menu: screenMenu,
    inputPath
  }
}

export const menu = (
  title: string, ...items: MenuItem[]
): Menu => ({ title, items })

const isMenuItem = (value: unknown): value is MenuItem =>
  Array.isArray(value) &&
  value.length === 3 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string' &&
  typeof value[2] === 'string'

export const isMenu = (value: unknown): value is Menu => {
  if (!isRecord(value)) return false
  if (typeof value.title !== 'string') return false
  if (!Array.isArray(value.items)) return false
  if (!value.items.every(isMenuItem)) return false

  return true
}

export const input = (inputPath: string): InputPath => ({ inputPath })

export const isInputPath = (value: unknown): value is InputPath => {
  if (!isRecord(value)) return false
  if (typeof value.inputPath !== 'string') return false

  return true
}