import { cloneMap, maybe, seq } from '../../../lib/util.js'
import { BOARD_COLS, BOARD_ROWS } from '../pvz-const.js'
import { getIdx } from '../pvz-util.js'

import {
  Effect,
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

const mobCol = (mob: Mob) => Math.floor(mob.x)

const isOnBoard = (mob: Mob) => {
  const col = mobCol(mob)
  return col >= 0 && col < BOARD_COLS
}

const mobIdx = (mob: Mob) => getIdx(mob.row, mobCol(mob))

// shouldn't have been able to plant outside the board!
const staticIdx = (sta: Static) => getIdx(sta.row, sta.col)

export const stateToGrid = (state: PvzState) => {
  const grid: PvzGrid = {
    data: seq(BOARD_ROWS * BOARD_COLS, () => ({
      zombies: [],
      projectiles: []
    }))
  }

  for (const [id, zombie] of state.zombies) {
    if (!isOnBoard(zombie)) continue

    grid.data[mobIdx(zombie)].zombies.push(id)
  }

  for (const [id, plant] of state.plants) {
    grid.data[staticIdx(plant)].plant = id
  }

  for (const [row, mower] of state.mowers) {
    if (!isOnBoard(mower)) continue

    grid.data[mobIdx(mower)].mower = row
  }

  for (const [id, proj] of state.projectiles) {
    if (!isOnBoard(proj)) continue

    grid.data[mobIdx(proj)].projectiles.push(id)
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
    effects: new Map<number,Effect>(),

    nextBuy: new Map<PlantName, number>(),

    launched: false,

    // skip 0, someone somewhere might check an id for truthiness
    nextId: 1,

    sun: 0,

    waveStartTimes: [],
    levelRng: 0,
    mowerFiredWave: new Map<number, number>(),
    lastPicked: [],
    secondLastPicked: [],

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
  effects: cloneMap(state.effects),

  nextBuy: cloneMap(state.nextBuy),

  waveStartTimes: [...state.waveStartTimes],
  levelRng: state.levelRng,
  mowerFiredWave: cloneMap(state.mowerFiredWave),
  lastPicked: [ ...state.lastPicked ],
  secondLastPicked: [ ...state.secondLastPicked ]
})

// on new event, clone and reset error
export const newEventState = (state: PvzState) => ({
  ...cloneState(state),
  tickEvents: [],
  error: undefined
})

