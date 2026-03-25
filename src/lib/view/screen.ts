import {
  EndResponse, InputPath, Menu, ScreenResponse, TextScreen
} from './types.js'

import { menuToLines, sanitizeOutput, wrap } from '../output.js'
import { maybe } from '../util.js'
import { isMenu } from './menu.js'
import { isInputPath } from './input-path.js'
import { isEndResponse } from './end.js'

type ScreenArg = string | string[] | Menu | InputPath | EndResponse

const wrapAndSanitize = (line: string) => wrap(sanitizeOutput(line))

export const screen = (...args: ScreenArg[]): TextScreen => {
  const lines: string[] = []
  let screenMenu: Menu | undefined
  let inputPath: string | undefined
  let endMessage: string | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      lines.push(arg)
    } else if (isEndResponse(arg)) {
      if (maybe(endMessage)) {
        throw Error('Only one end message per screen is supported')
      }

      endMessage = arg[1]
      
      lines.push(endMessage)
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
  const hasEnd = maybe(endMessage)

  const responseCount = [hasMenu, hasInput, hasEnd].filter(Boolean).length

  if (responseCount > 1) {
    throw Error(
      'A screen should have either a menu, input, or end message, but saw multiple'
    )
  }

  if (responseCount === 0) {
    throw Error(
      'A screen should have a menu, input, or end message, but saw none'
    )
  }

  const response: ScreenResponse = hasMenu
    ? ['MENU', screenMenu!]
    : hasInput
      ? ['INPUT', inputPath!]
      : ['END', endMessage!]

  return {
    lines: lines.flatMap(wrapAndSanitize),
    response
  }
}

