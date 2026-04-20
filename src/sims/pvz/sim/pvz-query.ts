import { plants, zombies, effects as effectDefs } from '../data/pvz-defs.js'
import { BOARD_COLS, plantNames, SUN_DROP } from '../pvz-const.js'
import { isPos, getIdx, getPlantableIdx } from '../pvz-util.js'

import {
  PvzState, PlantName, Zombie, ZombieName, ZombieStateSlug
} from '../pvz-types.js'

import { getLevel } from './pvz-sim-util.js'
import { stateToGrid } from './pvz-state.js'
import { maybe } from '../../../lib/util.js'
import { isRow } from '../pvz-guards.js'
import { WaveDef } from '../data/pvz-def-types.js'
import { createRandom } from '../../random.js'

// highest wave index where waveStartTimes[i] <= state.time, or -1
export const currentWaveIndex = (state: PvzState) => {
  let result = -1

  for (let i = 0; i < state.waveStartTimes.length; i++) {
    if (state.waveStartTimes[i] <= state.time) result = i
  }

  return result
}

export const getPlantPool = (levelId: number): PlantName[] => {
  const level = getLevel(levelId)

  return level.plantWhitelist ?? [...plantNames]
}

export const choosePlantsRequired = (state: PvzState) =>
  getPlantPool(state.levelId).length > state.seedBankSlots

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

  if (!state.seedBank.includes(plantName))
    return { ok: false, reason: 'notInSeedBank' } as const

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

  const level = getLevel(state.levelId)

  if (!level.canLaunch)
    return { ok: false, reason: 'launchNotAllowed' } as const

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

export const deriveWaveSeed = (levelRng: number, waveIndex: number) => {
  const random = createRandom(levelRng)

  random.consume(waveIndex + 1)

  return random.peek()
}

export const resolveWave = (
  wave: WaveDef, waveIndex: number, levelRng: number
): ZombieName[] => {
  const ptMult = wave.pointMultiplier ?? 1
  const budget = ((waveIndex + 1) / 3 + 1) * ptMult

  // fixed spawns always happen - subtract their cost from budget
  let remaining = budget

  const { fixed = [] } = wave

  for (const kind of fixed) {
    remaining -= zombies[kind].waveCost
  }

  // no pool or budget exhausted by fixed spawns
  if (!maybe(wave.pool) || remaining <= 0) return [...fixed]

  // ensure normal is always in the pool
  const pool: ZombieName[] = wave.pool.includes('normal')
    ? [...wave.pool]
    : ['normal', ...wave.pool]

  const random = createRandom(deriveWaveSeed(levelRng, waveIndex))
  const poolResult: ZombieName[] = []

  while (true) {
    const affordable = pool.filter(k => zombies[k].waveCost <= remaining)

    if (affordable.length === 0) break

    const pick = random.pick(affordable)

    remaining -= zombies[pick].waveCost
    poolResult.push(pick)
  }

  return [...fixed, ...poolResult]
}

export const zombiesSpawned = (state: PvzState, dt: number) => {
  const level = getLevel(state.levelId)
  const t0 = state.time
  const t1 = t0 + dt
  const result: { kind: ZombieName, waveIndex: number }[] = []

  for (let w = 0; w < level.waves.length; w++) {
    const effectiveStart = state.waveStartTimes[w]

    if (effectiveStart >= t0 && effectiveStart < t1) {
      const wave = level.waves[w]
      const kinds = resolveWave(wave, w, state.levelRng)

      for (const kind of kinds) {
        result.push({ kind, waveIndex: w })
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

  const def = plants[plant.kind]
  const { row, col } = plant

  for (const [_id, zombie] of state.zombies) {
    if (zombie.row !== row) continue

    if (zombie.x <= col) continue

    if (def.range !== undefined && zombie.x > col + def.range + 1) continue

    return true
  }

  return false
}

export const getZombiesStillEntering = (state: PvzState) => {
  const allZombies = [...state.zombies.values()]

  return allZombies.filter(z => z.x >= BOARD_COLS).sort((a, b) => a.x - b.x)
}

export const getZombieCountForRow = (state: PvzState, row: number) => {
  let count = 0

  for (const zombie of state.zombies.values()) {
    if (zombie.row === row) count++
  }

  return count
}

export const getPlantCds = (state: PvzState) => {
  const result = {} as Record<PlantName, number>

  for (const [name, nextTime] of state.nextBuy) {
    result[name] = Math.max(0, nextTime - state.time)
  }

  return result
}

export const getZombieEffectiveStats = (state: PvzState, zombieId: number) => {
  const zombie = state.zombies.get(zombieId)!
  const def = zombies[zombie.kind]

  let speed = zombie.speed
  let biteCd = def.biteCd

  for (const effect of state.effects.values()) {
    if (effect.effectTarget !== zombieId) continue

    const { multiply } = effectDefs[effect.kind]

    if (!maybe(multiply)) continue

    if (multiply.speed !== undefined) speed *= multiply.speed
    if (multiply.biteCd !== undefined) biteCd *= multiply.biteCd
  }

  return { speed, biteCd }
}

export const zombieMatchesStateSlug = (
  zombie: Zombie, slugs: ZombieStateSlug[]
) => {
  const zState = zombie.currState ?? 0

  for (const slug of slugs) {
    const sep = slug.lastIndexOf(':')
    const kind = slug.slice(0, sep) as ZombieName
    const state = Number(slug.slice(sep + 1))

    if (zombie.kind === kind && zState === state) return true
  }

  return false
}

export const findChomperTarget = (
  state: PvzState, plantId: number
): number | undefined => {
  const plant = state.plants.get(plantId)

  if (!maybe(plant)) return undefined

  const def = plants[plant.kind]
  const { row, col } = plant
  const maxX = maybe(def.range) ? col + def.range + 1 : Infinity

  let closest: Zombie | undefined

  for (const zombie of state.zombies.values()) {
    if (zombie.row !== row) continue
    if (zombie.x < col || zombie.x > maxX) continue

    if (!closest || zombie.x < closest.x) closest = zombie
  }

  return closest?.id
}
