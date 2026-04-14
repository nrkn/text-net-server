import { createLevel } from '../pvz-def-util.js'

export const level3 = createLevel({
  id: 3,
  plantWhitelist: ['peashooter', 'sunflower', 'cherryBomb'],
  canShovel: false,
  waves: [
    {
      startTime: 50,
      fixed: ['normal'],
      pool: ['cone']
    },
    {
      startTime: 78,
      fixed: ['normal'],
      pool: ['cone']
    },
    {
      startTime: 106,
      fixed: ['normal', 'normal'],
      pool: ['cone']
    },
    {
      startTime: 134,
      fixed: ['normal', 'normal'],
      pool: ['cone', 'bucket']
    },
    {
      startTime: 162,
      fixed: ['normal', 'normal'],
      pool: ['cone', 'bucket']
    },
    {
      startTime: 190,
      fixed: ['normal', 'normal', 'normal'],
      pool: ['cone', 'bucket']
    },
    {
      startTime: 218,
      fixed: ['normal', 'normal', 'normal'],
      pool: ['cone', 'bucket']
    },
    // flag wave
    {
      startTime: 246,
      fixed: ['cone', 'normal', 'normal', 'normal'],
      pool: ['cone', 'bucket'],
      pointMultiplier: 2.5
    }
  ]
})