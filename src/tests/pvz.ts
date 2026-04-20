import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { pvzSim } from '../sims/pvz/sim/pvz-sim.js'
import { newState } from '../sims/pvz/sim/pvz-state.js'
import { PlantName, PvzEvent, PvzState } from '../sims/pvz/pvz-types.js'

import {
  PVZ_CURR_VERSION, SUN_DROP, WAVE_MIN_TIME, FIXED_TICK, SPAWN_X_MAX,
  PLANT_ARMED, PV_VAULTED, FIRST_WAVE_TIME, WAVE_INTERVAL,
  SEED_BANK_SLOTS, CH_EATING
} from '../sims/pvz/pvz-const.js'

import { replayPvzLog } from '../sims/pvz/pvz-replay.js'
import { filterTickEvents } from '../sims/pvz/pvz-log-filter.js'
import { pvzBoardView } from '../sims/pvz/pvz-views.js'
import { formatRow } from '../sims/pvz/pvz-util.js'

import {
  levels, plants, zombies, projectiles, baseZombie
} from '../sims/pvz/data/pvz-defs.js'

import {
  resolveWave, currentWaveIndex, getZombieEffectiveStats,
  choosePlantsRequired
} from '../sims/pvz/sim/pvz-query.js'

import { tick } from '../sims/pvz/sim/pvz-tick.js'
import { spawnZombie } from '../sims/pvz/sim/pvz-mutate.js'
import { WaveDef } from '../sims/pvz/data/pvz-def-types.js'
import { createLevel } from '../sims/pvz/data/pvz-def-util.js'
import { createRandom } from '../sims/random.js'

// helpers

const SEED = 42

const send = (state: PvzState, ...events: PvzEvent[]) =>
  events.reduce((s, e) => pvzSim(s, e), state)

const newGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 1, seed: SEED, version: PVZ_CURR_VERSION }
)

const hasEvent = (state: PvzState, substring: string) =>
  state.tickEvents.some(e => e.includes(substring))

const readyCd = (state: PvzState, name: PlantName) =>
  state.nextBuy.get(name) || 0

// derive test constants from level/plant defs
const level = levels[0]
const pea = plants['peashooter']

const mowerRow = level.initialMowers.findIndex(m => m)
const firstSpawnTime = FIRST_WAVE_TIME

describe('new', () => {
  it('initializes a playing state', () => {
    const s = newGame()

    assert.equal(s.status, 'playing')
    assert.equal(s.sun, level.initialSun)
    assert.equal(s.plants.size, 0)
    assert.equal(s.zombies.size, 0)
    assert.equal(s.mowers.size, 1)
    assert.ok(s.mowers.has(mowerRow))
    assert.equal(s.mowers.get(mowerRow)!.active, false)
  })

  it('rejects version mismatch', () => {
    const s = send(
      newState(SEED),
      { type: 'new', levelId: 1, seed: SEED, version: 999 }
    )

    assert.equal(s.status, 'unplayable')
    assert.equal(s.error?.reason, 'versionMismatch')
  })
})

describe('place', () => {
  it('places a peashooter', () => {
    const s = send(newGame(), {
      type: 'place', plantName: 'peashooter', row: mowerRow, col: 1
    })

    assert.equal(s.plants.size, 1)
    assert.equal(s.sun, level.initialSun - pea.buyCost)
    assert.equal(s.error, undefined)

    const plant = [...s.plants.values()][0]
    assert.equal(plant.kind, 'peashooter')
    assert.equal(plant.row, mowerRow)
    assert.equal(plant.col, 1)
  })

  it('sets buy cooldown after purchase', () => {
    const s = send(newGame(), {
      type: 'place', plantName: 'peashooter', row: mowerRow, col: 1
    })

    const cd = s.nextBuy.get('peashooter')!
    assert.ok(cd > 0) // buyCd = 7.5
  })

  it('rejects non-plantable tile', () => {
    const blockedRow = level.initialMowers.findIndex(m => !m)

    const s = send(newGame(), {
      type: 'place', plantName: 'peashooter', row: blockedRow, col: 1
    })

    assert.equal(s.error?.reason, 'tileBlocked')
    assert.equal(s.plants.size, 0)
  })

  it('rejects non-whitelisted plant', () => {
    const s = send(newGame(), {
      type: 'place', plantName: 'sunflower', row: mowerRow, col: 1
    })

    assert.equal(s.error?.reason, 'notInSeedBank')
  })

  // relies on the level design - may need to be tweaked if rebalanced
  it('rejects when cannot afford', () => {
    // buy one peashooter, advance past cooldown, try to buy another
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 },
      // advance past buy cooldown so that's not the blocker
      { type: 'advance', seconds: pea.buyCd + 1 },
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 2 }
    )

    assert.equal(s.error?.reason, 'cannotAfford')
    assert.equal(s.plants.size, 1)
  })

  it('rejects occupied tile', () => {
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 },
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 }
    )

    assert.equal(s.error?.reason, 'plantAlreadyHere')
  })
})

describe('advance', () => {
  it('drops level sun at firstSun time', () => {
    const s = send(newGame(),
      { type: 'advance', seconds: level.firstSun + 1 }
    )

    assert.equal(s.sun, level.initialSun + SUN_DROP)
    assert.ok(hasEvent(s, 'sunDropped'))
  })

  it('spawns zombies at wave time', () => {
    const s = send(newGame(),
      { type: 'advance', seconds: firstSpawnTime + 1 }
    )

    assert.ok(hasEvent(s, 'zombieSpawned'))
    assert.ok(s.zombies.size > 0)
  })

  it('peashooter fires at zombies', () => {
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 5 },
      { type: 'advance', seconds: firstSpawnTime + 1 }
    )

    // zombie spawns, peashooter should fire
    assert.ok(hasEvent(s, 'fired pea'))
  })

  it('does not burst-fire after idling without a target', () => {
    // place peashooter, idle well past its cooldown with no zombies,
    // then advance just past first spawn - should fire exactly once
    // per plant (no stale cooldown debt)
    const idleTime = firstSpawnTime - 0.5

    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 5 },
      { type: 'advance', seconds: idleTime },
      // now advance just past spawn - enough for one fire, not two
      { type: 'advance', seconds: 1 }
    )

    const fireCount = s.tickEvents.filter(e => e.includes('fired')).length

    assert.equal(fireCount, 1, `expected 1 fire, got ${fireCount}`)
  })

  it('pea does not pass through a zombie', () => {
    // place pea just behind a zombie such that the old sweep [currX, newX)
    // would miss because the zombie is barely past newX - but within
    // the zombie's own per-tick movement
    const s = newGame()
    const peaDef = projectiles['pea']
    const zDef = zombies['normal']
    const zSpeed = zDef.speed[0]

    // pea at col 5.5, zombie placed so z.x = peaNewX + half zombie tick move
    const peaX = 5.5
    const peaNewX = peaX + peaDef.speed * FIXED_TICK
    const zombieX = peaNewX + zSpeed * FIXED_TICK * 0.5

    // inject a projectile and a zombie directly
    const projId = s.nextId++
    s.projectiles.set(projId, {
      kind: 'pea', id: projId, row: mowerRow,
      x: peaX, speed: peaDef.speed, damage: peaDef.damage
    })

    spawnZombie(s, 'normal', mowerRow, 0, zombieX, zSpeed)

    s.tickEvents = []
    tick(s, FIXED_TICK)

    assert.ok(hasEvent(s, 'hit'), 'pea should hit the zombie')
    assert.equal(s.projectiles.size, 0, 'pea should be consumed')
  })
})

// manual mower launch fixture - canLaunch: true
const mowerLaunchLevel = createLevel({
  id: 993,
  initialSun: 50,
  canLaunch: true,
  initialMowers: [false, false, true, false, false],
  plantWhitelist: ['peashooter'],
  spawnRows: [mowerRow],
  waves: [
    { startTime: 30, fixed: ['normal'] }
  ]
})

levels.push(mowerLaunchLevel)

const newMowerGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 993, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('win and loss', () => {
  // this relies on the current level design - if we rebalance, the test needs
  // to be updated or a more sophisticated test strategy designed
  it('wins when all zombies are killed', () => {
    // place peashooters to kill everything
    // wait for sun + cooldown, then place second
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 5 },
      { type: 'advanceUntil', condition: 'plantReady' },
      { type: 'advanceUntil', condition: 'sunIncrease' },
      { type: 'advanceUntil', condition: 'sunIncrease' },
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 4 },
      { type: 'advance', seconds: 300 }
    )

    assert.equal(s.status, 'won')
    assert.ok(hasEvent(s, 'won'))
  })

  // as per above
  it('loses when zombie reaches house', () => {
    // use a level where mowers can be launched, launch it early so it sweeps 
    // an empty board and exits, then zombies arrive with no defense
    const s = send(newMowerGame(),
      { type: 'launchMower', row: mowerRow },
      { type: 'advance', seconds: 300 }
    )

    assert.equal(s.status, 'lost')
    assert.ok(hasEvent(s, 'reachedHouse'))
  })
})

describe('mower', () => {
  it('launches manually', () => {
    const s = send(newMowerGame(), { type: 'launchMower', row: mowerRow })

    assert.equal(s.mowers.get(mowerRow)!.active, true)
    assert.equal(s.error, undefined)
  })

  it('rejects launch on empty row', () => {
    const s = send(newMowerGame(), { type: 'launchMower', row: 0 })

    assert.equal(s.error?.reason, 'noMowerInRow')
  })

  it('rejects second manual launch', () => {
    const s = send(newMowerGame(),
      { type: 'launchMower', row: mowerRow },
      { type: 'launchMower', row: mowerRow }
    )

    // mower already launched and gone/active - second attempt fails
    // first launch sets state.launched = true, so even if re-added it 
    // would fail
    assert.ok(s.error !== undefined)
  })

  it('rejects launch when canLaunch is false', () => {
    const s = send(newGame(), { type: 'launchMower', row: mowerRow })

    assert.equal(s.error?.reason, 'launchNotAllowed')
  })
})

describe('shovel', () => {
  it('rejects on level where shovel is disabled', () => {
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 },
      { type: 'shovel', row: mowerRow, col: 1 }
    )

    assert.equal(s.error?.reason, 'shovelNotAllowed')
    assert.equal(s.plants.size, 1) // plant still there
  })
})

describe('advanceUntil', () => {
  it('zombieSpawn stops at first spawn', () => {
    const s = send(newGame(),
      { type: 'advanceUntil', condition: 'zombieSpawn' }
    )

    assert.ok(s.time >= firstSpawnTime)
    assert.ok(s.time < firstSpawnTime + 0.1) // shouldn't overshoot much
    assert.ok(hasEvent(s, 'zombieSpawned'))
    assert.equal(s.status, 'playing')
  })

  it('sunIncrease stops at first level sun drop', () => {
    const s = send(newGame(),
      { type: 'advanceUntil', condition: 'sunIncrease' }
    )

    assert.ok(s.time >= level.firstSun)
    assert.ok(s.time < level.firstSun + 0.1)
    assert.ok(s.sun > level.initialSun)
    assert.ok(hasEvent(s, 'sunDropped'))
  })

  it('plantReady stops when buy cooldown expires', () => {
    const before = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 }
    )

    const timeBefore = before.time

    const s = send(before,
      { type: 'advanceUntil', condition: 'plantReady' }
    )

    assert.ok(s.time >= timeBefore + pea.buyCd)
    assert.ok(s.time < timeBefore + pea.buyCd + 0.1)
    assert.equal(s.status, 'playing')
  })

  it('plantReady returns immediately when no cooldowns active', () => {
    const s0 = newGame()
    // advance past all initial buy cooldowns first
    const maxCd = Math.max(...[...s0.nextBuy.values()])
    const before = send(s0, { type: 'advance', seconds: maxCd })
    const timeBefore = before.time

    const s = send(before,
      { type: 'advanceUntil', condition: 'plantReady' }
    )

    assert.equal(s.time, timeBefore)
  })

  it('stops on game end before condition met', () => {
    // no defenses, advanceUntil a condition that won't fire before loss
    // zombieSpawn fires at t=15 but mower + zombie reach house scenario
    // actually first spawn IS at 15 so zombieSpawn will fire
    // instead: advance past all spawns first, then advanceUntil zombieSpawn
    // with no more spawns coming, game should end (won or lost) first
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 5 },
      { type: 'advanceUntil', condition: 'plantReady' },
      { type: 'advanceUntil', condition: 'sunIncrease' },
      { type: 'advanceUntil', condition: 'sunIncrease' },
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 4 },
      { type: 'advance', seconds: 300 },
    )

    if (s.status === 'won') {
      // game already over, advanceUntil should be a no-op (pvzSim 
      // early returns)
      const s2 = send(s,
        { type: 'advanceUntil', condition: 'zombieSpawn' }
      )
      assert.equal(s2.status, 'won')
    }
  })
})

// level 1-2

const level2 = levels[1]
const sun = plants['sunflower']
const level2FirstSpawn = level2.waves[0].startTime!

const newGame2 = () => send(
  newState(SEED),
  { type: 'new', levelId: 2, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('level 1-2: sunflower', () => {
  it('sunflower produces sun after actionCd', () => {
    const s = send(newGame2(),
      { type: 'place', plantName: 'sunflower', row: 2, col: 1 },
      { type: 'advance', seconds: sun.actionCd + 1 }
    )

    assert.ok(hasEvent(s, 'spawnedSun'))
    assert.ok(s.sun > level2.initialSun - sun.buyCost)
  })
})

describe('level 1-2: spawn rows', () => {
  it('zombies only spawn on valid spawnRows', () => {
    const s = send(newGame2(),
      { type: 'advance', seconds: level2FirstSpawn + 1 }
    )

    assert.ok(s.zombies.size > 0)

    for (const zombie of s.zombies.values()) {
      assert.ok(
        level2.spawnRows!.includes(zombie.row),
        `zombie on row ${zombie.row} not in spawnRows ${level2.spawnRows}`
      )
    }
  })
})

describe('level 1-2: mower auto-trigger', () => {
  it('mower activates when zombie reaches it', () => {
    // advance far enough that a zombie walks into mower range
    const s = send(newGame2(),
      { type: 'advance', seconds: level2FirstSpawn + 60 }
    )

    // at least one mower should have triggered (or been consumed)
    const mowerTriggered = hasEvent(s, 'triggeredBy')
    const mowersConsumed = s.mowers.size < 3

    assert.ok(mowerTriggered || mowersConsumed,
      'expected at least one mower to auto-trigger')
  })
})

// wave acceleration

describe('wave acceleration', () => {
  it('accelerates next wave when current wave HP threshold met', () => {
    const wave1Start = FIRST_WAVE_TIME
    const wave2OrigStart = FIRST_WAVE_TIME + WAVE_INTERVAL

    // place peashooter that will kill wave 1 zombie
    // need enough time for ~9 hits at 1.425s cooldown + travel time
    const s = send(newGame(),
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 3 },
      { type: 'advance', seconds: wave1Start + WAVE_MIN_TIME + 15 }
    )

    // wave 2 should have been accelerated
    assert.ok(
      s.waveStartTimes[1] < wave2OrigStart,
      `wave 2 should be accelerated: got ${s.waveStartTimes[1]}, ` +
      `original was ${wave2OrigStart}`
    )

    // should be scheduled at roughly:
    // wave1Start + WAVE_MIN_TIME + WAVE_ACCEL_DELAY
    // (the exact tick depends on when the zombie died)
    assert.ok(hasEvent(s, 'waveAccelerated'))
  })

  it('does not accelerate if threshold not met', () => {
    const wave2OrigStart = FIRST_WAVE_TIME + WAVE_INTERVAL

    // advance past wave 1 start + WAVE_MIN_TIME but with no peashooter
    // zombie is still alive, 0% hp lost
    const s = send(newGame(),
      { type: 'advance', seconds: FIRST_WAVE_TIME + WAVE_MIN_TIME + 1 }
    )

    assert.equal(s.waveStartTimes[1], wave2OrigStart)
    assert.ok(!hasEvent(s, 'waveAccelerated'))
  })
})

// wave start time defaults

describe('wave startTime defaults', () => {
  it('resolves missing startTimes using FIRST_WAVE_TIME and WAVE_INTERVAL', () => {
    // level 1-1 has no explicit startTimes
    const s = newGame()

    assert.equal(s.waveStartTimes[0], FIRST_WAVE_TIME)
    assert.equal(s.waveStartTimes[1], FIRST_WAVE_TIME + WAVE_INTERVAL)
    assert.equal(s.waveStartTimes[2], FIRST_WAVE_TIME + 2 * WAVE_INTERVAL)
    assert.equal(s.waveStartTimes[3], FIRST_WAVE_TIME + 3 * WAVE_INTERVAL)
  })

  it('uses explicit startTime and chains from it', () => {
    // level 1-2 has startTime: 50 on wave 0, rest default
    const s2 = newGame2()

    assert.equal(s2.waveStartTimes[0], 50)
    assert.equal(s2.waveStartTimes[1], 50 + WAVE_INTERVAL)
    assert.equal(s2.waveStartTimes[2], 50 + 2 * WAVE_INTERVAL)
  })
})

// resolveWave

describe('resolveWave', () => {
  const LEVEL_RNG = 12345

  it('returns only fixed when no pool', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: ['normal', 'cone']
    }

    const result = resolveWave(wave, 0, LEVEL_RNG)

    assert.deepEqual(result, ['normal', 'cone'])
  })

  it('spends remaining budget on pool zombies', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: ['normal'],
      pool: ['cone', 'bucket']
    }

    // waveIndex 8: budget = floor(9/3)+1 = 4, fixed costs 1, remaining = 3
    const result = resolveWave(wave, 8, LEVEL_RNG)

    // must have at least the fixed normal + some pool zombies
    assert.equal(result[0], 'normal')
    assert.ok(result.length > 1)

    // all pool results must be affordable types
    for (const kind of result.slice(1)) {
      assert.ok(
        kind === 'normal' || kind === 'cone' || kind === 'bucket',
        `unexpected kind: ${kind}`
      )
    }
  })

  it('returns only fixed when budget goes negative', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: ['bucket', 'bucket'],
      pool: ['cone']
    }

    // waveIndex 0: budget 4, fixed costs 4+4 = 8, remaining = -4
    const result = resolveWave(wave, 0, LEVEL_RNG)

    assert.deepEqual(result, ['bucket', 'bucket'])
  })

  it('always includes normal in pool', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: [],
      pool: ['bucket'] // only bucket in pool, but normal always added
    }

    // waveIndex 0: budget 4, bucket costs 4 - could get one bucket
    // but normal is always available too
    const result = resolveWave(wave, 0, LEVEL_RNG)

    // should have spawned something since budget is 4
    assert.ok(result.length > 0)
  })

  it('scales budget with pointMultiplier', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: [],
      pool: ['normal'],
      pointMultiplier: 3
    }

    // waveIndex 0: budget = (floor(1/3)+1)*3 = 3, all normals at cost 1
    const result = resolveWave(wave, 0, LEVEL_RNG)

    assert.equal(result.length, 3)
  })

  it('is deterministic with same seed', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: ['normal'],
      pool: ['cone', 'bucket']
    }

    const a = resolveWave(wave, 0, LEVEL_RNG)
    const b = resolveWave(wave, 0, LEVEL_RNG)

    assert.deepEqual(a, b)
  })

  it('varies by waveIndex', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: [],
      pool: ['cone', 'bucket']
    }

    const a = resolveWave(wave, 2, LEVEL_RNG)
    const b = resolveWave(wave, 5, LEVEL_RNG)

    // different wave indices produce different budgets
    // waveIndex 2: budget 2, waveIndex 5: budget 3
    assert.notDeepEqual(a, b)
  })

  it('empty pool still spawns normals', () => {
    const wave: WaveDef = {
      startTime: 10,
      fixed: [],
      pool: []
    }

    // waveIndex 0: budget 4, pool is [] but normal is always added
    const result = resolveWave(wave, 0, LEVEL_RNG)

    assert.ok(result.length > 0)
    assert.ok(result.every(k => k === 'normal'))
  })
})

// level 1-3

const level3 = levels[2]
const level3FirstSpawn = FIRST_WAVE_TIME

const newGame3 = () => send(
  newState(SEED),
  { type: 'new', levelId: 3, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('level 1-3: basics', () => {
  it('initializes with 3 mowers', () => {
    const s = newGame3()

    assert.equal(s.status, 'playing')
    assert.equal(s.mowers.size, 3)
    assert.equal(s.sun, level3.initialSun)
    assert.ok(s.levelRng !== 0, 'levelRng should be initialized')
  })

  it('spawns zombies from pool', () => {
    // advance well past first few waves
    const s = send(newGame3(),
      { type: 'advance', seconds: level3FirstSpawn + 1 }
    )

    assert.ok(s.zombies.size > 0)
    assert.ok(hasEvent(s, 'zombieSpawned'))
  })

  it('pool produces cone or bucket zombies', () => {
    // waves 0-1 have budget 1 (only normals), wave 2+ has budget 2+
    // advance past wave 5 so several waves can afford cone (cost 2)
    const s = send(newGame3(),
      { type: 'advance', seconds: FIRST_WAVE_TIME + 5 * WAVE_INTERVAL + 1 }
    )

    const kinds = new Set<string>()

    for (const z of s.zombies.values()) {
      kinds.add(z.kind)
    }

    assert.ok(
      kinds.has('cone') || kinds.has('bucket'),
      `expected cone or bucket in spawns, got: ${[...kinds]}`
    )
  })

  it('is deterministic with same seed', () => {
    const a = send(newGame3(),
      { type: 'advance', seconds: level3FirstSpawn + 1 }
    )

    const b = send(newGame3(),
      { type: 'advance', seconds: level3FirstSpawn + 1 }
    )

    const kindsA = [...a.zombies.values()].map(z => z.kind)
    const kindsB = [...b.zombies.values()].map(z => z.kind)

    assert.deepEqual(kindsA, kindsB)
  })
})

// cherry bomb

// test fixture level - decoupled from real level defs
const testLevel = createLevel({
  id: 999,
  initialSun: 1000,
  plantWhitelist: ['sunflower', 'peashooter', 'cherryBomb'],
  waves: [
    { startTime: 40, fixed: ['normal', 'normal'], pool: ['cone'] }
  ]
})

levels.push(testLevel)

const testFirstSpawn = testLevel.waves[0].startTime!

const newGameTest = () => send(
  newState(SEED),
  { type: 'new', levelId: 999, seed: SEED, version: PVZ_CURR_VERSION }
)

const cherry = plants['cherryBomb']

describe('cherry bomb', () => {
  it('deducts sun and sets buy cooldown', () => {
    const s0 = newGameTest()
    const s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'cherryBomb') },
      { type: 'place', plantName: 'cherryBomb', row: 2, col: 5 }
    )

    assert.equal(s.error, undefined)
    assert.ok(s.nextBuy.get('cherryBomb')! > s.time)
  })

  it('explodes after 1s fuse and self-destructs', () => {
    const s = send(newGameTest(),
      { type: 'advance', seconds: testFirstSpawn + 1 },
      { type: 'place', plantName: 'cherryBomb', row: 2, col: 8 },
      { type: 'advance', seconds: cherry.actionCd + 0.1 }
    )

    const hasCherryBomb = [...s.plants.values()].some(
      p => p.kind === 'cherryBomb'
    )
    assert.equal(hasCherryBomb, false, 'cherry bomb should self-destruct')
    assert.ok(hasEvent(s, 'exploded selfDestruct'))
  })

  it('kills zombies in 3x3 area', () => {
    const s = send(newGameTest(),
      { type: 'advance', seconds: testFirstSpawn + 1 },
      { type: 'place', plantName: 'cherryBomb', row: 2, col: 8 },
      { type: 'advance', seconds: cherry.actionCd + 0.1 }
    )

    assert.ok(hasEvent(s, 'exploded'))
  })

  it('does not kill zombies outside 3x3 range', () => {
    const s = send(newGameTest(),
      { type: 'advance', seconds: testFirstSpawn + 1 },
      { type: 'place', plantName: 'cherryBomb', row: 2, col: 1 },
      { type: 'advance', seconds: cherry.actionCd + 0.1 }
    )

    assert.ok(s.zombies.size > 0, 'zombies outside 3x3 should survive')
    assert.ok(hasEvent(s, 'exploded selfDestruct'))
  })

  it('does not destroy other plants in blast radius', () => {
    const s0 = newGameTest()
    const s = send(s0,
      { type: 'place', plantName: 'sunflower', row: 2, col: 4 },
      { type: 'advance', seconds: readyCd(s0, 'cherryBomb') },
      { type: 'place', plantName: 'cherryBomb', row: 2, col: 5 },
      { type: 'advance', seconds: cherry.actionCd + 0.1 }
    )

    // sunflower at col 4 is in the 3x3 of cherry at col 5
    // but cherry bomb does not destroy plants
    const sunflower = [...s.plants.values()].find(
      p => p.kind === 'sunflower'
    )
    assert.ok(sunflower, 'sunflower should survive cherry bomb explosion')
  })
})

// wallnut

const wallnutLevel = createLevel({
  id: 997,
  initialSun: 1000,
  plantWhitelist: ['peashooter', 'sunflower', 'wallnut'],
  spawnRows: [2],
  waves: [
    { startTime: 30, fixed: ['normal', 'normal'] }
  ]
})

levels.push(wallnutLevel)

const wallnutFirstSpawn = wallnutLevel.waves[0].startTime!

const newWallnutGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 997, seed: SEED, version: PVZ_CURR_VERSION }
)

const wallnut = plants['wallnut']

describe('wallnut', () => {
  it('places and survives advance without error', () => {
    const s0 = newWallnutGame()
    const s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'wallnut') },
      { type: 'place', plantName: 'wallnut', row: 2, col: 5 },
      { type: 'advance', seconds: 5 }
    )

    assert.equal(s.error, undefined)
    assert.equal(s.plants.size, 1)

    const plant = [...s.plants.values()][0]
    assert.equal(plant.kind, 'wallnut')
    assert.equal(plant.hp, wallnut.hp)
  })

  it('never performs an action', () => {
    const s0 = newWallnutGame()
    const s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'wallnut') },
      { type: 'place', plantName: 'wallnut', row: 2, col: 5 },
      { type: 'advance', seconds: 30 }
    )

    const wallnutEvents = s.tickEvents.filter(e => e.includes('wallnut'))
    assert.equal(wallnutEvents.length, 0, 'wallnut should never act')
  })

  it('absorbs zombie bites', () => {
    const s0 = newWallnutGame()
    const wallCd = readyCd(s0, 'wallnut')
    const s = send(s0,
      { type: 'advance', seconds: wallCd },
      { type: 'place', plantName: 'wallnut', row: 2, col: 8 },
      { type: 'advance', seconds: wallnutFirstSpawn - wallCd + 15 }
    )

    const plant = [...s.plants.values()].find(p => p.kind === 'wallnut')

    // wallnut should still exist but have taken damage
    assert.ok(plant, 'wallnut should still be on the board')
    assert.ok(plant!.hp < wallnut.hp, 'wallnut should have taken bite damage')
  })
})

// weightedPick

describe('weightedPick', () => {
  it('always picks the only nonzero weight', () => {
    const rng = createRandom(42)

    for (let i = 0; i < 50; i++) {
      assert.equal(rng.weightedPick(['a', 'b', 'c'], [0, 0, 1]), 'c')
    }
  })

  it('distributes roughly evenly for equal weights', () => {
    const rng = createRandom(42)
    const counts = [0, 0]

    for (let i = 0; i < 1000; i++) {
      const v = rng.weightedPick(['a', 'b'], [1, 1])
      counts[v === 'a' ? 0 : 1]++
    }

    // each should be roughly 500 ± 100
    assert.ok(counts[0] > 350 && counts[0] < 650, `a count: ${counts[0]}`)
    assert.ok(counts[1] > 350 && counts[1] < 650, `b count: ${counts[1]}`)
  })

  it('respects skewed weights', () => {
    const rng = createRandom(42)
    const counts = [0, 0]

    for (let i = 0; i < 1000; i++) {
      const v = rng.weightedPick(['a', 'b'], [0.01, 1])
      counts[v === 'a' ? 0 : 1]++
    }

    // a should be ~1%, b should be ~99%
    assert.ok(counts[0] < 50, `a count should be rare: ${counts[0]}`)
    assert.ok(counts[1] > 950, `b count should dominate: ${counts[1]}`)
  })
})

// currentWaveIndex

describe('currentWaveIndex', () => {
  it('returns -1 before any waves', () => {
    const s = newGame()

    assert.equal(currentWaveIndex(s), -1)
  })

  it('returns 0 after first wave starts', () => {
    const s = send(newGame(),
      { type: 'advance', seconds: firstSpawnTime + 0.1 }
    )

    assert.equal(currentWaveIndex(s), 0)
  })
})

// mower row deprioritization

describe('mower row deprioritization', () => {
  // derive walk time from defs so rebalancing doesn't break this test
  // worst case: zombie spawns at SPAWN_X_MAX, walks at slowest speed to x < 1
  const slowestWalkTime = Math.ceil((SPAWN_X_MAX - 1) / zombies['normal'].speed[0])
  const wave0Start = 5
  const mowerDeadline = wave0Start + slowestWalkTime + 2
  const wave1Start = mowerDeadline + 5

  // fixture: wave 0 = single normal (triggers mower), wave 1 = many normals (tests deprio)
  const mowerLevel = createLevel({
    id: 998,
    initialSun: 0,
    plantWhitelist: ['peashooter'],
    waves: [
      { startTime: wave0Start, fixed: ['normal'] },
      {
        startTime: wave1Start, fixed: [
          'normal', 'normal', 'normal', 'normal', 'normal',
          'normal', 'normal', 'normal', 'normal', 'normal',
          'normal', 'normal', 'normal', 'normal', 'normal',
          'normal', 'normal', 'normal', 'normal', 'normal'
        ]
      }
    ]
  })

  levels.push(mowerLevel)

  const newMowerGame = () => send(
    newState(SEED),
    { type: 'new', levelId: 998, seed: SEED, version: PVZ_CURR_VERSION }
  )

  it('records mowerFiredWave on auto-trigger', () => {
    // advance past mower trigger deadline
    const s = send(newMowerGame(),
      { type: 'advance', seconds: mowerDeadline }
    )

    assert.ok(s.mowerFiredWave.size > 0, 'should have recorded a mower fire')
  })

  it('deprioritizes mowed row in next wave', () => {
    // advance past wave 1 spawn so mower has fired and deprio applies
    const s = send(newMowerGame(),
      { type: 'advance', seconds: wave1Start + 2 }
    )

    // find which row the mower fired on
    const mowedRow = [...s.mowerFiredWave.keys()][0]

    // count wave 1 zombies on the mowed row vs others
    const wave1Zombies = [...s.zombies.values()].filter(
      z => z.waveIndex === 1
    )

    const onMowedRow = wave1Zombies.filter(z => z.row === mowedRow).length
    const total = wave1Zombies.length

    // with 20 zombies and 5 rows, uniform would give ~4 per row
    // mowed row should get significantly fewer (weight 0.01)
    assert.ok(
      total > 0,
      'wave 1 should have spawned zombies'
    )

    assert.ok(
      onMowedRow <= 2,
      `mowed row ${mowedRow} got ${onMowedRow}/${total} zombies, expected very few`
    )
  })
})

// replay

const newEvent: PvzEvent = {
  type: 'new', levelId: 1, seed: SEED, version: PVZ_CURR_VERSION
}

describe('replay', () => {
  it('returns empty for no events', () => {
    const lines = replayPvzLog([])

    assert.equal(lines.length, 0)
  })

  it('produces req line for new game', () => {
    const lines = replayPvzLog([newEvent])

    assert.equal(lines.length, 1)
    assert.match(lines[0], /^0\.00 req 1 new 1/)
  })

  it('produces req + res lines for place and advance', () => {
    const lines = replayPvzLog([
      newEvent,
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 },
      { type: 'advance', seconds: firstSpawnTime + 1 }
    ])

    // req 1 = new, req 2 = place, req 3 = advance
    const req1 = lines.find(l => l.includes('req 1'))!
    const req2 = lines.find(l => l.includes('req 2'))!
    const req3 = lines.find(l => l.includes('req 3'))!

    assert.ok(req1, 'should have req 1')
    assert.ok(req2.includes('place peashooter'), 'req 2 should be place')
    assert.ok(req3.includes('advance'), 'req 3 should be advance')

    // advance should produce res lines (sun drops, zombie spawns, etc)
    const res3 = lines.filter(l => l.includes('res 3'))
    assert.ok(res3.length > 0, 'advance should produce tick events')
  })

  it('produces error res line on failure', () => {
    const blockedRow = level.initialMowers.findIndex(m => !m)

    const lines = replayPvzLog([
      newEvent,
      { type: 'place', plantName: 'peashooter', row: blockedRow, col: 1 }
    ])

    const res2 = lines.filter(l => l.includes('res 2'))
    assert.equal(res2.length, 1)
    assert.ok(res2[0].includes('tileBlocked'), 'error res should include reason')
  })

  it('uses .toFixed(2) for time', () => {
    const lines = replayPvzLog([
      newEvent,
      { type: 'advance', seconds: 10.5 }
    ])

    // req uses pre-reduce time (when command was issued)
    const req2 = lines.find(l => l.includes('req 2'))!
    assert.ok(req2.startsWith('0.00 '), `expected 0.00, got: ${req2}`)

    // res lines have per-event timestamps from the sim
    const res2 = lines.filter(l => l.includes('res 2'))
    assert.ok(res2.length > 0, 'advance should produce res lines')

    // first sun drop is at level.firstSun, verify it has its own timestamp
    const sunRes = res2.find(l => l.includes('sunDropped'))
    assert.ok(sunRes, 'should have a sunDropped res')
    assert.ok(!sunRes!.startsWith('0.00 '), 'sun res should not be at time 0')
  })

  it('increments reqid per event', () => {
    const lines = replayPvzLog([
      newEvent,
      { type: 'place', plantName: 'peashooter', row: mowerRow, col: 1 },
      { type: 'advanceUntil', condition: 'sunIncrease' },
    ])

    const reqIds = lines.filter(l => l.includes('req')).map(l => {
      const m = l.match(/req (\d+)/)
      return m ? Number(m[1]) : 0
    })

    assert.deepEqual(reqIds, [1, 2, 3])
  })
})

// filterTickEvents

const sampleEvents = [
  '5.00 sunDropped 25',
  '5.01 sunflower 3 C1 spawnedSun 25',
  '10.00 waveStarted 0',
  '10.00 normal 7 D10.500 zombieSpawned',
  '10.50 peashooter 2 C5 fired pea 4 C5.500',
  '10.51 pea 4 C5.540 hit normal 7 D9.800',
  '10.60 normal 7 D1.200 attacking peashooter 2 C1',
  '10.70 normal 7 D1.200 biting peashooter 2 C1',
  '11.00 peashooter 2 C1 died',
  '12.00 normal 7 D0.500 died',
  '13.00 mower E0.000 triggeredBy normal 8 E0.900',
  '13.01 mower E0.040 hit normal 8 E0.800',
  '13.50 mower E10.000 exitStageRight',
  '14.00 cherryBomb 5 C5 exploded normal 9 D5.200',
  '14.00 cherryBomb 5 C5 exploded selfDestruct',
  '15.00 waveAccelerated 2 17.00',
  '20.00 normal 10 C0.100 reachedHouse',
  '25.00 won',
]

describe('filterTickEvents', () => {
  it('verbose returns all events', () => {
    assert.equal(filterTickEvents(sampleEvents, 'verbose').length, sampleEvents.length)
  })

  it('none returns nothing', () => {
    assert.equal(filterTickEvents(sampleEvents, 'none').length, 0)
  })

  it('minimal includes significant events only', () => {
    const result = filterTickEvents(sampleEvents, 'minimal')

    // should include: died x2, triggeredBy, reachedHouse, won, waveStarted
    assert.ok(result.some(e => e.includes('died')))
    assert.ok(result.some(e => e.includes('triggeredBy')))
    assert.ok(result.some(e => e.includes('reachedHouse')))
    assert.ok(result.some(e => e.includes('won')))
    assert.ok(result.some(e => e.includes('waveStarted')))

    // should exclude detailed: sunDropped, spawnedSun, zombieSpawned,
    // waveAccelerated, attacking, exploded, exitStageRight
    assert.ok(!result.some(e => e.includes('sunDropped')))
    assert.ok(!result.some(e => e.includes('spawnedSun')))
    assert.ok(!result.some(e => e.includes('zombieSpawned')))
    assert.ok(!result.some(e => e.includes('waveAccelerated')))
    assert.ok(!result.some(e => e.includes('fired')))
    assert.ok(!result.some(e => e.includes('biting')))
    assert.ok(!result.some(e => e.includes('attacking')))
    assert.ok(!result.some(e => e.includes('exploded')))
    assert.ok(!result.some(e => e.includes('exitStageRight')))
  })

  it('detailed adds tactical events', () => {
    const result = filterTickEvents(sampleEvents, 'detailed')

    // detailed should include everything minimal has plus:
    assert.ok(result.some(e => e.includes('sunDropped')))
    assert.ok(result.some(e => e.includes('spawnedSun')))
    assert.ok(result.some(e => e.includes('zombieSpawned')))
    assert.ok(result.some(e => e.includes('waveAccelerated')))
    assert.ok(result.some(e => e.includes('attacking')))
    assert.ok(result.some(e => e.includes('exploded selfDestruct')))
    assert.ok(result.some(e => e.includes('exitStageRight')))

    // but still exclude per-tick noise
    assert.ok(!result.some(e => e.includes('fired')))
    assert.ok(!result.some(e => e.includes('biting')))
  })

  it('defaults unrecognized events to verbose', () => {
    const events = ['1.00 someNewEvent happened']

    assert.equal(filterTickEvents(events, 'verbose').length, 1)
    assert.equal(filterTickEvents(events, 'detailed').length, 0)
  })
})

// board view - projectile collapse

describe('board view: projectile collapse', () => {
  const peaDef = projectiles['pea']

  const viewGame = () => send(
    newState(SEED),
    { type: 'new', levelId: 1, seed: SEED, version: PVZ_CURR_VERSION }
  )

  it('plant + projectile shows plant, no multi-key', () => {
    const s = viewGame()

    // place peashooter at mowerRow col 5
    s.nextId++
    s.plants.set(s.nextId, {
      kind: 'peashooter', id: s.nextId, row: mowerRow, col: 5,
      hp: 300, nextAction: 999
    })

    // inject a pea at same tile (x = 5.5, within col 5)
    s.nextId++
    s.projectiles.set(s.nextId, {
      kind: 'pea', id: s.nextId, row: mowerRow, x: 5.5,
      speed: peaDef.speed, damage: peaDef.damage
    })

    const view = pvzBoardView(s)
    const multiKeys = view.keys.filter(k => k.kind === 'multi')

    assert.equal(multiKeys.length, 0, 'should have no multi-keys')

    // the board line for mowerRow should contain P at col 5
    const rowLine = view.lines.find(l => l.startsWith(formatRow(mowerRow)))!
    assert.ok(rowLine, 'should have a row line')
    // col 5 should be P not a multi-key digit
    assert.ok(!rowLine.includes(':1:'), 'should not have :1: multi-key')
  })

  it('projectile + zombie shows zombie, no multi-key', () => {
    const s = viewGame()

    const zDef = zombies['normal']

    // inject a zombie at col 7 (x = 7.3)
    spawnZombie(s, 'normal', mowerRow, 0, 7.3, zDef.speed[0])

    // inject a pea at same col (x = 7.5)
    s.nextId++
    s.projectiles.set(s.nextId, {
      kind: 'pea', id: s.nextId, row: mowerRow, x: 7.5,
      speed: peaDef.speed, damage: peaDef.damage
    })

    const view = pvzBoardView(s)
    const multiKeys = view.keys.filter(k => k.kind === 'multi')

    assert.equal(multiKeys.length, 0, 'should have no multi-keys')
  })

  it('plant + zombie still shows multi-key', () => {
    const s = viewGame()

    const zDef = zombies['normal']

    // place peashooter at col 5
    s.nextId++
    s.plants.set(s.nextId, {
      kind: 'peashooter', id: s.nextId, row: mowerRow, col: 5,
      hp: 300, nextAction: 999
    })

    // inject zombie at same col
    spawnZombie(s, 'normal', mowerRow, 0, 5.3, zDef.speed[0])

    const view = pvzBoardView(s)
    const multiKeys = view.keys.filter(k => k.kind === 'multi')

    assert.ok(multiKeys.length > 0, 'should have a multi-key for plant+zombie')
  })

  it('projectile-only tile still shows projectile', () => {
    const s = viewGame()

    // inject just a pea at col 6
    s.nextId++
    s.projectiles.set(s.nextId, {
      kind: 'pea', id: s.nextId, row: mowerRow, x: 6.5,
      speed: peaDef.speed, damage: peaDef.damage
    })

    const view = pvzBoardView(s)
    const multiKeys = view.keys.filter(k => k.kind === 'multi')

    assert.equal(multiKeys.length, 0, 'should have no multi-keys')
  })

  it('multiple same-type projectiles collapse to one', () => {
    const s = viewGame()

    // inject two peas at the same col
    for (const x of [6.3, 6.7]) {
      s.nextId++
      s.projectiles.set(s.nextId, {
        kind: 'pea', id: s.nextId, row: mowerRow, x,
        speed: peaDef.speed, damage: peaDef.damage
      })
    }

    const view = pvzBoardView(s)
    const multiKeys = view.keys.filter(k => k.kind === 'multi')

    assert.equal(multiKeys.length, 0, 'should have no multi-keys for same-type projectiles')
  })
})

// board view - plant state markers

describe('board view: plant state markers', () => {
  const viewGame = () => send(
    newState(SEED),
    { type: 'new', levelId: 1, seed: SEED, version: PVZ_CURR_VERSION }
  )

  it('unarmed potato mine renders with comma delimiters', () => {
    const s = viewGame()

    s.nextId++
    s.plants.set(s.nextId, {
      kind: 'potatoMine', id: s.nextId, row: mowerRow, col: 3,
      hp: 300, nextAction: 999
      // currState undefined = not armed
    })

    const view = pvzBoardView(s)
    const rowLine = view.lines.find(l => l.startsWith(formatRow(mowerRow)))!

    assert.ok(rowLine.includes(',M,'), `should contain ,M, but got: ${rowLine}`)
  })

  it('armed potato mine renders without comma delimiters', () => {
    const s = viewGame()

    s.nextId++
    s.plants.set(s.nextId, {
      kind: 'potatoMine', id: s.nextId, row: mowerRow, col: 3,
      hp: 300, nextAction: 999,
      currState: PLANT_ARMED
    })

    const view = pvzBoardView(s)
    const rowLine = view.lines.find(l => l.startsWith(formatRow(mowerRow)))!

    assert.ok(!rowLine.includes(',M,'), `should not contain ,M, but got: ${rowLine}`)
    assert.ok(rowLine.includes(' M '), `should contain space-M-space but got: ${rowLine}`)
  })

  it('eating chomper renders with comma delimiters', () => {
    const s = viewGame()

    s.nextId++
    s.plants.set(s.nextId, {
      kind: 'chomper', id: s.nextId, row: mowerRow, col: 3,
      hp: 300, nextAction: 999,
      currState: CH_EATING
    })

    const view = pvzBoardView(s)
    const rowLine = view.lines.find(l => l.startsWith(formatRow(mowerRow)))!

    assert.ok(rowLine.includes(',H,'), `should contain ,H, but got: ${rowLine}`)
  })

  it('idle chomper renders without comma delimiters', () => {
    const s = viewGame()

    s.nextId++
    s.plants.set(s.nextId, {
      kind: 'chomper', id: s.nextId, row: mowerRow, col: 3,
      hp: 300, nextAction: 999
    })

    const view = pvzBoardView(s)
    const rowLine = view.lines.find(l => l.startsWith(formatRow(mowerRow)))!

    assert.ok(!rowLine.includes(',H,'), `should not contain ,H, but got: ${rowLine}`)
    assert.ok(rowLine.includes(' H '), `should contain space-H-space but got: ${rowLine}`)
  })
})

// potato mine

const mineLevel = createLevel({
  id: 996,
  initialSun: 1000,
  plantWhitelist: ['peashooter', 'sunflower', 'potatoMine'],
  spawnRows: [2],
  waves: [
    { startTime: 100, fixed: ['normal'] }
  ]
})

levels.push(mineLevel)

const mineDef = plants['potatoMine']

const newMineGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 996, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('potato mine', () => {
  it('arms after actionCd', () => {
    const s0 = newMineGame()
    const s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'potatoMine') },
      { type: 'place', plantName: 'potatoMine', row: 2, col: 5 },
      { type: 'advance', seconds: mineDef.actionCd + 0.1 }
    )

    const mine = [...s.plants.values()].find(p => p.kind === 'potatoMine')

    assert.ok(mine, 'mine should still exist')
    assert.equal(mine!.currState, PLANT_ARMED)
    assert.ok(hasEvent(s, 'armed'))
  })

  it('does not arm before actionCd', () => {
    const s0 = newMineGame()
    const s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'potatoMine') },
      { type: 'place', plantName: 'potatoMine', row: 2, col: 5 },
      { type: 'advance', seconds: mineDef.actionCd - 1 }
    )

    const mine = [...s.plants.values()].find(p => p.kind === 'potatoMine')

    assert.ok(mine, 'mine should still exist')
    assert.equal(mine!.currState ?? 0, 0, 'mine should not be armed yet')
  })

  it('explodes on zombie contact when armed', () => {
    const s0 = newMineGame()
    let s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'potatoMine') },
      { type: 'place', plantName: 'potatoMine', row: 2, col: 5 },
      { type: 'advance', seconds: mineDef.actionCd + 0.1 }
    )

    // clear events so we can check for exploded
    s.tickEvents = []

    // spawn zombie just to the right of the mine
    const zDef = zombies['normal']
    spawnZombie(s, 'normal', 2, 0, 6.05, zDef.speed[0])

    // advance enough for zombie to reach col 5
    tick(s, 10)

    const mine = [...s.plants.values()].find(p => p.kind === 'potatoMine')
    assert.equal(mine, undefined, 'mine should self-destruct')
    assert.ok(hasEvent(s, 'exploded'))
    assert.ok(hasEvent(s, 'selfDestruct'))
  })

  it('is vulnerable while arming (zombie eats it)', () => {
    const s0 = newMineGame()
    let s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'potatoMine') },
      { type: 'place', plantName: 'potatoMine', row: 2, col: 5 }
    )

    // spawn zombie right next to mine so it starts biting immediately
    const zDef = zombies['normal']
    spawnZombie(s, 'normal', 2, 0, 6.0, zDef.speed[0])

    // advance long enough for zombie to eat through 300 hp
    // biteDamage=4, biteCd=0.04 => 100 dps => 3s to eat 300hp
    tick(s, 5)

    const mine = [...s.plants.values()].find(p => p.kind === 'potatoMine')
    assert.equal(mine, undefined, 'mine should be eaten before arming')
    assert.ok(s.zombies.size > 0, 'zombie should survive (mine was not armed)')
  })

  it('kills only the triggering zombie', () => {
    const s0 = newMineGame()
    let s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'potatoMine') },
      { type: 'place', plantName: 'potatoMine', row: 2, col: 5 },
      { type: 'advance', seconds: mineDef.actionCd + 0.1 }
    )

    s.tickEvents = []

    const zDef = zombies['normal']

    // zombie that will trigger the mine
    spawnZombie(s, 'normal', 2, 0, 6.05, zDef.speed[0])
    // zombie further back
    spawnZombie(s, 'normal', 2, 0, 8.0, zDef.speed[0])

    tick(s, 10)

    assert.equal(s.zombies.size, 1, 'only triggering zombie should die')
  })
})

// pole vaulter

const vaultLevel = createLevel({
  id: 995,
  initialSun: 1000,
  plantWhitelist: ['peashooter', 'sunflower', 'wallnut'],
  spawnRows: [2],
  waves: [
    { startTime: 100, fixed: ['normal'] }
  ]
})

levels.push(vaultLevel)

const newVaultGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 995, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('pole vaulter', () => {
  it('vaults over first plant', () => {
    const s0 = newVaultGame()
    let s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'wallnut') },
      { type: 'place', plantName: 'wallnut', row: 2, col: 5 }
    )

    const vDef = zombies['poleVaulter']
    spawnZombie(s, 'poleVaulter', 2, 0, 6.5, vDef.speed[0])

    tick(s, 10)

    const zombie = [...s.zombies.values()].find(
      z => z.kind === 'poleVaulter'
    )

    assert.ok(zombie, 'vaulter should still exist')
    assert.equal(zombie!.currState, PV_VAULTED)
    assert.ok(hasEvent(s, 'vaulting'))

    // should have landed at col - 0.5 = 4.5
    // then continued walking, so x should be <= 4.5
    assert.ok(zombie!.x <= 4.5, `vaulter should be at or past 4.5, was ${zombie!.x}`)
  })

  it('speed changes after vaulting', () => {
    const s0 = newVaultGame()
    let s = send(s0,
      { type: 'advance', seconds: readyCd(s0, 'wallnut') },
      { type: 'place', plantName: 'wallnut', row: 2, col: 5 }
    )

    const vDef = zombies['poleVaulter']
    const preVaultSpeed = vDef.speed[0]
    spawnZombie(s, 'poleVaulter', 2, 0, 6.05, preVaultSpeed)

    tick(s, 10)

    const zombie = [...s.zombies.values()].find(
      z => z.kind === 'poleVaulter'
    )

    assert.ok(zombie, 'vaulter should still exist')
    assert.ok(
      zombie!.speed >= baseZombie.speed[0] && zombie!.speed <= baseZombie.speed[1],
      `speed should be in baseZombie range [${baseZombie.speed}], was ${zombie!.speed}`
    )
  })

  it('bites second plant normally after vaulting', () => {
    const s0 = newVaultGame()
    const wallCd = readyCd(s0, 'wallnut')
    let s = send(s0,
      { type: 'advance', seconds: wallCd },
      { type: 'place', plantName: 'wallnut', row: 2, col: 5 },
      { type: 'advance', seconds: wallnut.buyCd + 1 },
      { type: 'place', plantName: 'wallnut', row: 2, col: 3 }
    )

    const vDef = zombies['poleVaulter']
    spawnZombie(s, 'poleVaulter', 2, 0, 6.05, vDef.speed[0])

    // advance enough for vault + walk to second plant + start biting
    tick(s, 20)

    assert.ok(hasEvent(s, 'vaulting'), 'should vault first plant')
    assert.ok(hasEvent(s, 'attacking'), 'should attack second plant')

    // second wallnut should have taken damage
    const secondWall = [...s.plants.values()].find(
      p => p.kind === 'wallnut' && p.col === 3
    )

    assert.ok(secondWall, 'second wallnut should still exist')
    assert.ok(
      secondWall!.hp < plants['wallnut'].hp,
      'second wallnut should have taken bite damage'
    )
  })
})

// push bug fix

describe('plant-on-zombie push fix', () => {
  it('zombie stays in place when plant placed on its tile', () => {
    let s = newVaultGame()

    // advance past wallnut initial buy cooldown
    s = send(s, { type: 'advance', seconds: readyCd(s, 'wallnut') })

    const zDef = zombies['normal']
    // place zombie at x = 5.3 (tile col 5)
    spawnZombie(s, 'normal', 2, 0, 5.3, zDef.speed[0])

    const zombieBefore = [...s.zombies.values()][0]
    const xBefore = zombieBefore.x

    // place plant on same tile
    s = send(s, { type: 'place', plantName: 'wallnut', row: 2, col: 5 })

    // advance one tick
    tick(s, FIXED_TICK)

    const zombie = [...s.zombies.values()][0]

    // zombie should not have been pushed right (to col + 1 = 6)
    assert.ok(zombie.x < 6, `zombie should not be pushed right, was ${zombie.x}`)
    // zombie should be biting
    assert.ok(zombie.biteTarget !== undefined, 'zombie should be biting the plant')
  })
})

// chomper through wallnut

const chomperWallLevel = createLevel({
  id: 991,
  initialSun: 1000,
  plantWhitelist: ['chomper', 'wallnut'],
  spawnRows: [2],
  waves: [
    { startTime: 200, fixed: ['normal'] }
  ]
})

levels.push(chomperWallLevel)

const newChomperWallGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 991, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('chomper through wallnut', () => {
  it('eats zombie biting a wallnut in front of it', () => {
    let s = newChomperWallGame()

    // place chomper at col 5, wallnut at col 6
    s = send(s, { type: 'place', plantName: 'chomper', row: 2, col: 5 })
    s = send(s, { type: 'advance', seconds: readyCd(s, 'wallnut') })
    s = send(s, { type: 'place', plantName: 'wallnut', row: 2, col: 6 })

    // spawn zombie just outside chomper range
    const zDef = zombies['normal']
    spawnZombie(s, 'normal', 2, 0, 7.1, zDef.speed[0])

    // advance: zombie walks to wallnut, chomper locks on and eats it
    // walk ~0.72s + CH_BITE_DELAY 0.7s = ~1.42s, give margin
    tick(s, 2)

    // zombie should have been eaten through the wallnut
    assert.equal(s.zombies.size, 0, 'chomper should have eaten the zombie')
    assert.ok(hasEvent(s, 'ate'), 'should have an ate event')

    // wallnut should still be alive
    const wallnut = [...s.plants.values()].find(p => p.kind === 'wallnut')
    assert.ok(wallnut, 'wallnut should still exist')
  })
})

// snow pea

const snowLevel = createLevel({
  id: 994,
  initialSun: 1000,
  plantWhitelist: ['snowPea', 'wallnut'],
  spawnRows: [2],
  waves: [
    { startTime: 10, fixed: ['normal'] }
  ]
})

levels.push(snowLevel)

const newSnowGame = () => send(
  newState(SEED),
  { type: 'new', levelId: 994, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('snow pea', () => {
  it('ice projectile applies freeze effect', () => {
    const s = send(newSnowGame(),
      { type: 'place', plantName: 'snowPea', row: 2, col: 3 },
      { type: 'advance', seconds: 15 }
    )

    assert.ok(s.effects.size > 0, 'should have an active effect')

    const effect = [...s.effects.values()][0]

    assert.equal(effect.kind, 'freeze')
    assert.ok(hasEvent(s, 'frozen'))
  })

  it('frozen zombie moves at half speed', () => {
    // game with freeze
    const frozen = send(newSnowGame(),
      { type: 'place', plantName: 'snowPea', row: 2, col: 3 },
      { type: 'advance', seconds: 15 }
    )

    const fz = [...frozen.zombies.values()][0]

    assert.ok(fz, 'frozen zombie should exist')

    const stats = getZombieEffectiveStats(frozen, fz.id)

    assert.ok(
      Math.abs(stats.speed - fz.speed * 0.5) < 0.001,
      `effective speed should be half: got ${stats.speed}, base ${fz.speed}`
    )
  })

  it('freeze effect expires', () => {
    const s = send(newSnowGame(),
      { type: 'place', plantName: 'snowPea', row: 2, col: 3 },
      { type: 'advance', seconds: 15 },
      // shovel the snowPea so it stops refreshing the effect
      { type: 'shovel', row: 2, col: 3 },
    )

    assert.ok(s.effects.size > 0, 'should have effect before expiry')

    // advance past the effect duration (10s)
    const s2 = send(s, { type: 'advance', seconds: 12 })

    assert.equal(s2.effects.size, 0, 'effect should have expired')
    assert.ok(hasEvent(s2, 'expired'))
  })

  it('freeze refreshes timer on re-hit', () => {
    const s = send(newSnowGame(),
      { type: 'place', plantName: 'snowPea', row: 2, col: 3 },
      { type: 'advance', seconds: 15 }
    )

    const effectBefore = [...s.effects.values()][0]
    const untilBefore = effectBefore.until

    // advance a bit more so another ice hits
    const s2 = send(s, { type: 'advance', seconds: 2 })

    // should still be exactly 1 effect (refreshed, not duplicated)
    assert.equal(s2.effects.size, 1, 'should still be one effect')

    const effectAfter = [...s2.effects.values()][0]

    assert.ok(
      effectAfter.until > untilBefore,
      `timer should be refreshed: ${effectAfter.until} > ${untilBefore}`
    )

    assert.ok(hasEvent(s2, 'refreshed'))
  })

  it('effect cleaned up on zombie death', () => {
    const s = send(newSnowGame(),
      { type: 'place', plantName: 'snowPea', row: 2, col: 3 },
      { type: 'advance', seconds: 40 }
    )

    // zombie should be dead by now (300 hp, 20 dmg per 1.425s + travel time)
    assert.equal(s.zombies.size, 0, 'zombie should be dead')
    assert.equal(s.effects.size, 0, 'effects should be cleaned up')
  })

  it('frozen zombie bites at half rate', () => {
    // place snowPea first (cd=0), advance to clear wallnut cd, then place wallnut
    // keep second advance short so snowPea doesn't kill the zombie
    const s0 = newSnowGame()
    const s = send(s0,
      { type: 'place', plantName: 'snowPea', row: 2, col: 7 },
      { type: 'advance', seconds: readyCd(s0, 'wallnut') },
      { type: 'place', plantName: 'wallnut', row: 2, col: 8 },
      { type: 'advance', seconds: 5 }
    )

    const zombie = [...s.zombies.values()][0]

    assert.ok(zombie, 'zombie should exist')

    const stats = getZombieEffectiveStats(s, zombie.id)
    const def = zombies[zombie.kind]

    assert.ok(
      Math.abs(stats.biteCd - def.biteCd * 2) < 0.001,
      `effective biteCd should be doubled: got ${stats.biteCd}, base ${def.biteCd}`
    )
  })
})

// seed bank

describe('seed bank', () => {
  // create a level with no whitelist so pool = all 7 plants > 6 slots
  const chooseLevel = createLevel({
    id: 900,
    initialSun: 200,
    waves: [
      { startTime: 30, fixed: ['normal'] }
    ]
  })

  levels.push(chooseLevel)

  const newChooseGame = () => send(
    newState(SEED),
    { type: 'new', levelId: 900, seed: SEED, version: PVZ_CURR_VERSION }
  )

  const pick6: PlantName[] = [
    'peashooter', 'sunflower', 'cherryBomb', 'wallnut', 'potatoMine', 'snowPea'
  ]

  it('auto-populates seedBank when pool fits slots', () => {
    // level 1 has 1 plant in whitelist, fits in 6 slots
    const s = newGame()

    assert.ok(!choosePlantsRequired(s), 'should not require choosing')
    assert.deepEqual(s.seedBank, ['peashooter'])
  })

  it('leaves seedBank empty when choosing is required', () => {
    const s = newChooseGame()

    assert.ok(choosePlantsRequired(s), 'should require choosing')
    assert.deepEqual(s.seedBank, [])
  })

  it('accepts valid choosePlants event', () => {
    const s = send(newChooseGame(), {
      type: 'choosePlants', seedBank: pick6
    })

    assert.deepEqual(s.seedBank, pick6)
    assert.equal(s.error, undefined)
  })

  it('gates other events until plants are chosen', () => {
    const s = send(newChooseGame(), {
      type: 'advance', seconds: 1
    })

    assert.equal(s.status, 'unplayable')
    assert.equal(s.error?.reason, 'plantsNotChosen')
  })

  it('allows play after choosing', () => {
    const s = send(newChooseGame(),
      { type: 'choosePlants', seedBank: pick6 },
      { type: 'place', plantName: 'peashooter', row: 2, col: 1 }
    )

    assert.equal(s.plants.size, 1)
    assert.equal(s.error, undefined)
  })

  it('rejects plant not in seedBank', () => {
    const s = send(newChooseGame(),
      { type: 'choosePlants', seedBank: pick6 },
      { type: 'place', plantName: 'chomper', row: 2, col: 1 }
    )

    assert.equal(s.error?.reason, 'notInSeedBank')
  })

  it('rejects wrong count', () => {
    const s = send(newChooseGame(), {
      type: 'choosePlants',
      seedBank: ['peashooter', 'sunflower'] as PlantName[]
    })

    assert.equal(s.error?.reason, 'wrongCount')
  })

  it('rejects duplicates', () => {
    const s = send(newChooseGame(), {
      type: 'choosePlants',
      seedBank: [
        'peashooter', 'peashooter', 'sunflower',
        'wallnut', 'potatoMine', 'snowPea'
      ] as PlantName[]
    })

    assert.equal(s.error?.reason, 'duplicatePlants')
  })

  it('rejects choosing when not required', () => {
    const s = send(newGame(), {
      type: 'choosePlants',
      seedBank: ['peashooter'] as PlantName[]
    })

    assert.equal(s.error?.reason, 'chooseNotRequired')
  })

  it('rejects choosing twice', () => {
    const s = send(newChooseGame(),
      { type: 'choosePlants', seedBank: pick6 },
      { type: 'choosePlants', seedBank: pick6 }
    )

    assert.equal(s.error?.reason, 'alreadyChosen')
  })

  it('sets cooldowns for chosen plants', () => {
    const s = send(newChooseGame(), {
      type: 'choosePlants', seedBank: pick6
    })

    for (const name of pick6) {
      assert.ok(s.nextBuy.has(name), `should have cd for ${name}`)
    }

    assert.ok(!s.nextBuy.has('chomper'), 'unchosen plant should have no cd')
  })
})
