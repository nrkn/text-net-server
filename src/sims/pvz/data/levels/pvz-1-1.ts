import { b } from '../pvz-def-util.js'
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
  waves:
    [
      // wave 1
      {
        startTime: 18,
        spawns: [
          { kind: 'normal', spawnRow: 2 }
        ]
      },
      // wave 2
      {
        startTime: 46,
        spawns: [
          { kind: 'normal', spawnRow: 2 }
        ]
      },
      // wave 3
      {
        startTime: 74,
        spawns: [
          { kind: 'normal', spawnRow: 2 }
        ]
      },
      // wave 4
      {
        startTime: 102,
        spawns: [
          { kind: 'normal', spawnRow: 2 },
          { kind: 'normal', spawnRow: 2 }
        ]
      }
    ],
  spawnRows: [2]
}