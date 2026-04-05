import { ParagraphPart } from './types.js'

export const p = (...lines: string[]): ParagraphPart =>
  ({ type: 'paragraph', lines })
