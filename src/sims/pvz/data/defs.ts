import { boolish } from '../../../lib/util.js'
import { PlantName, ZombieName } from '../types.js'
import { LevelDef, PlantDef, ZombieDef } from './types.js'

const baseZombie = {
  speed: 0.23,
  biteDamage: 100,
  biteCd: 1
} as const

export const zombies: Record<ZombieName, ZombieDef> = {
  normal: {
    kind: 'normal',
    hp: 200,
    ...baseZombie
  },
  cone: {
    kind: 'cone',
    hp: 560,
    ...baseZombie
  },
  bucket: {
    kind: 'bucket',
    hp: 1300,
    ...baseZombie
  }
}

export const plants: Record<PlantName, PlantDef> = {
  sunflower: {
    kind: 'sunflower',
    hp: 200,
    buyCost: 50,
    buyCd: 7.5,
    actionCd: 24
  },
  peashooter: {
    kind: 'peashooter',
    hp: 300,
    buyCost: 100,
    buyCd: 7.5,
    actionCd: 1.425
  }
}

// 0|1 are easier to type and read, but bools are better for the sim
const b = (...values: number[]) => values.map(boolish)

export const levels: LevelDef[] = [
  // tutorial 1-1: single strip in middle row
  {
    id: 1,
    plantableTiles: b(
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, 1, 1, 1, 1, 1, 1, 1, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ),
    initialPlants: [],
    plantWhitelist: ['peashooter'],
    initialMowers: b(0, 0, 1, 0, 0),
    initialSun: 150,
    firstSun: 5,
    sunCd: 5,
    waves: [
      {
        startTime: 15,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          }
        ]
      },
      {
        startTime: 25,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          }
        ]
      },
      {
        startTime: 35,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          }
        ]
      },
      {
        startTime: 45,        
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          },
          {
            kind: 'normal',
            // last wave comes out about ~1 step apart
            spawnTime: 0.23,
            spawnRow: 2
          }
        ]
      }
    ]
  }
]