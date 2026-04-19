import { WaveDef } from '../pvz-def-types.js'
import { createLevel, repz } from '../pvz-def-util.js'

// nb - 1-6 in normal game - we skipped wallnut bowling minigame at 1-5

const poolA = (): WaveDef => ({ pool: ['cone'] })
const poolB = (): WaveDef => ({ pool: ['cone', 'poleVaulter'] })

const waveA = (): WaveDef => ({ fixed: ['normal'], ...poolA() })
const waveB = (): WaveDef => ({ pointsExtra: 2, ...poolA() })
const waveC = (): WaveDef => ({ pointsExtra: 2, fixed: ['normal'], ...poolB() })

export const level5 = createLevel({
  id: 5,
  plantWhitelist: [
    'peashooter', 'sunflower', 'cherryBomb', 'wallnut', 'potatoMine'
  ],
  waves: [
    // 1
    waveA(),
    // 2
    waveA(),
    // 3 
    waveA(),
    // 4,
    waveB(),
    // 5,
    waveB(),
    // 6:
    { fixed: ['poleVaulter'], ...poolA() },
    // 7
    waveC(),
    // 8
    waveC(),
    // 9
    waveC(),
    // 10 flag wave
    {
      pointMultiplier: 2.5,
      fixed: [
        ...repz(6, 'normal'),
        'cone',
        'poleVaulter'
      ],
      ...poolB()
    }
  ]
})

