export const createRandom = (seed: number) => {
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
