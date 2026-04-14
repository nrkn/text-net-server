import { b, createLevel } from '../pvz-def-util.js'
import { repeat } from '../../../../lib/util.js'

export const level2 = createLevel({
  id: 2,
  plantableTiles: b(
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ),
  plantWhitelist: ['peashooter', 'sunflower'],
  initialMowers: b(0, 1, 1, 1, 0),
  canShovel: false,
  waves: [
    {
      startTime: 50,
      fixed: ['normal']
    },
    {
      startTime: 78,
      fixed: ['normal']
    },
    {
      startTime: 106,
      fixed: ['normal']
    },
    {
      startTime: 134,
      fixed: ['normal', 'normal']
    },
    {
      startTime: 162,
      fixed: ['normal', 'normal']
    },
    // flag wave
    {
      startTime: 190,
      fixed: repeat(8, 'normal')
    }
  ],
  spawnRows: [1, 2, 3]
})