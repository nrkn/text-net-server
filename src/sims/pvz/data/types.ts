import { PlantName, ZombieName } from '../types.js'

export type ZombieDef = {
  kind: ZombieName
  speed: number
  hp: number
  // bite damage
  damage: number
  // time between bites
  cooldown: number
}

// for now, we will hard code projectile firing vs sun etc based on PlantName
// later, plant def will carry more info
export type PlantDef = {
  kind: PlantName
  cost: number // how much sun
  buyCool: number // how often can plant
  hp: number
  // time between shots/sun production
  cooldown: number
}

export type SpawnDef = {
  kind: ZombieName
  time: number // offset from start of wave
  row?: number // random if undefined
}

export type WaveDef = {
  time: number // absolute time of the wave start
  spawns: SpawnDef[]
}

export type LevelDef = {
  // almost always 10 cols (1 col mowers, 9 plantable) x 5 rows
  // but let's be flexible
  rows: number
  cols: number
  
  // in the tutorial levels, only one or three rows are used, but the whole
  // board is displayed
  // then, in later levels, some tiles are blocked
  plantable: boolean[] // rows * cols
  initial: (PlantName | null)[] // rows * cols
  // some levels restrict plants
  whitelist?: PlantName[]

  // some levels give you no mowers as a challenge
  mowers: boolean
  
  sun: {
    // how much player starts with
    initial: number
    // when first sun spawns
    firstSpawn: number
    // time between sun spawns
    cooldown: number
  }

  waves: WaveDef[]
}