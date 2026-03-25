import { RtrApp } from '../routing/types.js'
import { SessionStore } from '../session.js'
import { Maybe, Session, TextScreen } from '../types.js'

export type SetupRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
) => void

export type ConnectionState = {
  session: Maybe<Session>
  quit: boolean
}