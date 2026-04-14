import { b, createLevel } from '../pvz-def-util.js'

export const level1 = createLevel({
  id: 1,
  plantableTiles: b(
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ),
  plantWhitelist: ['peashooter'],
  initialMowers: b(0, 0, 1, 0, 0),
  canShovel: false,
  initialSun: 150,
  waves: [
    // wave 1
    {
      startTime: 18,
      fixed: ['normal']
    },
    // wave 2
    {
      startTime: 46,
      fixed: ['normal']
    },
    // wave 3
    {
      startTime: 74,
      fixed: ['normal']
    },
    // wave 4
    {
      startTime: 102,
      fixed: ['normal', 'normal']
    }
  ],
  spawnRows: [2]
})