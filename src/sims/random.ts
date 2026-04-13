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

  const peek = () => seed

  return { next, nextInt, peek }
}

export type Random = ReturnType<typeof createRandom>
