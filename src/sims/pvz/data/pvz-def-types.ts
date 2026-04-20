import { EffectName, PlantName, ProjectileName, ZombieName } from '../pvz-types.js'

// cd = cooldown
// all times are in seconds

export type ZombieDef = {
  kind: ZombieName

  speed: [number, number] // [min, max] tiles per second
  hp: number
  // for now, we will just collide with the zombie's x, but this is more
  // in line with the real game
  //width: number // in tile units - for projectile collision etc

  biteDamage: number // damage to plant being bitten
  biteCd: number // time between bites

  waveCost: number // point cost when spawned from pool

  // stat overrides per currState - eg poleVaulter slows down after vaulting
  transitions?: Partial<Record<number, Partial<ZombieDef>>>
}

export type ExplodeType = '3x3' | 'mine'

export type PlantDef = {
  kind: PlantName

  hp: number

  // we don't need widths on plants at this stage, because even though they're
  // smaller than 1 tile, the amount of overlap a zombie needs to bite them
  // effectively makes them 1 tile wide!

  buyCost: number // how much sun
  buyCd: number // how often can plant  

  actionCd: number // time between shots/sun production etc

  projectile?: ProjectileName // undefined = doesn't fire (eg sunflower)
  explodes?: ExplodeType // area damage on actionCd, self-destructs
}

export type ProjectileDef = {
  kind: ProjectileName
  speed: number // tiles per second
  damage: number  
  effect?: EffectName
}

export type EffectDef = {
  kind: EffectName
  effectCd: number // time it lasts for  
  // later, we should make sure that the string key is something that exists 
  // on zombie eg speed
  multiply?: Record<string,number>
}

export type WaveDef = {
  startTime?: number // absolute time; defaults to 18 for wave[0], prev+28 for later

  fixed?: ZombieName[] // always spawned
  pool?: ZombieName[] // if present, budget remaining after fixed spent on pool
  pointMultiplier?: number // scales budget for flag waves etc
  pointsExtra?: number // after multipler, add extra points to budget
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

  // manual mower launch is a pvz2 feature - off by default
  canLaunch: boolean

  initialSun: number // how much player starts with 
  firstSun: number // when first sun spawns
  // nb - in real game, this is somewhat random?
  // this is fine for now, but keep in mind
  sunCd: number // time between sun spawns

  // in real pvz, some levels pause timers until certain conditions are met,
  // eg in the first tut, sun and wave spawns don't happen until first plant
  // is placed - but we will ignore that for now

  waves: WaveDef[]

  // which rows zombies can spawn on when spawnRow is not set on the spawn
  // if not set, assumes all rows (0..BOARD_ROWS-1)
  spawnRows?: number[]
}

type DesignKeys = 'id' | 'waves'

export type LevelDefDefault = Omit<LevelDef, DesignKeys>

export type LevelDefDesign = Partial<LevelDef> & Pick<LevelDef, DesignKeys>
