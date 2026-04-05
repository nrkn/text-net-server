import { ParagraphPart } from './types.js'

export const p = (line: string): ParagraphPart =>
  ({ type: 'paragraph', lines: [line] })
