import { maybe } from '../../../lib/util.js'
import { createRandom, Random } from '../../random.js'
import { plants, projectiles, zombies } from '../data/pvz-defs.js'

import {
  BOARD_COLS, BOARD_ROWS, FIXED_TICK, mowerSpeed, SUN_DROP,
  WAVE_MIN_TIME, WAVE_HP_THRESHOLD, WAVE_ACCEL_DELAY,
  SPAWN_X_MIN, SPAWN_X_MAX
} from '../pvz-const.js'

import {
  AdvanceCondition, Mower, Plant, Projectile, PvzState, Zombie
} from '../pvz-types.js'

import { formatPos, formatRow } from '../pvz-util.js'
import { issueId, spawnZombie } from './pvz-mutate.js'
import { levelSunSpawned, plantHasTarget, resolveWave, zombiesSpawned } from './pvz-query.js'
import { actionFail, getLevel } from './pvz-sim-util.js'

// tick!

type Log = (entry: string) => void

const winHandler = (state: PvzState, log: Log) => {
  // has the last spawn already happened, but there are no zombies left?
  const lastSpawnTime = state.waveStartTimes.at(-1)!

  const maybeWin = () => {
    if (state.time < lastSpawnTime + FIXED_TICK) return false
    if (state.zombies.size > 0) return false

    log('won')
    state.status = 'won'

    return true
  }

  return maybeWin
}

export const tick = (state: PvzState, dt: number) => {
  const random = createRandom(state.rng)

  const log = (entry: string) => { state.tickEvents.push(entry) }

  const maybeWin = winHandler(state, log)

  const ticks = Math.floor(dt / FIXED_TICK)

  for (let i = 0; i < ticks; i++) {
    tickFixed(state, random, log)

    if (maybeWin()) break
  }

  state.rng = random.peek()
}

const MAX_TICKS = 600000

type IsCondition = (entry: string) => boolean

const isSunIncrease = (entry: string) =>
  entry.includes('sunDropped') || entry.includes('spawnedSun')

const isZombieSpawn = (entry: string) =>
  entry.includes('zombieSpawned')

const conditionTests: Record<AdvanceCondition, IsCondition> = {
  sunIncrease: isSunIncrease,
  zombieSpawn: isZombieSpawn,
  // placeholder - we won't check logs for it, it doesn't log
  plantReady: () => false
}

const isReady = (state: PvzState, time: number) =>
  time <= state.time

const plantBuyCooldownCount = (state: PvzState) => {
  let count = 0

  for (const [_plantName, nextTime] of state.nextBuy) {
    if (!isReady(state, nextTime)) count++
  }

  return count
}

export const tickUntil = (state: PvzState, condition: AdvanceCondition) => {
  // no plant cooldowns to wait on
  if (condition === 'plantReady' && plantBuyCooldownCount(state) === 0) {
    return
  }

  const random = createRandom(state.rng)
  const test = conditionTests[condition]

  let doneTicking = false

  const log = (entry: string) => {
    state.tickEvents.push(entry)

    doneTicking = doneTicking || test(entry)
  }

  const maybeWin = winHandler(state, log)

  for (let i = 0; i < MAX_TICKS; i++) {
    const beforeBuyCds = plantBuyCooldownCount(state)

    tickFixed(state, random, log)

    const afterBuyCds = plantBuyCooldownCount(state)

    // a plant buy cooldown expired
    if (condition === 'plantReady' && afterBuyCds < beforeBuyCds) break

    // handle win
    if (maybeWin()) break
    // handle loss, state unplayable
    if (state.status !== 'playing') break
    // early out on condition
    if (doneTicking) break

    if (i === MAX_TICKS - 1) {
      state.error = actionFail(
        'advanceUntil', 'maxTicksReached',
        `${condition} was not met within ${MAX_TICKS} ticks`
      )
    }
  }

  state.rng = random.peek()
}

const tof = (value: number, digits = 3) => value.toFixed(digits)

const tickFixed = (
  state: PvzState, random: Random, log: ((entry: string) => void)
) => {
  const levelSun = levelSunSpawned(state, FIXED_TICK)

  if (levelSun > 0) {
    state.sun += levelSun

    log(`sunDropped ${levelSun}`)
  }

  // later consider adding time - 
  // eg it happend between state.time and state.time + FIXED_TICK and the
  // exact time is probably useful
  // but we don't current use logs, they're just here because we *will* need
  // them for the UI, to report what happened

  const plantSlug = ({ kind, id, row, col }: Plant) =>
    `${kind} ${id} ${formatPos(row, col)}`

  const projSlug = ({ kind, row, id, x }: Projectile) =>
    `${kind} ${id} ${formatRow(row)}${tof(x)}`

  const mowerSlug = ({ row, x }: Mower) =>
    `mower ${formatRow(row)}${tof(x)}`

  const zombieSlug = ({ kind, id, row, x }: Zombie) =>
    `${kind} ${id} ${formatRow(row)}${tof(x)}`

  const entLog = <T>(slug: (ent: T) => string) =>
    (entity: T) => (entry: string) => log(`${slug(entity)} ${entry}`)

  const plantLog = entLog(plantSlug)

  const projLog = entLog(projSlug)

  const mowerLog = entLog(mowerSlug)

  const zombieLog = entLog(zombieSlug)

  // plants - action (sun/fire)
  for (const [plantId, plant] of state.plants) {
    const ready = isReady(state, plant.nextAction)

    if (!ready) continue

    const def = plants[plant.kind]

    const { row, col } = plant

    const plog = plantLog(plant)

    if (plant.kind === 'sunflower') {
      state.sun += SUN_DROP
      plant.nextAction += def.actionCd

      plog(`spawnedSun ${SUN_DROP}`)

      continue
    }

    if (maybe(def.projectile)) {
      if (plantHasTarget(state, plantId)) {
        const projDef = projectiles[def.projectile]

        const id = issueId(state)
        const x = col + 0.5

        const proj: Projectile = {
          kind: projDef.kind,
          id, row, x, speed: projDef.speed, damage: projDef.damage
        }

        state.projectiles.set(id, proj)
        plant.nextAction += def.actionCd

        plog(`fired ${projDef.kind}`)
      }

      continue
    }

    throw Error(`Unexpected plant "${plant.kind}"`)
  }

  // projectiles - move, collide, oob

  const getRowZombies = (row: number) => {
    const zombies: Zombie[] = []

    for (const zombie of state.zombies.values()) {
      if (zombie.row === row) zombies.push(zombie)
    }

    zombies.sort((a, b) => a.x - b.x)

    return zombies
  }

  const killZombie = (zombie: Zombie) => {
    zombieLog(zombie)('died')

    state.zombies.delete(zombie.id)
  }

  const logWithZombie = (
    log: (entry: string) => void, action: string, z: Zombie
  ) => log(`${action} ${zombieSlug(z)}`)

  const logHitZombie = (log: (entry: string) => void, z: Zombie) =>
    logWithZombie(log, 'hit', z)

  for (const [projectileId, projectile] of state.projectiles) {
    const currX = projectile.x
    const newX = projectile.x + projectile.speed * FIXED_TICK

    const zombies = getRowZombies(projectile.row)
    const target = zombies.find(z => z.x >= currX && z.x < newX)

    projectile.x = newX

    const prLog = projLog(projectile)

    if (maybe(target)) {
      logHitZombie(prLog, target)

      target.hp -= projectile.damage

      if (target.hp <= 0) {
        killZombie(target)
      }

      // no need to log proj going oob
      state.projectiles.delete(projectileId)
    } else if (newX >= BOARD_COLS) {
      state.projectiles.delete(projectileId)
    }
  }

  // mowers - move, collide, auto triggered, oob
  for (const [row, mower] of state.mowers) {
    const currX = mower.x
    const newX = mower.x + mowerSpeed * FIXED_TICK

    const mlog = mowerLog(mower)
    const zombies = getRowZombies(row)

    if (mower.active) {
      const targets = zombies.filter(z => z.x >= currX && z.x < newX)

      mower.x = newX

      for (const target of targets) {
        logHitZombie(mlog, target)

        killZombie(target)
      }

      if (mower.x >= BOARD_COLS) {
        // we don't log proj oob, but do log mower oob
        mlog('exitStageRight')

        state.mowers.delete(row)
      }

      continue
    }

    // check for auto launch
    const target = zombies.find(z => z.x < 1)

    if (!maybe(target)) continue

    logWithZombie(mlog, 'triggeredBy', target)

    mower.active = true

    // launch - just kill the trigger zombie - consider if this is the right    
    // thing to do or if it should happen naturally anyway?
    logHitZombie(mlog, target)

    killZombie(target)
  }

  // zombies - spawn, move, bite, house

  const newZombies = zombiesSpawned(state, FIXED_TICK)

  for (const { kind, waveIndex } of newZombies) {
    const level = getLevel(state.levelId)

    const row = maybe(level.spawnRows)
      ? random.pick(level.spawnRows)
      : random.nextInt(BOARD_ROWS)

    const x = random.range(SPAWN_X_MIN, SPAWN_X_MAX)
    const def = zombies[kind]
    const speed = random.range(def.speed[0], def.speed[1])

    const id = spawnZombie(state, kind, row, waveIndex, x, speed)

    const newZombie = state.zombies.get(id)!

    zombieLog(newZombie)('zombieSpawned')
  }

  // wave acceleration
  {
    const level = getLevel(state.levelId)
    const waves = level.waves

    // find latest wave that has started
    let activeWave = -1

    for (let w = 0; w < waves.length; w++) {
      if (state.waveStartTimes[w] <= state.time) activeWave = w
    }

    if (activeWave >= 0 && activeWave < waves.length - 1) {
      const elapsed = state.time - state.waveStartTimes[activeWave]

      if (elapsed >= WAVE_MIN_TIME) {
        const wave = waves[activeWave]
        const resolved = resolveWave(wave, activeWave, state.levelRng)

        let totalHp = 0

        for (const kind of resolved) totalHp += zombies[kind].hp

        let remainingHp = 0

        for (const z of state.zombies.values()) {
          if (z.waveIndex === activeWave) remainingHp += z.hp
        }

        const lostHp = totalHp - remainingHp

        if (lostHp >= totalHp * WAVE_HP_THRESHOLD) {
          const next = activeWave + 1
          const accelTime = state.time + WAVE_ACCEL_DELAY

          if (accelTime < state.waveStartTimes[next]) {
            state.waveStartTimes[next] = accelTime

            log(`waveAccelerated ${next} ${accelTime.toFixed(1)}`)
          }
        }
      }
    }
  }

  const getRowPlants = (row: number) => {
    const plants: Plant[] = []

    for (const plant of state.plants.values()) {
      if (plant.row === row) plants.push(plant)
    }

    // so rightmost are first
    plants.sort((a, b) => b.col - a.col)

    return plants
  }

  for (const [_zombieId, zombie] of state.zombies) {
    const def = zombies[zombie.kind]

    const newX = zombie.x - zombie.speed * FIXED_TICK
    const newCol = Math.floor(newX)

    const zlog = zombieLog(zombie)

    // biting
    if (maybe(zombie.biteTarget) && maybe(zombie.nextBite)) {
      const target = state.plants.get(zombie.biteTarget)

      if (!maybe(target)) {
        // was shoveled or another zombie already ate it
        // skip this zombie's turn - maybe not canon but easier
        zombie.biteTarget = undefined
        zombie.nextBite = undefined

        continue
      }

      if (!isReady(state, zombie.nextBite)) continue

      zlog(`biting ${plantSlug(target)}`)

      target.hp -= def.biteDamage

      if (target.hp <= 0) {
        plantLog(target)('died')

        state.plants.delete(target.id)

        zombie.biteTarget = undefined
        zombie.nextBite = undefined
      } else {
        zombie.nextBite += def.biteCd
      }

      continue
    }

    // if moving would land inside a plant tile, set zombie.x to plant.col + 1
    // eg, just to the right of the plant
    // no zombie can move fast enough to pass through a plant tile completely
    // in 1 FIXED_TICK, but do keep this in mind in case you decide to add
    // a super fast zombie

    const plants = getRowPlants(zombie.row)
    const target = plants.find(p => p.col === newCol)

    if (target) {
      zlog(`attacking ${plantSlug(target)}`)

      zombie.x = target.col + 1
      zombie.biteTarget = target.id
      // do they bite immediately or does one bite cooldown happen first?
      // let's assume immediately (well, next tick)
      zombie.nextBite = state.time + FIXED_TICK

      continue
    }

    zombie.x = newX

    if (zombie.x < 0) {
      zlog(`reachedHouse`)

      state.time += FIXED_TICK
      state.status = 'lost'

      return
    }
  }

  state.time += FIXED_TICK
}
