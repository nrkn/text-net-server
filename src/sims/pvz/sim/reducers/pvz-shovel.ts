import { PvzShovelEvent, PvzState } from '../../pvz-types.js'
import { formatPos } from '../../pvz-util.js'
import { removePlant } from '../pvz-mutate.js'
import { canShovel } from '../pvz-query.js'
import { newEventState } from '../pvz-state.js'
import { actionFail } from '../pvz-sim-util.js'

export const reducePvzShovel = (
  state: PvzState, event: PvzShovelEvent
): PvzState => {
  state = newEventState(state)

  const { row, col } = event

  const shovelResult = canShovel(state, row, col)

  if (!shovelResult.ok) {
    const { reason = '' } = shovelResult
    const message = (
      `Could not shovel a plant at ${formatPos(row, col)}: "${reason}"`
    )

    state.error = actionFail('shovel', reason, message)

    return state
  }

  removePlant(state, row, col)

  return state
}