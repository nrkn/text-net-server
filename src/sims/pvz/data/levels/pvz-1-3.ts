import { WaveDef } from '../pvz-def-types.js'
import { b, createLevel, repz } from '../pvz-def-util.js'

const wave = (): WaveDef => ({ fixed: ['normal'] })

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
    // 1
    wave(), 
    // 2
    wave(),
    // 3
    wave(),
    // 4
    { pointsExtra: 2 },
    // 5
    { fixed: ['cone'] },
    // 6
    { pointsExtra: 2, pool: ['cone'] },
    // 7
    { pointsExtra: 2, fixed: ['normal'], pool: ['cone'] },
    // 8 flag wave
    {
      fixed: [...repz(5, 'normal'), 'cone'],
      pool: ['cone'],
      pointMultiplier: 2.5
    }
  ],
  spawnRows: [1, 2, 3]
})