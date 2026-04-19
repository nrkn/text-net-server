import { WaveDef } from '../pvz-def-types.js'
import { b, createLevel, repz } from '../pvz-def-util.js'

const waveA = (): WaveDef => ({ fixed: ['normal'] })
const waveB = (): WaveDef => ({ fixed: ['normal', 'normal'] })

export const level2 = createLevel({
  id: 2,
  plantableTiles: b(
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ),
  plantWhitelist: ['peashooter', 'sunflower'],
  initialMowers: b(0, 1, 1, 1, 0),
  canShovel: false,
  waves: [
    // 1
    {
      startTime: 50,
      ...waveA()
    },
    // 2
    waveA(),
    // 3
    waveA(),
    // 4
    waveB(),
    // 5
    waveB(),
    // 6 flag wave
    {
      fixed: repz(5, 'normal')
    }
  ],
  spawnRows: [1, 2, 3]
})