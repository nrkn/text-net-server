import { plants } from '../data/pvz-defs.js'
import { SUN_DROP } from '../pvz-const.js'
import { isPos, getIdx, getPlantableIdx } from '../pvz-util.js'
import { PvzState, PlantName } from '../pvz-types.js'
import { getLevel } from './pvz-sim-util.js'
import { stateToGrid } from './pvz-state.js'
import { maybe } from '../../../lib/util.js'
import { isRow } from '../pvz-guards.js'
import { SpawnDef } from '../data/pvz-def-types.js'

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

  if (placeType === 'initial') return { ok: true } as const

  const nextBuy = state.nextBuy.get(plantName) || 0

  if (nextBuy > state.time) {
    return { ok: false, reason: 'buyInCooldown' } as const
  }

  const plant = plants[plantName]

  if (plant.buyCost > state.sun) {
    return { ok: false, reason: 'cannotAfford' } as const
  }

  return { ok: true } as const
}

export type CanPlantResult = ReturnType<typeof canPlant>

export const canShovel = (
  state: PvzState, row: number, col: number
) => {
  if (!isPos(row, col))
    return { ok: false, reason: 'outOfBounds' } as const

  if (col === 0)
    return { ok: false, reason: 'inMowerCol' } as const

  const grid = stateToGrid(state)

  const idx = getIdx(row, col)

  if (!maybe(grid.data[idx].plant))
    return { ok: false, reason: 'noPlantHere' } as const

  const level = getLevel(state.levelId)

  if (!level.canShovel)
    return { ok: false, reason: 'shovelNotAllowed' } as const

  return { ok: true } as const
}

export type CanShovelResult = ReturnType<typeof canShovel>

export const canLaunchMower = (
  state: PvzState, row: number,
  // manually launched (once per level) or auto launched (zombie in range)
  launchType: 'manual' | 'auto'
) => {
  if (!isRow(row))
    return { ok: false, reason: 'outOfBounds' } as const

  // no point in checking level for initialMowers - covered by state.mowers.get

  const mower = state.mowers.get(row)

  if (!maybe(mower))
    return { ok: false, reason: 'noMowerInRow' } as const

  if (mower.active)
    return { ok: false, reason: 'mowerIsActive' } as const

  if (launchType === 'auto')
    return { ok: true } as const

  if (state.launched)
    return { ok: false, reason: 'alreadyLaunched' } as const

  return { ok: true } as const
}

export type CanLaunchMowerResult = ReturnType<typeof canLaunchMower>

// how much sun should the level spawn between state.time and state.time + dt?
export const levelSunSpawned = (state: PvzState, dt: number): number => {
  const level = getLevel(state.levelId)

  const { firstSun, sunCd } = level

  const t0 = state.time
  const t1 = t0 + dt

  if (t1 < firstSun) return 0

  // count spawns at or before t: floor((t - firstSun) / sunCd) + 1
  // spawns in half-open interval (t0, t1] = atOrBefore(t1) - atOrBefore(t0)
  const atOrBefore = (t: number) =>
    t < firstSun ? 0 : Math.floor((t - firstSun) / sunCd) + 1

  const count = atOrBefore(t1) - atOrBefore(t0)

  return count * SUN_DROP
}

export const zombiesSpawned = (state: PvzState, dt: number) => {
  const level = getLevel(state.levelId)
  const t0 = state.time
  const t1 = t0 + dt
  const result: { spawn: SpawnDef, waveIndex: number }[] = []

  for (let w = 0; w < level.waves.length; w++) {
    const effectiveStart = state.waveStartTimes[w]
    const wave = level.waves[w]

    for (const spawn of wave.spawns) {
      const absTime = effectiveStart + spawn.spawnTime

      if (absTime >= t0 && absTime < t1) {
        result.push({ spawn, waveIndex: w })
      }
    }
  }

  return result
}

export const plantHasTarget = (state: PvzState, plantId: number) => {
  const plant = state.plants.get(plantId)

  if (!maybe(plant)) {
    throw Error(`No plant found for id "${plantId}"`)
  }

  const { row, col } = plant

  for( const [ _id, zombie ] of state.zombies ){
    if( zombie.row !== row ) continue

    if( zombie.x > col ) return true
  }

  return false
}
