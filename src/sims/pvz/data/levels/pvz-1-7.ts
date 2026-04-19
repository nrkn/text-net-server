import { WaveDef } from '../pvz-def-types.js'
import { createLevel, repz } from '../pvz-def-util.js'

const poolA = (): WaveDef => ({ pool: ['cone'] })
const poolB = (): WaveDef => ({ pool: ['cone', 'poleVaulter'] })

const waveA = (): WaveDef => ({ fixed: ['normal'], ...poolA() })
const waveB = (): WaveDef => ({ pointsExtra: 2, ...poolA() })
const waveC = (): WaveDef => ({ pointsExtra: 2, fixed: ['normal'], ...poolB() })
const waveD = (): WaveDef => ({ pointsExtra: 4, ...poolB() })
const waveE = (): WaveDef => ({ pointsExtra: 4, fixed: ['normal'], ...poolB() })
const waveF = (): WaveDef => ({ pointsExtra: 6, ...poolB() })
const waveG = (): WaveDef => ({ pointsExtra: 6, fixed: ['normal'], ...poolB() })

// note level 1-7 in real game
export const level6 = createLevel({
  id: 6,
  plantWhitelist: [
    'peashooter', 'sunflower', 'cherryBomb', 'wallnut', 'potatoMine', 'snowPea'
  ],
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
    // 10 flag
    {
      pointMultiplier: 2.5,
      pointsExtra: 4,
      fixed: repz(6, 'normal'),
      ...poolB()
    },
    // 11
    waveD(),
    // 12
    waveD(),
    // 13,
    waveE(),
    // 14,
    waveE(),
    // 15,
    waveE(),
    // 16
    waveF(),
    // 17
    waveF(),
    // 18
    waveF(),
    // 19
    waveG(),
    // 20 flag
    {
      pointMultiplier: 2.5,
      pointsExtra: 5,
      fixed: [
        ...repz( 8, 'normal'), 'cone', 'poleVaulter'
      ],
      ...poolB()
    }    
  ]
})