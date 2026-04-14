import { boolish } from '../../../lib/util.js'

// 0|1 are easier to type and read, but bools are better for the sim
export const b = (...values: number[]) => values.map(boolish)
