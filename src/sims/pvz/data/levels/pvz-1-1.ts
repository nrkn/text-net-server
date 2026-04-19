import { WaveDef } from '../pvz-def-types.js'
import { b, createLevel } from '../pvz-def-util.js'

const wave = (): WaveDef => ({ fixed: ['normal'] })

export const level1 = createLevel({
  id: 1,
  plantableTiles: b(
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ),
  plantWhitelist: ['peashooter'],
  initialMowers: b(0, 0, 1, 0, 0),
  canShovel: false,
  initialSun: 150,
  waves: [
    // wave 1
    wave(),
    // wave 2
    wave(),
    // wave 3
    wave(),
    // wave 4
    {
      fixed: ['normal', 'normal']
    }
  ],
  spawnRows: [2]
})