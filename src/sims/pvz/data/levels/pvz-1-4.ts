import { WaveDef } from '../pvz-def-types.js'
import { createLevel, repz } from '../pvz-def-util.js'

const pool = (): WaveDef => ({ pool: ['cone'] })
const waveA = (): WaveDef => ({ fixed: ['normal'], ...pool() })
const waveB = (): WaveDef => ({ pointsExtra: 2, ...pool() })
const waveC = (): WaveDef => ({ fixed: ['normal'], ...waveB() })

export const level4 = createLevel({
  id: 4,
  plantWhitelist: ['peashooter', 'sunflower', 'cherryBomb', 'wallnut'],
  canShovel: false,
  waves: [
    // 1
    waveA(),
    // 2
    waveA(),
    // 3 
    waveA(),
    // 4 
    waveB(),
    // 5
    waveB(),
    // 6
    waveB(),
    // 7
    waveC(),
    // 8
    waveC(),
    // 9
    waveC(),
    // 10 flag wave
    {
      pointsExtra: 2,
      pointMultiplier: 2.5,
      fixed: [...repz(6, 'normal'), 'cone'],
      ...pool()
    }
  ]
})