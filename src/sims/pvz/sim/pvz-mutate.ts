import { plants } from '../data/pvz-defs.js'
import { PvzState, PlantName, Plant } from '../pvz-types.js'

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
  const { hp, buyCost, buyCd } = plants[kind]
  const nextAction = 0

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
