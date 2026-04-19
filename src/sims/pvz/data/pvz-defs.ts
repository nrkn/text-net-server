import { 
  EffectName, PlantName, ProjectileName, ZombieName 
} from '../pvz-types.js'

import { level1 } from './levels/pvz-1-1.js'
import { level2 } from './levels/pvz-1-2.js'
import { level3 } from './levels/pvz-1-3.js'
import { level4 } from './levels/pvz-1-4.js'
import { level5 } from './levels/pvz-1-6.js'
import { level6 } from './levels/pvz-1-7.js'

import { 
  EffectDef, LevelDef, PlantDef, ProjectileDef, ZombieDef 
} from './pvz-def-types.js'

// times are all in seconds, cd = cooldown

export const baseZombie = {
  speed: [0.14, 0.19] as [number, number], // tiles per second
  biteDamage: 4,
  biteCd: 0.04
} as const

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
  },
  poleVaulter: {
    kind: 'poleVaulter',
    hp: 500,
    waveCost: 2,
    ...baseZombie,
    speed: [0.37, 0.41],
    transitions: { 1: { speed: baseZombie.speed } }
  }
}

export const projectiles: Record<ProjectileName, ProjectileDef> = {
  pea: {
    kind: 'pea',
    speed: 4.16,
    damage: 20
  },
  ice: {
    kind: 'ice',
    speed: 4.16,
    damage: 20,
    effect: 'freeze'
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
  },
  wallnut: {
    kind: 'wallnut',
    hp: 4000,
    buyCost: 50,
    buyCd: 30,
    actionCd: Number.MAX_SAFE_INTEGER
  },
  potatoMine: {
    kind: 'potatoMine',
    hp: 300,
    buyCost: 25,
    buyCd: 30,
    actionCd: 15,
    explodes: 'mine'
  },
  snowPea: {
    kind: 'snowPea',
    hp: 300,
    buyCost: 175,
    buyCd: 7.5,
    actionCd: 1.425,
    projectile: 'ice'
  }
}

export const effects: Record<EffectName, EffectDef> = {
  'freeze': {
    kind: 'freeze',
    effectCd: 10,
    multiply: {
      speed: 0.5,
      biteCd: 2
    }
  }
}

export const levels: LevelDef[] = [
  // tutorial 1-1: single strip in middle row
  level1,
  // tutorial 1-2: three strips, adds sunflower
  level2,
  // 1-3: all rows, introduces cone via wave pool, adds cherry bomb
  level3,
  // 1-4: adds wallnut
  level4,
  // 1-6: adds potatoMine, poleVaulter
  // nb we skipped the minigame at 1-5, hence why 1-6 is level 5
  level5,
  // 1-7: adds snowPea
  level6
]
