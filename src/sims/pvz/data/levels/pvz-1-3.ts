import { b, createLevel } from '../pvz-def-util.js'

export const level3 = createLevel({
  id: 3,
  plantableTiles: b(
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ),
  plantWhitelist: ['peashooter', 'sunflower', 'cherryBomb'],
  initialMowers: b(0, 1, 1, 1, 0),
  canShovel: false,
  waves: [
    { startTime: 18, pool: ['cone'] },
    { startTime: 46, pool: ['cone'] },
    { startTime: 74, pool: ['cone'] },
    { startTime: 102, pool: ['cone'] },
    { startTime: 130, fixed: ['cone'], pool: ['cone'] },
    { startTime: 158, pool: ['cone'] },
    { startTime: 186, pool: ['cone'] },
    // flag wave
    {
      startTime: 214,
      fixed: ['cone'],
      pool: ['cone'],
      pointMultiplier: 2.5
    }
  ],
  spawnRows: [1, 2, 3]
})