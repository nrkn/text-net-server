import { maybe } from '../../../lib/util.js'
import {
  PVZ_CURR_VERSION, BOARD_ROWS, BOARD_COLS, plantNames
} from '../const.js'

import { levels, plants } from '../data/defs.js'
import { getPlantableIdx } from '../pvz-util.js'
import { PvzState, PvzNewEvent, Mower, Plant } from '../sim-types.js'
import { newState, canPlant, stateToGrid, issueId } from './sim-util.js'

export const reducePvzNew = (state: PvzState, event: PvzNewEvent): PvzState => {
  const { levelId, seed, version } = event

  if (version !== PVZ_CURR_VERSION) {
    throw Error(
      `Version mismatch; current is "${PVZ_CURR_VERSION}" but saw "${version}"`
    )
  }

  // level 1 is in levels[ 0 ] etc
  const level = levels[levelId - 1]

  if (level === undefined) {
    throw Error('Level out of range')
  }

  state = newState(seed)

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
        const plantResult = canPlant(
          // new grid for every single plant, but it doesn't really matter, it's
          // safer than mutating an existing grid - we can always add an 
          // updateGrid mutation later if it's actually a bottleneck
          stateToGrid(state), 
          level, kind, row, col
        )

        if (!plantResult.ok) {
          throw Error(
            `Level "${levelId}" has impossible initial plant; ` +
            `"${plantResult.reason}"`
          )
        }

        const id = issueId(state)
        const { hp } = plants[kind]
        const nextAction = 0

        const plant: Plant = { kind, id, row, col, hp, nextAction }

        state.plants.set(id, plant)
      }
    }
  }

  for (const plant of plantNames) {
    state.nextBuy.set(plant, 0)
  }

  state.sun = level.initialSun

  // done!

  return state
}
