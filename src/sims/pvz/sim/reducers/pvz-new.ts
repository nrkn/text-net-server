import { maybe, repeat } from '../../../../lib/util.js'

import {
  PVZ_CURR_VERSION, BOARD_ROWS, BOARD_COLS,
  FIRST_WAVE_TIME, WAVE_INTERVAL,
  INSTANT_BUY_THRESHOLD, SEED_BANK_SLOTS
} from '../../pvz-const.js'

import { getPlantableIdx } from '../../pvz-util.js'
import { PvzState, PvzNewEvent, Mower } from '../../pvz-types.js'
import { canPlant, getPlantPool } from '../pvz-query.js'
import { newState } from '../pvz-state.js'
import { placePlant } from '../pvz-mutate.js'
import { actionFail, getLevel } from '../pvz-sim-util.js'
import { createRandom } from '../../../random.js'
import { plants } from '../../data/pvz-defs.js'

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

  // auto-populate seedBank if pool fits in slots
  const pool = getPlantPool(levelId)

  if (pool.length <= SEED_BANK_SLOTS) {
    state.seedBank = [...pool]
  }

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

  // set initial cooldown
  // starter plants ready immediately, shorter delay than usual on others
  
  for (const plant of pool) {
    const def = plants[plant]

    const cd = (
      def.buyCd <= INSTANT_BUY_THRESHOLD ?
        0 :
        Math.max(0, def.buyCd * 0.75 - 2.5)
    )

    state.nextBuy.set(plant, cd)
  }

  state.sun = level.initialSun

  const waveStartTimes: number[] = []

  for (let i = 0; i < level.waves.length; i++) {
    const w = level.waves[i]

    if (w.startTime !== undefined) waveStartTimes.push(w.startTime)
    else if (i === 0) waveStartTimes.push(FIRST_WAVE_TIME)
    else waveStartTimes.push(waveStartTimes[i - 1] + WAVE_INTERVAL)
  }

  state.waveStartTimes = waveStartTimes

  state.lastPicked = repeat(BOARD_ROWS, 0)
  state.secondLastPicked = repeat(BOARD_ROWS, 0)

  // derive levelRng from seed - separate stream from main rng
  const levelRandom = createRandom(seed)

  levelRandom.consume(levelId + 1)

  state.levelRng = levelRandom.peek()

  // done!

  return state
}
