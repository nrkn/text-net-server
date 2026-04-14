import { cloneMap, maybe, seq } from '../../../lib/util.js'
import { BOARD_COLS, BOARD_ROWS } from '../pvz-const.js'
import { getIdx } from '../pvz-util.js'

import {
  Mower, Plant, PlantName, Projectile, PvzGrid, PvzState, Zombie
} from '../pvz-types.js'

// # state utils

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
    levelId: 1,

    status: 'playing',
    tickEvents: [],

    mowers: new Map<number, Mower>(),
    plants: new Map<number, Plant>(),
    projectiles: new Map<number, Projectile>(),
    zombies: new Map<number, Zombie>(),

    nextBuy: new Map<PlantName, number>(),

    launched: false,

    // skip 0, someone somewhere might check an id for truthiness
    nextId: 1,

    sun: 0,

    waveStartTimes: [],

    rng
  }

  return state
}

export const cloneState = (
  state: PvzState
): PvzState => ({
  ...state,

  tickEvents: [...state.tickEvents],
  error: maybe(state.error) ? { ...state.error } : undefined,

  mowers: cloneMap(state.mowers),
  plants: cloneMap(state.plants),
  projectiles: cloneMap(state.projectiles),
  zombies: cloneMap(state.zombies),

  nextBuy: cloneMap(state.nextBuy),

  waveStartTimes: [...state.waveStartTimes]
})

// on new event, clone and reset error
export const newEventState = (state: PvzState) => ({
  ...cloneState(state),
  tickEvents: [],
  error: undefined
})

