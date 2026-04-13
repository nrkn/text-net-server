import { PvzEvent, PvzState } from '../pvz-types.js'
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

  // todo

  throw Error('Unexpected event')
}
