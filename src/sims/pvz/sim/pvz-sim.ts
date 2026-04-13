import { PvzEvent, PvzState } from '../pvz-types.js'
import { newEventState } from './pvz-state.js'
import { tick, tickUntil } from './pvz-tick.js'
import { reducePvzLaunchMower } from './reducers/pvz-launch.js'
import { reducePvzNew } from './reducers/pvz-new.js'
import { reducePvzPlace } from './reducers/pvz-place.js'
import { reducePvzShovel } from './reducers/pvz-shovel.js'

export const pvzSim = (state: PvzState, event: PvzEvent): PvzState => {
  if (state.status !== 'playing') return state

  // we could switch, (slightly nicer ts support, ensures all cases) but I 
  // prefer one op per line + early return for readability

  if (event.type === 'new') return reducePvzNew(state, event)

  if (event.type === 'place') return reducePvzPlace(state, event)

  if (event.type === 'shovel') return reducePvzShovel(state, event)

  if (event.type === 'launchMower') return reducePvzLaunchMower(state, event)

  if (event.type === 'advance') {
    const { seconds } = event

    state = newEventState(state)

    tick(state, seconds)

    return state
  }

  if (event.type === 'advanceUntil') {
    const { condition } = event

    state = newEventState(state)

    tickUntil(state, condition)

    return state
  }

  throw Error('Unexpected event')
}
