import { blank } from '../output.js'

export const br = blank()

export const p = (line: string) => [line, ...br]
