import { createLevel } from '../pvz-def-util.js'

export const level3 = createLevel({
  id: 3,
  plantWhitelist: ['peashooter', 'sunflower', 'cherryBomb'],
  canShovel: false,
  waves: [
    { startTime: 18, fixed: [], pool: ['cone'] },
    { startTime: 46, fixed: [], pool: ['cone'] },
    { startTime: 74, fixed: [], pool: ['cone'] },
    { startTime: 102, fixed: [], pool: ['cone'] },
    { startTime: 130, fixed: ['cone'], pool: ['cone'] },
    { startTime: 158, fixed: [], pool: ['cone'] },
    { startTime: 186, fixed: [], pool: ['cone'] },
    // flag wave
    {
      startTime: 214,
      fixed: ['cone'],
      pool: ['cone'],
      pointMultiplier: 2.5
    }
  ]
})