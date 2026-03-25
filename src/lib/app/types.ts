import { RtrApp } from '../routing/types.js'
import { SessionStore } from '../session.js'
import { Maybe, Session } from '../types.js'
import { TextScreen } from '../view/types.js'

export type SetupRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState,
  sessions: SessionStore,
) => void

export type ConnectionState = {
  session: Maybe<Session>
}