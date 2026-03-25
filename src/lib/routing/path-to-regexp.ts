// adapted from https://github.com/pillarjs/path-to-regexp

// The MIT License (MIT)
//
// Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

const DEFAULT_DELIMITER = '/'
const NOOP_VALUE = (value: string) => value
const ID_START = /^[$_\p{ID_Start}]$/u
const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u

type Encode = (value: string) => string

type ParseOptions = {
  encodePath?: Encode
}

type PathToRegexpOptions = {
  end?: boolean
  trailing?: boolean
  sensitive?: boolean
  delimiter?: string
}

type Text = {
  type: 'text'
  value: string
}

type Parameter = {
  type: 'param'
  name: string
}

type Wildcard = {
  type: 'wildcard'
  name: string
}

type Group = {
  type: 'group'
  tokens: Token[]
}

export type RouteKey = Parameter | Wildcard

type Token = Text | Parameter | Wildcard | Group

type TokenData = {
  tokens: Token[]
  originalPath?: string
}

type RoutePath = string | TokenData

type TokenType =
  | '{'
  | '}'
  | 'wildcard'
  | 'param'
  | 'char'
  | 'escape'
  | 'end'
  | '('
  | ')'
  | '['
  | ']'
  | '+'
  | '?'
  | '!'

type LexToken = {
  type: TokenType
  index: number
  value: string
}

type FlatToken = Text | Parameter | Wildcard

const SIMPLE_TOKENS: Record<string, TokenType> = {
  '{': '{',
  '}': '}',
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '+': '+',
  '?': '?',
  '!': '!',
}

const escape = (str: string) =>
  str.replace(/[.+*?^${}()[\]|/\\]/g, '\\$&')

const createPathError = (
  message: string,
  originalPath: string | undefined
): TypeError => {
  let text = message
  if (originalPath) text += `: ${originalPath}`
  text += '; visit https://git.new/pathToRegexpError for info'
  return new TypeError(text)
}

const parse = (str: string, options: ParseOptions = {}): TokenData => {
  const { encodePath = NOOP_VALUE } = options
  const chars = [...str]
  const tokens: LexToken[] = []

  let index = 0
  let pos = 0

  const name = (): string => {
    let value = ''

    if (ID_START.test(chars[index])) {
      do {
        value += chars[index++]
      } while (ID_CONTINUE.test(chars[index]))
    } else if (chars[index] === '"') {
      let quoteStart = index

      while (index++ < chars.length) {
        if (chars[index] === '"') {
          index++
          quoteStart = 0
          break
        }

        if (chars[index] === '\\') index++

        value += chars[index]
      }

      if (quoteStart) {
        throw createPathError(`Unterminated quote at index ${quoteStart}`, str)
      }
    }

    if (!value) {
      throw createPathError(`Missing parameter name at index ${index}`, str)
    }

    return value
  }

  while (index < chars.length) {
    const value = chars[index]
    const type = SIMPLE_TOKENS[value]

    if (type) {
      tokens.push({ type, index: index++, value })
    } else if (value === '\\') {
      tokens.push({ type: 'escape', index: index++, value: chars[index++] })
    } else if (value === ':') {
      tokens.push({ type: 'param', index: index++, value: name() })
    } else if (value === '*') {
      tokens.push({ type: 'wildcard', index: index++, value: name() })
    } else {
      tokens.push({ type: 'char', index: index++, value })
    }
  }

  tokens.push({ type: 'end', index, value: '' })

  const consumeUntil = (endType: TokenType): Token[] => {
    const output: Token[] = []

    while (true) {
      const token = tokens[pos++]
      if (token.type === endType) break

      if (token.type === 'char' || token.type === 'escape') {
        let path = token.value
        let cur = tokens[pos]

        while (cur.type === 'char' || cur.type === 'escape') {
          path += cur.value
          cur = tokens[++pos]
        }

        output.push({
          type: 'text',
          value: encodePath(path),
        })
        continue
      }

      if (token.type === 'param' || token.type === 'wildcard') {
        output.push({
          type: token.type,
          name: token.value,
        })
        continue
      }

      if (token.type === '{') {
        output.push({
          type: 'group',
          tokens: consumeUntil('}'),
        })
        continue
      }

      throw createPathError(
        `Unexpected ${token.type} at index ${token.index}, expected ${endType}`,
        str,
      )
    }

    return output
  }

  return { tokens: consumeUntil('end'), originalPath: str }
}

const negate = (delimiter: string, backtrack: string): string => {
  if (backtrack.length < 2) {
    if (delimiter.length < 2) return `[^${escape(delimiter + backtrack)}]`

    return `(?:(?!${escape(delimiter)})[^${escape(backtrack)}])`
  }

  if (delimiter.length < 2) {
    return `(?:(?!${escape(backtrack)})[^${escape(delimiter)}])`
  }

  return `(?:(?!${escape(backtrack)}|${escape(delimiter)})[\\s\\S])`
}

const toRegExpSource = (
  tokens: FlatToken[],
  delimiter: string,
  keys: RouteKey[],
  originalPath: string | undefined,
): string => {
  let result = ''
  let backtrack = ''
  let isSafeSegmentParam = true

  for (const token of tokens) {
    if (token.type === 'text') {
      result += escape(token.value)
      backtrack += token.value
      isSafeSegmentParam ||= token.value.includes(delimiter)

      continue
    }

    if (token.type === 'param' || token.type === 'wildcard') {
      if (!isSafeSegmentParam && !backtrack) {
        throw createPathError(
          `Missing text before "${token.name}" ${token.type}`,
          originalPath,
        )
      }

      if (token.type === 'param') {
        result += `(${negate(delimiter, isSafeSegmentParam ? '' : backtrack)}+)`
      } else {
        result += '([\\s\\S]+)'
      }

      keys.push(token)
      backtrack = ''
      isSafeSegmentParam = false

      continue
    }
  }

  return result
}

const pathsToArray = (paths: RoutePath | RoutePath[]): RoutePath[] =>
  Array.isArray(paths) ? paths : [paths]

const flatten = (tokens: Token[]): FlatToken[][] => {
  const results: FlatToken[][] = []
  const stack: [number, FlatToken[]][] = [[0, []]]

  while (stack.length) {
    const [index, init] = stack.pop()!

    if (index === tokens.length) {
      results.push(init)

      continue
    }

    const token = tokens[index]

    if (token.type === 'group') {
      for (const seq of flatten(token.tokens)) {
        stack.push([index + 1, [...init, ...seq]])
      }
    } else {
      stack.push([index + 1, [...init, token]])
    }
  }

  return results
}

export const pathToRegexp = (
  path: RoutePath | RoutePath[],
  options: PathToRegexpOptions & ParseOptions = {},
) => {
  const {
    delimiter = DEFAULT_DELIMITER,
    end = true,
    sensitive = false,
    trailing = true,
  } = options

  const keys: RouteKey[] = []
  const flags = sensitive ? '' : 'i'
  const sources: string[] = []

  for (const input of pathsToArray(path)) {
    const data = typeof input === 'object' ? input : parse(input, options)

    for (const tokens of flatten(data.tokens)) {
      sources.push(toRegExpSource(tokens, delimiter, keys, data.originalPath))
    }
  }

  let pattern = `^(?:${sources.join('|')})`

  if (trailing) pattern += `(?:${escape(delimiter)}$)?`

  pattern += end ? '$' : `(?=${escape(delimiter)}|$)`

  const regexp = new RegExp(pattern, flags)

  return { regexp, keys }
}
