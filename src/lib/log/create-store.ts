import { Log, Reducer, Store, StoreOptions } from './types.js'

export const createReducerStore = async <State, Event>(
  log: Log,
  initial: State,
  reduce: Reducer<State, Event>,
  options: StoreOptions<Event> = {}
): Promise<Store<State, Event>> => {
  const parse =
    options.parse ??
    ((data: string) => JSON.parse(data) as Event)

  const format =
    options.format ??
    ((event: Event) => JSON.stringify(event))

  let state = log.readSnapshot<State>() ?? initial

  await log.replay(entry => {
    const event = parse(entry.data)
    state = reduce(state, event)
  })

  const getState = () => state

  const dispatch = async (event: Event) => {
    log.append(format(event))
    state = reduce(state, event)
  }

  const snapshot = () => {
    log.writeSnapshot(state)
  }

  return {
    getState,
    dispatch,
    snapshot
  }
}