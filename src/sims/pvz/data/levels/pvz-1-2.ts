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
        { kind: 'normal' }
      ]
    },
    {
      startTime: 78,
      spawns: [
        { kind: 'normal' }
      ]
    },
    {
      startTime: 106,
      spawns: [
        { kind: 'normal' }
      ]
    },
    {
      startTime: 134,
      spawns: [
        { kind: 'normal' },
        { kind: 'normal' }
      ]
    },
    {
      startTime: 162,
      spawns: [
        { kind: 'normal' },
        { kind: 'normal' }
      ]
    },
    // flag wave
    {
      startTime: 190,
      spawns: [
        { kind: 'normal' },
        { kind: 'normal' },
        { kind: 'normal' },
        { kind: 'normal' },
        { kind: 'normal' },
        { kind: 'normal' },
        { kind: 'normal' },
        { kind: 'normal' },
      ]
    }
  ],
  spawnRows: [1, 2, 3]
}