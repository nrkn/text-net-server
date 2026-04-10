import { PvzEvent, PvzState } from '../sim-types.js'
import { reducePvzNew } from './reduce-new.js'

export const pvzSim = (state: PvzState, event: PvzEvent): PvzState => {
  if (state.status !== 'playing') return state

  // we could switch, (slightly nicer ts support, ensures all cases) but I 
  // prefer one op per line + early return for readability
  
  if (event.type === 'new') return reducePvzNew(state, event)

  // todo

  throw Error('Unexpected event')
}
