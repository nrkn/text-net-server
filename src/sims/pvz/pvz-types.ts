import { 
  advanceConditions, pvzGameStatus, plantNames, projectileNames, zombieNames 
} from './pvz-const.js'

/*
  ok a pvz sim next :D
*/

export type PlantName = typeof plantNames[number]
export type ZombieName = typeof zombieNames[number]
export type ProjectileName = typeof projectileNames[number]
export type AdvanceCondition = typeof advanceConditions[number]
export type PvzGameStatus = typeof pvzGameStatus[number]

export type PvzNewEvent = {
  type: 'new'
  levelId: number
  seed: number
  // so that sim can throw if you try to run an old log after eg rebalancing
  version: number
}

export type PvzPlaceEvent = {
  type: 'place'
  plantName: PlantName
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
  PvzNewEvent | PvzPlaceEvent | PvzShovelEvent | PvzLaunchMowerEvent |
  PvzAdvanceEvent | PvzAdvanceUntilEvent
)

export type PvzEventType = PvzEvent['type']

export type Zombie = {
  kind: ZombieName
  id: number
  row: number
  // all x units are col as a float, eg halfway across col 5 === 5.5
  x: number

  // not needed - defined by ZombieDef, later ZombieDef + Effects
  // speed: number

  // remaining hp, whereas ZombieDef.hp is initial hp
  hp: number

  // don't need yet - but later
  // an effect is something like { kind: 'frozen', until: number }
  //effects: Effect[]

  // not sure that we need this to be a plant id, it could just be a boolean
  // because the zombie is always in the adjacent cell to whatever plant it's 
  // biting and we do seem to be leaning towards keeping minimal state where
  // state can be derived
  biteTarget?: number // the plant id

  nextBite?: number // time can next bite, if biteTargetId set
}

export type Plant = {
  kind: PlantName
  id: number
  row: number
  col: number

  hp: number

  nextAction: number // time next sun or next projectile is ready    
}

export type Mower = {
  row: number
  x: number

  active: boolean // false = sitting in start lane, true = moving
}

export type Projectile = {
  kind: ProjectileName
  id: number
  row: number
  x: number
  speed: number
  damage: number
}

export type PvzActionFailed = {
  ok: false
  event: PvzEventType
  reason: string
  message?: string
}

export type PvzState = {
  time: number  
  levelId: number

  status: PvzGameStatus
  error?: PvzActionFailed
  // we can make it a more complex type later
  tickEvents: string[]

  // not needed, can be derived from entity maps below
  // grid: Tile[] // rows * cols

  mowers: Map<number, Mower> // row -> mower
  plants: Map<number, Plant> // id -> plant
  projectiles: Map<number, Projectile> // id -> projectile
  zombies: Map<number, Zombie> // id -> zombie

  // time a plant can next be bought
  nextBuy: Map<PlantName, number>

  // only one mower may be manually launched per level  
  // we could track which mowers have auto launched, but it can be derived
  // a mower which is active or no longer exists has been auto launched
  // and a manually launched mower will be active
  launched: boolean

  // we could track the next wave/spawn but they can be derived

  nextId: number

  sun: number

  rng: number
}

// derived from state:

export type PvzTile = {
  plant?: number
  mower?: number // nb - row number - only one per row, so id is row
  zombies: number[]
  projectiles: number[]
}

export type PvzGrid = {
  data: PvzTile[] // rows * cols
}