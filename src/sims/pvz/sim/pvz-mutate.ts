import { maybe } from '../../../lib/util.js'
import { plants, zombies } from '../data/pvz-defs.js'
import { BOARD_COLS } from '../pvz-const.js'
import { PvzState, PlantName, Plant, ZombieName, Zombie } from '../pvz-types.js'
import { formatPos, formatRow, getIdx } from '../pvz-util.js'
import { stateToGrid } from './pvz-state.js'

// note - mutates state - use only *inside* events

export const issueId = (state: PvzState) => {
  const id = state.nextId

  state.nextId++

  return id
}

// if you don't guard behind canPlace bad things will happen
export const placePlant = (
  state: PvzState, kind: PlantName, row: number, col: number,
  placeType: 'bought' | 'initial'
) => {
  const id = issueId(state)
  const { hp, buyCost, buyCd, actionCd } = plants[kind]

  // matches pvz - peashooters only feel like they shoot immediately because
  // cd is so low
  const nextAction = state.time + actionCd

  const plant: Plant = { kind, id, row, col, hp, nextAction }

  state.plants.set(id, plant)

  if (placeType === 'bought') {
    state.nextBuy.set(kind, state.time + buyCd)
    state.sun -= buyCost

    return
  }

  if (placeType === 'initial') return

  throw Error(`Unexpected placeType "${placeType}"`)
}

// guard behind eg canShovel
// nb - does not clear zombie.biteTarget - advance reducer should handle
// zombies whose biteTarget no longer exists (eg shovelled)
export const removePlant = (
  state: PvzState, row: number, col: number
) => {
  const grid = stateToGrid(state)

  const idx = getIdx(row, col)

  const tile = grid.data[idx]

  const plantId = tile.plant

  // if guarded, should never happen - so throw Error
  if (!maybe(plantId)) {
    throw Error(`No plant found to remove at "${formatPos(row, col)}}"`)
  }

  // same
  if (!state.plants.delete(plantId)) {
    throw Error(`No plant with id "${plantId}" in state`)
  }
}

// guard behind canLaunchMower
export const launchMower = (
  state: PvzState, row: number, launchType: 'manual' | 'auto'
) => {
  const mower = state.mowers.get(row)

  // shouldn't happen - something has gone wrong
  if (!maybe(mower)) {
    throw Error(`No mower found to launch at "${formatRow(row)}"`)
  }

  mower.active = true

  if (launchType === 'manual') state.launched = true
}

export const spawnZombie = (
  state: PvzState, kind: ZombieName, row: number, waveIndex: number
) => {
  const id = issueId(state)
  const { hp } = zombies[kind]
  // oob - but it will move in the same turn that it spawned and be inside the 
  // grid
  const x = BOARD_COLS

  const zombie: Zombie = { kind, id, row, x, hp, waveIndex }

  state.zombies.set(id, zombie)

  return id
}