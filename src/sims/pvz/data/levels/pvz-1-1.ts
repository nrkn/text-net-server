import { b, flattenWaves } from '../pvz-def-util.js'
import { LevelDef } from '../pvz-def-types.js'

export const level1: LevelDef = {
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
  canShovel: false,
  initialSun: 150,
  firstSun: 5.5,
  sunCd: 5,
  spawns: flattenWaves(
    [
      // wave 1
      {
        startTime: 18,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          }
        ]
      },
      // wave 2
      {
        startTime: 28,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          }
        ]
      },
      // wave 3
      {
        startTime: 38,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          }
        ]
      },
      // wave 4
      {
        startTime: 48,
        spawns: [
          {
            kind: 'normal',
            spawnTime: 0,
            spawnRow: 2
          },
          {
            kind: 'normal',
            // last wave comes out about ~1 step apart
            spawnTime: 0.35,
            spawnRow: 2
          }
        ]
      }
    ]
  )
}