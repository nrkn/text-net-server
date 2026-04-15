import { PvzEvent } from './pvz-types.js'
import { pvzSim } from './sim/pvz-sim.js'
import { newState } from './sim/pvz-state.js'
import { formatPvzEvent } from './pvz-serialize.js'

export const replayPvzLog = (events: PvzEvent[]): string[] => {
  let state = newState(1)
  const lines: string[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const reqId = i + 1

    state = pvzSim(state, event)

    const time = state.time.toFixed(2)
    const playerLine = formatPvzEvent(event)

    lines.push(`${time} req ${reqId} ${playerLine}`)

    if (state.error) {
      const msg = state.error.message ?? state.error.reason
      lines.push(`${time} res ${reqId} ${msg}`)
    } else {
      for (const tickEvent of state.tickEvents) {
        lines.push(`${time} res ${reqId} ${tickEvent}`)
      }
    }
  }

  return lines
}
