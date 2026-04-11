import { PvzEvent, PvzState } from '../pvz-types.js'
import { reducePvzNew } from './reducers/pvz-new.js'
import { reducePvzPlace } from './reducers/pvz-place.js'

export const pvzSim = (state: PvzState, event: PvzEvent): PvzState => {
  if (state.status !== 'playing') return state

  // we could switch, (slightly nicer ts support, ensures all cases) but I 
  // prefer one op per line + early return for readability

  if (event.type === 'new') return reducePvzNew(state, event)

  if (event.type === 'place') return reducePvzPlace(state, event)

  // todo

  throw Error('Unexpected event')
}
