import { PlantName, ZombieName } from '../types.js'

// cd = cooldown
// all times are in seconds

export type ZombieDef = {
  kind: ZombieName

  speed: number // tiles per second
  hp: number
  // for now, we will just collide with the zombie's x, but this is more
  // in line with the real game
  //width: number // in tile units - for projectile collision etc

  biteDamage: number // damage to plant being bitten
  biteCd: number // time between bites
}

// for now, we will hard code projectile firing vs sun etc based on PlantName
// later, plant def will carry more info, and projectiles will have their own
// defs
export type PlantDef = {
  kind: PlantName

  hp: number

  // do plants have a width? or are they just assumed to be a full tile?
  // similar to zombie above - we'll treat them like a full tile for now, later
  // we may add a width

  buyCost: number // how much sun
  buyCd: number // how often can plant  

  actionCd: number // time between shots/sun production
}

export type SpawnDef = {
  kind: ZombieName

  spawnTime: number // offset from start of wave 
  spawnRow?: number // random if undefined
}

export type WaveDef = {
  startTime: number // absolute time of the wave start

  spawns: SpawnDef[]
}

export type LevelDef = {
  id: number

  // always 10 cols (1 col mowers, 9 plantable) x 5 rows
  // so we will remove from level def and have them hardcoded for now
  // later, we might allow special levels with different sizes
  // rows: number
  // cols: number

  // in the tutorial levels, only one or three rows are used, but the whole
  // board is displayed
  // then, in later levels, some tiles are blocked
  plantableTiles: boolean[] // rows * ( cols - 1 ); you can never plant in col 0
  initialPlants: (PlantName | null | undefined)[] // rows * ( cols - 1 )
  // some levels restrict plants
  plantWhitelist?: PlantName[]

  // some levels give you no mowers as a challenge
  initialMowers: boolean[] // rows

  initialSun: number // how much player starts with 
  firstSun: number // when first sun spawns
  // nb - in real game, this is somewhat random?
  // this is fine for now, but keep in mind
  sunCd: number // time between sun spawns

  // in real pvz, some levels pause timers until certain conditions are met,
  // eg in the first tut, sun and wave spawns don't happen until first plant
  // is placed - but we will ignore that for now

  waves: WaveDef[]
}