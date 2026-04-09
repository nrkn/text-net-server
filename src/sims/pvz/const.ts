export const plantNames = [
  'sunflower', 'peashooter'
] as const

export const zombieNames = [
  'normal', 'cone', 'bucket'
] as const

export const advanceConditions = [
  'zombieSpawn', 'plantReady', 
  // sun is collected automatically - it's not a twitch game - so when sun
  // increases as a condition, rather than sunReady
  'sunIncrease'
] as const