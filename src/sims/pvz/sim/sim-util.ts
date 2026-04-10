import { seq } from '../../../lib/util.js'
import { BOARD_COLS, BOARD_ROWS } from '../const.js'
import { LevelDef } from '../data/def-types.js'
import { getIdx, getPlantableIdx, isPos } from '../pvz-util.js'

import {
  Mower, Plant, PlantName, Projectile, PvzGrid, PvzState, Zombie
} from '../sim-types.js'

type Mob = {
  row: number
  x: number
}

type Static = {
  row: number
  col: number
}

// entities that have left the map or haven't entered it properly shouldn't be 
// in state anymore - if they are, something went wrong, getIdx will throw
// as it calls assertPos
const mobIdx = (mob: Mob) => getIdx(mob.row, Math.floor(mob.x))

// as above - shouldn't have been able to plant outside the board!
const staticIdx = (sta: Static) => getIdx(sta.row, sta.col)

export const stateToGrid = (state: PvzState) => {
  const grid: PvzGrid = {
    data: seq(BOARD_ROWS * BOARD_COLS, () => ({
      zombies: [],
      projectiles: []
    }))
  }

  for (const [id, zombie] of state.zombies) {
    const tile = grid.data[mobIdx(zombie)]

    tile.zombies.push(id)
  }

  for (const [id, plant] of state.plants) {
    const tile = grid.data[staticIdx(plant)]

    tile.plant = id
  }

  for (const [row, mower] of state.mowers) {
    const tile = grid.data[mobIdx(mower)]

    tile.mower = row
  }

  for (const [id, proj] of state.projectiles) {
    const tile = grid.data[mobIdx(proj)]

    tile.projectiles.push(id)
  }

  return grid
}

export const newState = (rng = Date.now()) => {
  const state: PvzState = {
    time: 0,
    status: 'playing',
    levelId: 1,

    mowers: new Map<number, Mower>(),
    plants: new Map<number, Plant>(),
    projectiles: new Map<number, Projectile>(),
    zombies: new Map<number, Zombie>(),

    nextBuy: new Map<PlantName, number>(),

    launched: false,

    // skip 0, someone somewhere might check an id for truthiness
    nextId: 1,

    sun: 0,

    rng
  }

  return state
}

// note - mutates state - fine to use inside an event, don't use it outside
export const issueId = (state: PvzState) => {
  const id = state.nextId

  state.nextId++

  return id
}

export const canPlant = (
  grid: PvzGrid,
  level: LevelDef,
  plantName: PlantName,
  row: number, col: number
) => {
  if (!isPos(row, col))
    return { ok: false, reason: 'outOfBounds' } as const

  if (col === 0)
    return { ok: false, reason: 'inMowerCol' } as const

  const idx = getIdx(row, col)

  if (grid.data[idx].plant !== undefined)
    return { ok: false, reason: 'plantAlreadyHere' } as const

  const pIdx = getPlantableIdx(row, col)

  if (!level.plantableTiles[pIdx])
    return { ok: false, reason: 'tileBlocked' } as const

  if (level.plantWhitelist && !level.plantWhitelist.includes(plantName))
    return { ok: false, reason: 'notInWhitelist' } as const

  return { ok: true }
}