import { boolish, repeat } from '../../../lib/util.js'
import { BOARD_COLS, BOARD_ROWS } from '../pvz-const.js'
import { ZombieName } from '../pvz-types.js'
import { defaultLevel } from './levels/pvz-default-level.js'
import { LevelDef, LevelDefDesign } from './pvz-def-types.js'

// 0|1 are easier to type and read, but bools are better for the sim
export const b = (...values: number[]) => values.map(boolish)

export const allTiles = () => repeat(BOARD_ROWS * (BOARD_COLS - 1), true)
export const allMowers = () => repeat(BOARD_ROWS, true)

export const createLevel = (level: LevelDefDesign): LevelDef => ({
  ...defaultLevel(),
  ...level
})

export const repz = (count: number, name: ZombieName) => repeat(count, name)