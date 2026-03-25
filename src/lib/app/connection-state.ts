import { ConnectionState } from './types.js'

export const createConnectionState = (): ConnectionState => ({
  session: null,
  quit: false,
})