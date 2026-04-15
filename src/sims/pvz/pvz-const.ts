export const plantNames = [
  'sunflower', 'peashooter', 'cherryBomb', 'wallnut'
] as const

export const zombieNames = [
  'normal', 'cone', 'bucket'
] as const

export const projectileNames = [
  'pea'
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

export const mowerSpeed = 4.16

// wave acceleration - after WAVE_MIN_TIME seconds, if a wave has lost
// WAVE_HP_THRESHOLD of its total hp, the next wave is rescheduled to 
// start WAVE_ACCEL_DELAY seconds from now
export const WAVE_MIN_TIME = 4
export const WAVE_HP_THRESHOLD = 0.575 // midpoint of 50-65%
export const WAVE_ACCEL_DELAY = 2

// zombie spawn x range - they appear spread out on the right edge
export const SPAWN_X_MIN = BOARD_COLS + 0.25
export const SPAWN_X_MAX = BOARD_COLS + 0.75

export const pvzLogLevels = [
  'none', 'minimal', 'detailed', 'verbose'
] as const

export type PvzLogLevel = typeof pvzLogLevels[number]

export const PVZ_DEFAULT_LOG_LEVEL: PvzLogLevel = 'minimal'