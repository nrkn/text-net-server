import { assertNonZero } from '../lib/util.js'

export const createRandom = (seed: number) => {
  // avoid xorshift32 zero trap
  assertNonZero(seed)

  const next = () => {
    seed ^= seed << 13
    seed ^= seed >> 17
    seed ^= seed << 5
    seed = seed >>> 0

    return seed / 0x100000000
  }

  const nextInt = (exclMax: number) => Math.floor(next() * exclMax)

  // note - upper bound *inclusive*
  const rangeInt = (min: number, max: number) => nextInt(max - min + 1) + min

  const range = (min: number, max: number) => min + next() * (max - min)

  const pick = <T>(values: T[]) => values[nextInt(values.length)]

  const weightedPick = <T>(values: T[], weights: number[]) => {
    let total = 0
    for (const w of weights) total += w

    let r = next() * total

    for (let i = 0; i < values.length; i++) {
      r -= weights[i]
      if (r <= 0) return values[i]
    }

    return values[values.length - 1]
  }

  const consume = (count: number) => {
    for (let i = 0; i < count; i++){
      next()
    }
  }

  const peek = () => seed

  return { next, nextInt, rangeInt, range, pick, weightedPick, consume, peek }
}

export type Random = ReturnType<typeof createRandom>
