import { b } from '../pvz-def-util.js'
import { LevelDef } from '../pvz-def-types.js'

export const level2: LevelDef = {
  id: 2,
  plantableTiles: b(
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ),
  initialPlants: [],
  plantWhitelist: ['peashooter', 'sunflower'],
  initialMowers: b(0, 1, 1, 1, 0),
  canShovel: false,
  initialSun: 50,
  firstSun: 5.5,
  sunCd: 5,
  waves: [
    {
      startTime: 50,
      spawns: [
        { kind: 'normal', spawnTime: 0 }
      ]
    },
    {
      startTime: 60,
      spawns: [
        { kind: 'normal', spawnTime: 0 }
      ]
    },
    {
      startTime: 70,
      spawns: [
        { kind: 'normal', spawnTime: 0 }
      ]
    },
    {
      startTime: 80,
      spawns: [
        { kind: 'normal', spawnTime: 0 },
        { kind: 'normal', spawnTime: 0.35 }
      ]
    },
    {
      startTime: 90,
      spawns: [
        { kind: 'normal', spawnTime: 0 },
        { kind: 'normal', spawnTime: 0.35 }
      ]
    },
    // flag wave
    {
      startTime: 100,
      spawns: [
        { kind: 'normal', spawnTime: 0, },
        { kind: 'normal', spawnTime: 0.35 },
        { kind: 'normal', spawnTime: 0.7 },
        { kind: 'normal', spawnTime: 1.05 },
        { kind: 'normal', spawnTime: 1.4 },
        { kind: 'normal', spawnTime: 1.75 },
        { kind: 'normal', spawnTime: 2.1 },
        { kind: 'normal', spawnTime: 2.45 },
      ]
    }
  ],
  spawnRows: [1, 2, 3]
}