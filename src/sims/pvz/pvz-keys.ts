import { PlantName, ZombieName } from './pvz-types.js'

export const plantKeys: Record<PlantName, string> = {
  sunflower: 'S',
  peashooter: 'P',
  cherryBomb: 'X',
  wallnut: 'W',
  potatoMine: 'M'
}

export const zombieKeys: Record<ZombieName, string> = {
  normal: 'Z',
  cone: 'C',
  bucket: 'B',
  poleVaulter: 'V'
}

export const mowerKey = 'L'
export const projectileKey = 'O'
export const grassKey = '.'

// name -> key (all entity types)
export const nameToKey: Record<string, string> = {
  ...plantKeys,
  ...zombieKeys,
  mower: mowerKey,
  pea: projectileKey,
  grass: grassKey
}

// todo - iterate over nameToKey and throw if duplicate keys were found, so
// we don't accidentally reuse a key

// key -> plant name (for command parsing)
export const keyToPlant = new Map<string, PlantName>(
  (Object.entries(plantKeys) as [PlantName, string][]).map(
    ([name, key]) => [key, name]
  )
)
