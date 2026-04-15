import { repeat } from '../../../../lib/util.js'
import { createLevel } from '../pvz-def-util.js'

export const level4 = createLevel({
  id: 4,
  plantWhitelist: ['peashooter', 'sunflower', 'cherryBomb', 'wallnut'],
  canShovel: false,
  waves: [
    { startTime: 18, pool: ['cone'] },
    { startTime: 46, pool: ['cone'] },
    { startTime: 74, pool: ['cone'] },
    { startTime: 102, pool: ['cone'] },
    { startTime: 130, pool: ['cone'] },
    { startTime: 158, pool: ['cone'] },
    { startTime: 186, pool: ['cone'] },
    { startTime: 214, pool: ['cone'] },
    { startTime: 242, pool: ['cone'] },
    // flag wave
    {
      startTime: 270,
      fixed: repeat(4, 'normal'),
      pointMultiplier: 2.5
    }
  ]
})