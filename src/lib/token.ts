import { randomBytes } from 'node:crypto'
import { BASE32_CHARS, TOKEN_LENGTH, TOKEN_GROUP_SIZE } from './const.js'
import { normalizeToken } from './util.js'

export const generateToken = () => {
  const bytes = randomBytes(TOKEN_LENGTH)
  
  let token = ''

  for (let i = 0; i < TOKEN_LENGTH; i++)
    token += BASE32_CHARS[bytes[i] & 31]

  return token
}

export const formatToken = (token: string) => {
  const parts: string[] = []

  for (let i = 0; i < token.length; i += TOKEN_GROUP_SIZE)
    parts.push(token.slice(i, i + TOKEN_GROUP_SIZE))

  return parts.join(' ')
}

export const parseToken = (input: string) => normalizeToken(input)

export const isValidToken = (token: string) =>
  token.length === TOKEN_LENGTH &&
  [...token].every(c => BASE32_CHARS.includes(c))
