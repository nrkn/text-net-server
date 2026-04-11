import { formatPos } from '../../pvz-util.js'
import { PvzPlaceEvent, PvzState } from '../../pvz-types.js'
import { canPlant } from '../pvz-query.js'
import { newEventState } from '../pvz-state.js'
import { placePlant } from '../pvz-mutate.js'
import { actionFail } from '../pvz-util.js'

export const reducePvzPlace = (
  state: PvzState, event: PvzPlaceEvent
): PvzState => {
  state = newEventState(state)

  const { plantName, row, col } = event

  const plantResult = canPlant(state, plantName, row, col, 'bought')

  if (!plantResult.ok) {
    const { reason = '' } = plantResult
    const message = (
      `Could not place "${plantName}" at ${formatPos(row, col)}: "${reason}"`
    )

    state.error = actionFail('place', reason, message)

    return state
  }

  placePlant(state, plantName, row, col, 'bought')

  return state
}
