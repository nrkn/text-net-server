export type LogEntry = {
  ts: number
  data: string
}

export type ReplayHandler = (entry: LogEntry) => void

export type Reducer<State, Event = LogEntry> = (state: State, entry: Event) => State

export type Log = {
  append: (data: string, ts?: number) => void
  appendJSON: (data: unknown, ts?: number) => void
  replay: (handler: ReplayHandler) => Promise<void>
  replayReduce: <State>(
    initial: State, reduce: Reducer<State>
  ) => Promise<State>
  writeSnapshot: (state: unknown) => void
  readSnapshot: <T>() => T | null
  compact: () => void
  close: () => void
}

export type Store<State, Event> = {
  getState: () => State
  dispatch: (event: Event) => Promise<void>
  snapshot: () => void
}

export type StoreOptions<Event> = {
  parse?: (data: string) => Event
  format?: (event: Event) => string
}