import { PlantName, ProjectileName, ZombieName } from '../pvz-types.js'
import { level1 } from './levels/pvz-1-1.js'
import { level2 } from './levels/pvz-1-2.js'
import { level3 } from './levels/pvz-1-3.js'
import { LevelDef, PlantDef, ProjectileDef, ZombieDef } from './pvz-def-types.js'

// times are all in seconds, cd = cooldown

const baseZombie = {
  speed: [0.14, 0.19] as [number, number], // tiles per second
  biteDamage: 4,
  biteCd: 0.04
}

export const zombies: Record<ZombieName, ZombieDef> = {
  normal: {
    kind: 'normal',
    hp: 270,
    waveCost: 1,
    ...baseZombie
  },
  cone: {
    kind: 'cone',
    hp: 640,
    waveCost: 2,
    ...baseZombie
  },
  bucket: {
    kind: 'bucket',
    hp: 1370,
    waveCost: 4,
    ...baseZombie
  }
}

export const projectiles: Record<ProjectileName, ProjectileDef> = {
  pea: {
    kind: 'pea',
    speed: 4.16,
    damage: 20
  }
}

export const plants: Record<PlantName, PlantDef> = {
  sunflower: {
    kind: 'sunflower',
    hp: 300,
    buyCost: 50,
    buyCd: 7.5,
    actionCd: 24
  },
  peashooter: {
    kind: 'peashooter',
    hp: 300,
    buyCost: 100,
    buyCd: 7.5,
    actionCd: 1.425,
    projectile: 'pea'
  },
  cherryBomb: {
    kind: 'cherryBomb',
    hp: Number.MAX_SAFE_INTEGER,
    buyCost: 150,
    buyCd: 50,
    actionCd: 1,
    explodes: '3x3'
  }
}

export const levels: LevelDef[] = [
  // tutorial 1-1: single strip in middle row
  level1,
  // tutorial 1-2: three strips, adds sunflower
  level2,
  // 1-3: all rows, introduces cone via wave pool, adds cherry bomb
  level3
]
