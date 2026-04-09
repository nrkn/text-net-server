import { advanceConditions, plantNames, zombieNames } from './const.js'

/*
  ok a pvz sim next :D
*/

export type PlantName = typeof plantNames[number]
export type ZombieName = typeof zombieNames[number]
export type AdvanceCondition = typeof advanceConditions[number]

export type PvzNewEvent = {
  type: 'new'
  seed: number
}

export type PvzPlantEvent = {
  type: 'plant'
  name: PlantName
  row: number
  col: number
}

export type PvzShovelEvent = {
  type: 'shovel'
  row: number
  col: number
}

export type PvzLaunchMowerEvent = {
  type: 'launchMower'
  row: number
}

export type PvzAdvanceEvent = {
  type: 'advance'
  seconds: number
}

export type PvzAdvanceUntilEvent = {
  type: 'advanceUntil'
  condition: AdvanceCondition
}

export type PvzEvent = (
  PvzNewEvent | PvzPlantEvent | PvzShovelEvent | PvzLaunchMowerEvent |
  PvzAdvanceEvent | PvzAdvanceUntilEvent
)

export type Tile = {
  plant?: number
  mower?: number // nb - row number - only one per row, so id is row
  zombies: number[]
}

export type Zombie = {
  kind: ZombieName
  id: number
  row: number
  x: number
  speed: number
  hp: number

  // don't need yet - but later
  // an effect is something like { kind: 'frozen', until: number }
  //effects: Effect[]

  eating?: number // the plant id
  nextBite?: number
}

export type Plant = {
  kind: PlantName
  id: number
  row: number
  col: number
  nextAt: number // time next sun or next projectile is ready 
  hp: number
}

export type Mower = {
  row: number
  x: number
  active: boolean
}

export type Projectile = {
  // we don't need this initially - but later we will have eg frozen peas etc
  //kind: ProjectileName 

  id: number
  row: number
  x: number
  speed: number
  damage: number
}

export type PvzState = {
  time: number

  grid: Tile[] // rows * cols

  mowers: Map<number, Mower> // nb key is row number, not id
  plants: Map<number, Plant>
  projectiles: Map<number, Projectile>
  zombies: Map<number, Zombie>

  // time a plant can next be bought
  nextPlant: Map<PlantName,number>

  // only one mower may be manually launched per level
  launched: boolean

  nextId: number

  sun: number

  rng: number
}