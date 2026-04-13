import { PvzLaunchMowerEvent, PvzState } from '../../pvz-types.js'
import { formatRow } from '../../pvz-util.js'
import { launchMower } from '../pvz-mutate.js'
import { canLaunchMower } from '../pvz-query.js'
import { newEventState } from '../pvz-state.js'
import { actionFail } from '../pvz-sim-util.js'

export const reducePvzLaunchMower = (
  state: PvzState, event: PvzLaunchMowerEvent
): PvzState => {
  state = newEventState(state)

  const { row } = event

  const launchMowerResult = canLaunchMower(state, row, 'manual')

  if (!launchMowerResult.ok) {
    const { reason = '' } = launchMowerResult
    const message = (
      `Could not launch mower at ${formatRow(row)}: "${reason}"`
    )

    state.error = actionFail('launchMower', reason, message)

    return state
  }

  launchMower(state, row, 'manual')

  return state
}
