import {
  advanceConditions, pvzGameStatus, plantNames, projectileNames, zombieNames,
  effectNames
} from './pvz-const.js'

/*
  ok a pvz sim next :D
*/

export type PlantName = typeof plantNames[number]
export type ZombieName = typeof zombieNames[number]
export type ProjectileName = typeof projectileNames[number]
export type EffectName = typeof effectNames[number]
export type AdvanceCondition = typeof advanceConditions[number]
export type PvzGameStatus = typeof pvzGameStatus[number]

export type ZombieStateSlug = `${ZombieName}:${number}`

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

export type PvzChoosePlantsEvent = {
  type: 'choosePlants'
  seedBank: PlantName[]
}

export type PvzEvent = (
  PvzNewEvent | PvzPlaceEvent | PvzShovelEvent | PvzLaunchMowerEvent |
  PvzAdvanceEvent | PvzAdvanceUntilEvent | PvzChoosePlantsEvent
)

export type PvzEventType = PvzEvent['type']

export type Effect = {
  kind: EffectName
  id: number
  effectTarget: number // the zombie id
  until: number // when it ends
}

export type Zombie = {
  kind: ZombieName
  id: number
  row: number
  // all x units are col as a float, eg halfway across col 5 === 5.5
  x: number

  // rolled from ZombieDef.speed range at spawn
  speed: number

  // remaining hp, whereas ZombieDef.hp is initial hp
  hp: number

  // not sure that we need this to be a plant id, it could just be a boolean
  // because the zombie is always in the adjacent cell to whatever plant it's 
  // biting and we do seem to be leaning towards keeping minimal state where
  // state can be derived
  biteTarget?: number // the plant id

  nextBite?: number // time can next bite, if biteTargetId set

  waveIndex: number

  currState?: number // state machine - 0/undefined = initial
  stateData?: number // generic per-state data, eg vault landing x
}

export type Plant = {
  kind: PlantName
  id: number
  row: number
  col: number

  hp: number

  nextAction: number // time next sun or next projectile is ready

  currState?: number // state machine - 0/undefined = initial
  biteTarget?: number // zombie id, used by chomper
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
  tickEvents: string[]
  
  mowers: Map<number, Mower> // row -> mower
  plants: Map<number, Plant> // id -> plant
  projectiles: Map<number, Projectile> // id -> projectile
  zombies: Map<number, Zombie> // id -> zombie
  effects: Map<number, Effect> // id -> effect

  // time a plant can next be bought
  nextBuy: Map<PlantName, number>

  // chosen plants for this level (auto-filled or via choosePlants event)
  seedBank: PlantName[]
  seedBankSlots: number

  // only one mower may be manually launched per level  
  // we could track which mowers have auto launched, but it can be derived
  // a mower which is active or no longer exists has been auto launched
  // and a manually launched mower will be active
  launched: boolean

  // effective wave start times - mutable copy from level.waves[i].startTime
  // mutated by wave acceleration
  waveStartTimes: number[]

  // separate rng for wave resolution (derive don't store spawns)
  levelRng: number

  // row -> waveIndex when mower fired, for deprioritizing recently mowed rows
  mowerFiredWave: Map<number, number>
  // last picked rows, to combat clumping
  lastPicked: number[]
  secondLastPicked: number[]

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