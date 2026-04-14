import { boolish } from '../../../lib/util.js'
import { Spawn, WaveDef } from './pvz-def-types.js'

// flatten and sort earliest first (waves may overlap)
export const flattenWaves = (waves: WaveDef[]): Spawn[] => {
  const result: Spawn[] = []

  for (let w = 0; w < waves.length; w++) {
    const wave = waves[w]

    for (const spawn of wave.spawns) {
      result.push({
        ...spawn,
        absTime: wave.startTime + spawn.spawnTime,
        waveIndex: w
      })
    }
  }

  result.sort((a, b) => a.absTime - b.absTime)

  return result
}

// 0|1 are easier to type and read, but bools are better for the sim
export const b = (...values: number[]) => values.map(boolish)
