import { maybe } from '../../../lib/util.js'
import { createRandom, Random } from '../../random.js'
import { plants, zombies } from '../data/pvz-defs.js'
import {
  BOARD_COLS, BOARD_ROWS, FIXED_TICK, mowerSpeed, peaDamage, peaSpeed, SUN_DROP
} from '../pvz-const.js'
import { Mower, Plant, Projectile, PvzState, Zombie } from '../pvz-types.js'
import { formatPos, formatRow } from '../pvz-util.js'
import { issueId, spawnZombie } from './pvz-mutate.js'
import { levelSunSpawned, plantHasTarget, zombiesSpawned } from './pvz-query.js'
import { getLevel } from './pvz-sim-util.js'

// tick!

export const tick = (state: PvzState, dt: number) => {
  const random = createRandom(state.rng)
  const log = (entry: string) => { state.tickEvents.push(entry) }

  // has the last spawn already happened, but there are no zombies left?
  const level = getLevel(state.levelId)
  const lastSpawnTime = Math.max(...level.spawns.map(s => s.absTime))

  for (let i = 0; i < dt; i += FIXED_TICK) {
    tickFixed(state, random, log)

    if (state.time >= lastSpawnTime + FIXED_TICK) {
      if (state.zombies.size === 0) {
        log('won')
        state.status = 'won'

        return
      }
    }
  }

  state.rng = random.peek()
}

const isReady = (state: PvzState, time: number) =>
  time <= state.time

const tof = (value: number, digits = 3) => value.toFixed(digits)

const tickFixed = (
  state: PvzState, random: Random, log: ((entry: string) => void)
) => {
  state.sun += levelSunSpawned(state, FIXED_TICK)

  // later consider adding time - 
  // eg it happend between state.time and state.time + FIXED_TICK and the
  // exact time is probably useful
  // but we don't current use logs, they're just here because we *will* need
  // them for the UI, to report what happened

  const plantSlug = ({ kind, id, row, col }: Plant) =>
    `${kind} ${id} ${formatPos(row, col)}`

  const projSlug = ({ row, id, x }: Projectile) =>
    `pea ${id} ${formatRow(row)}${tof(x)}`

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

    if (plant.kind === 'peashooter') {
      if (plantHasTarget(state, plantId)) {
        // no spawnProjectile fn, because we are using hardcoded peas atm
        // when we add ProjectileDef and make PlantDef use it, we will revisit

        const id = issueId(state)
        const x = col + 0.5

        const pea: Projectile = {
          id, row, x, speed: peaSpeed, damage: peaDamage
        }

        state.projectiles.set(id, pea)
        plant.nextAction += def.actionCd

        plog(`fired pea`)
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

  for (const z of newZombies) {
    const { kind, spawnRow } = z

    const row = maybe(spawnRow) ? spawnRow : random.nextInt(BOARD_ROWS)

    // spawn BEFORE you move - it's just off the board so calling things like 
    // grid will fail
    const id = spawnZombie(state, kind, row)

    const newZombie = state.zombies.get(id)!

    zombieLog(newZombie)('spawned')
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

    const newX = zombie.x - def.speed * FIXED_TICK
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
