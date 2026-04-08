import { ParagraphPart, HeadingPart } from './types.js'

export const p = (...lines: string[]): ParagraphPart =>
  ({ type: 'paragraph', lines })

export const h1 = (text: string): HeadingPart => ({ type: 'heading', level: 1, text })
export const h2 = (text: string): HeadingPart => ({ type: 'heading', level: 2, text })
export const h3 = (text: string): HeadingPart => ({ type: 'heading', level: 3, text })
export const h4 = (text: string): HeadingPart => ({ type: 'heading', level: 4, text })

export const isHeading = (value: unknown): value is HeadingPart =>
  typeof value === 'object' && value !== null &&
  (value as any).type === 'heading' &&
  typeof (value as any).text === 'string'
