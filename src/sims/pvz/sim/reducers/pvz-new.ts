import { maybe } from '../../../../lib/util.js'

import {
  PVZ_CURR_VERSION, BOARD_ROWS, BOARD_COLS, plantNames
} from '../../pvz-const.js'

import { getPlantableIdx } from '../../pvz-util.js'
import { PvzState, PvzNewEvent, Mower } from '../../pvz-types.js'
import { canPlant } from '../pvz-query.js'
import { newState } from '../pvz-state.js'
import { placePlant } from '../pvz-mutate.js'
import { actionFail, getLevel } from '../pvz-sim-util.js'
import { createRandom } from '../../../random.js'

export const reducePvzNew = (state: PvzState, event: PvzNewEvent): PvzState => {
  const { levelId, seed, version } = event

  state = newState(seed)

  if (version !== PVZ_CURR_VERSION) {
    const message = (
      `Version mismatch; current is "${PVZ_CURR_VERSION}" but saw "${version}"`
    )

    state.error = actionFail('new', 'versionMismatch', message)
    state.status = 'unplayable'

    return state
  }

  const level = getLevel(levelId)

  // populate state with level data

  state.levelId = levelId

  for (let row = 0; row < BOARD_ROWS; row++) {
    if (level.initialMowers[row]) {
      const x = 0.5
      const active = false

      const mower: Mower = { row, x, active }

      state.mowers.set(row, mower)
    }

    // skip mower col
    for (let col = 1; col < BOARD_COLS; col++) {
      const pIdx = getPlantableIdx(row, col)
      const kind = level.initialPlants[pIdx]

      if (maybe(kind)) {
        // I *think* the only thing that can go wrong here is if an initial
        // plant is defined as being on an unplantable tile, or isn't in the 
        // whitelist, but may as well just test everything
        //
        // passing initial skips checking cooldowns and sun cost
        const plantResult = canPlant(state, kind, row, col, 'initial')

        if (!plantResult.ok) {
          const { reason = '' } = plantResult

          const message = (
            `Level "${levelId}" has impossible initial plant; "${reason}"`
          )

          state.error = actionFail('new', reason, message)
          state.status = 'unplayable'

          return state
        }

        // passing initial skips setting cooldown or deducting cost
        placePlant(state, kind, row, col, 'initial')
      }
    }
  }

  for (const plant of plantNames) {
    state.nextBuy.set(plant, 0)
  }

  state.sun = level.initialSun

  state.waveStartTimes = level.waves.map(w => w.startTime)

  // derive levelRng from seed - separate stream from main rng
  const levelRandom = createRandom(seed)
  
  levelRandom.consume(levelId + 1)
  
  state.levelRng = levelRandom.peek()

  // done!

  return state
}
