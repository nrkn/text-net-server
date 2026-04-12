import { plants } from '../data/pvz-defs.js'
import { isPos, getIdx, getPlantableIdx } from '../pvz-util.js'
import { PvzState, PlantName } from '../pvz-types.js'
import { getLevel } from './pvz-util.js'
import { stateToGrid } from './pvz-state.js'
import { maybe } from '../../../lib/util.js'

export const canPlant = (
  state: PvzState,
  plantName: PlantName,
  row: number, col: number,
  placeType: 'bought' | 'initial'
) => {
  if (!isPos(row, col))
    return { ok: false, reason: 'outOfBounds' } as const

  if (col === 0)
    return { ok: false, reason: 'inMowerCol' } as const

  const grid = stateToGrid(state)

  const idx = getIdx(row, col)

  if (maybe(grid.data[idx].plant))
    return { ok: false, reason: 'plantAlreadyHere' } as const

  const level = getLevel(state.levelId)

  const pIdx = getPlantableIdx(row, col)

  if (!level.plantableTiles[pIdx])
    return { ok: false, reason: 'tileBlocked' } as const

  if (level.plantWhitelist && !level.plantWhitelist.includes(plantName))
    return { ok: false, reason: 'notInWhitelist' } as const

  if (placeType === 'initial') return { ok: true }

  const nextBuy = state.nextBuy.get(plantName) || 0

  if (nextBuy > state.time) {
    return { ok: false, reason: 'buyInCooldown' }
  }

  const plant = plants[plantName]

  if (plant.buyCost > state.sun) {
    return { ok: false, reason: 'cannotAfford' }
  }

  return { ok: true }
}

export type CanPlantResult = ReturnType<typeof canPlant>
