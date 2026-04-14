import { PlantName, ProjectileName, ZombieName } from '../pvz-types.js'

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

export type PlantDef = {
  kind: PlantName

  hp: number

  buyCost: number // how much sun
  buyCd: number // how often can plant  

  actionCd: number // time between shots/sun production

  projectile?: ProjectileName // undefined = doesn't fire (eg sunflower)
}

export type ProjectileDef = {
  kind: ProjectileName
  speed: number // tiles per second
  damage: number
}

export type SpawnDef = {
  kind: ZombieName

  spawnTime: number // offset from start of wave 
  spawnRow?: number // random if undefined
}

export type Spawn = SpawnDef & {
  absTime: number
  waveIndex: number
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

  // can't shovel on some levels, or don't have shovel yet
  canShovel: boolean

  initialSun: number // how much player starts with 
  firstSun: number // when first sun spawns
  // nb - in real game, this is somewhat random?
  // this is fine for now, but keep in mind
  sunCd: number // time between sun spawns

  // in real pvz, some levels pause timers until certain conditions are met,
  // eg in the first tut, sun and wave spawns don't happen until first plant
  // is placed - but we will ignore that for now

  spawns: Spawn[]

  // which rows zombies can spawn on when spawnRow is not set on the spawn
  // if not set, assumes all rows (0..BOARD_ROWS-1)
  spawnRows?: number[]
}