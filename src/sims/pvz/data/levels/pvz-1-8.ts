import { WaveDef } from '../pvz-def-types.js'
import { createLevel, repz } from '../pvz-def-util.js'

const poolA = (): WaveDef => ({ pool: ['cone', 'bucket'] })
const poolB = (): WaveDef => ({ pool: ['cone', 'bucket', 'poleVaulter'] })

const waveA = (): WaveDef => ({ fixed: ['normal'], ...poolA() })
const waveB = (): WaveDef => ({ ...poolA() })
const waveC = (): WaveDef => ({ fixed: ['bucket'], ...poolA })
const waveD = (): WaveDef => ({ fixed: ['normal'], ...poolB() })

// note level 1-8 in real game
export const level7 = createLevel({
  id: 7,
  plantWhitelist: [
    'peashooter', 'sunflower', 'cherryBomb', 'wallnut', 'potatoMine', 'snowPea',
    'chomper'
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
    waveC(),
    // 7
    waveD(),
    // 8
    waveD(),
    // 9
    waveD(),
    // 10 flag
    {
      pointMultiplier: 2.5,
      fixed: [
        ...repz(5, 'normal'), 'cone', 'bucket'
      ],
      ...poolB()
    }
  ]
})