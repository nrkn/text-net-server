export const plantNames = [
  'sunflower', 'peashooter'
] as const

export const zombieNames = [
  'normal', 'cone', 'bucket'
] as const

// later, these may be parameterized, but for now, still useful conditions
export const advanceConditions = [
  // when any zombie spawns
  'zombieSpawn',
  // if any plant buy cooldown is in effect, wait until the next one is ready
  // if all plants are already buyable, does nothing
  'plantReady',
  // sun is collected automatically - it's not a twitch game - so when sun
  // increases as a condition, rather than sunReady
  'sunIncrease'
] as const

export const pvzGameStatus = [
  'playing', 'won', 'lost', 'unplayable'
] as const

export const BOARD_ROWS = 5
export const BOARD_COLS = 10 // 1 for mower + 9 plantable

// nb - the coord system eg C4 assumes 0-9 for cols 
// this keeps things nice and simple 
// if you make BOARD_COLS > 10 you have to fix the coord system
if (BOARD_COLS > 10) throw Error(
  'Multiple places in code rely on BOARD_COLS being 0..9 for single digit ' +
  'formatting; coords, board view etc - go fix them!'
)

// so that sim can throw if you try to run an old log after eg rebalancing
export const PVZ_CURR_VERSION = 0.1

// sun dropped per level spawn (sky sun)
export const SUN_DROP = 25

// tick step - 10ms in seconds
export const FIXED_TICK = 0.01

// until we have proper projectiles
export const peaDamage = 20
