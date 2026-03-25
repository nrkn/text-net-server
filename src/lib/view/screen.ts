import { ScreenArg, ScreenResponse, TextScreen } from './types.js'

import { menuToLines, sanitizeOutput, wrapText } from '../output.js'
import { maybe } from '../util.js'
import { isMenu } from './menu.js'
import { isInputPath } from './input-path.js'
import { isEndResponse } from './end.js'

const wrapAndSanitize = (line: string) => wrapText(sanitizeOutput(line))

const multiResponseErr = Error('Only one response per screen is supported')
const noResponseErr = Error('Screen did not contain a response')

export const screen = (...args: ScreenArg[]): TextScreen => {
  const lines: string[] = []

  let response: ScreenResponse | undefined

  for (const arg of args) {
    if (typeof arg === 'string') {
      lines.push(arg)
    } else if (isEndResponse(arg)) {
      if (maybe(response)) throw multiResponseErr

      response = arg

      lines.push(arg[1])
    } else if (Array.isArray(arg)) {
      lines.push(...arg)
    } else if (isMenu(arg)) {
      if (maybe(response)) throw multiResponseErr

      lines.push(...menuToLines(arg))

      response = ['MENU', arg]
    } else if (isInputPath(arg)) {
      if (maybe(response)) throw multiResponseErr

      response = ['INPUT', arg.inputPath]
    } else {
      throw Error(`Unexpected screen arg "${arg}"`)
    }
  }

  if (!maybe(response)) throw noResponseErr

  return {
    lines: lines.flatMap(wrapAndSanitize),
    response
  }
}
