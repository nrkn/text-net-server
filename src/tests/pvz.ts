import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { pvzSim } from '../sims/pvz/sim/pvz-sim.js'
import { newState } from '../sims/pvz/sim/pvz-state.js'
import { PvzEvent, PvzState } from '../sims/pvz/pvz-types.js'
import { PVZ_CURR_VERSION, SUN_DROP, WAVE_MIN_TIME, WAVE_ACCEL_DELAY, FIXED_TICK } from '../sims/pvz/pvz-const.js'
import { replayPvzLog } from '../sims/pvz/pvz-replay.js'
import { levels, plants, zombies, projectiles } from '../sims/pvz/data/pvz-defs.js'
import { resolveWave, deriveWaveSeed, currentWaveIndex } from '../sims/pvz/sim/pvz-query.js'
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

// derive test constants from level/plant defs
const level = levels[0]
const pea = plants['peashooter']

const mowerRow = level.initialMowers.findIndex(m => m)
const firstSpawnTime = level.waves[0].startTime

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

    assert.equal(s.error?.reason, 'notInWhitelist')
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
    // launch mower early so it sweeps an empty board and exits,
    // then zombies arrive with no defense
    const s = send(newGame(),
      { type: 'launchMower', row: mowerRow },
      { type: 'advance', seconds: 300 }
    )

    assert.equal(s.status, 'lost')
    assert.ok(hasEvent(s, 'reachedHouse'))
  })
})

describe('mower', () => {
  it('launches manually', () => {
    const s = send(newGame(), { type: 'launchMower', row: mowerRow })

    assert.equal(s.mowers.get(mowerRow)!.active, true)
    assert.equal(s.error, undefined)
  })

  it('rejects launch on empty row', () => {
    const s = send(newGame(), { type: 'launchMower', row: 0 })

    assert.equal(s.error?.reason, 'noMowerInRow')
  })

  it('rejects second manual launch', () => {
    const s = send(newGame(),
      { type: 'launchMower', row: mowerRow },
      { type: 'launchMower', row: mowerRow }
    )

    // mower already launched and gone/active - second attempt fails
    // first launch sets state.launched = true, so even if re-added it 
    // would fail
    assert.ok(s.error !== undefined)
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
    const before = newGame()
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
const level2FirstSpawn = level2.waves[0].startTime

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
    const wave1Start = level.waves[0].startTime
    const wave2OrigStart = level.waves[1].startTime

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
    const wave2OrigStart = level.waves[1].startTime

    // advance past wave 1 start + WAVE_MIN_TIME but with no peashooter
    // zombie is still alive, 0% hp lost
    const s = send(newGame(),
      { type: 'advance', seconds: level.waves[0].startTime + WAVE_MIN_TIME + 1 }
    )

    assert.equal(s.waveStartTimes[1], wave2OrigStart)
    assert.ok(!hasEvent(s, 'waveAccelerated'))
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
const level3FirstSpawn = level3.waves[0].startTime

const newGame3 = () => send(
  newState(SEED),
  { type: 'new', levelId: 3, seed: SEED, version: PVZ_CURR_VERSION }
)

describe('level 1-3: basics', () => {
  it('initializes with all 5 mowers', () => {
    const s = newGame3()

    assert.equal(s.status, 'playing')
    assert.equal(s.mowers.size, 5)
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
      { type: 'advance', seconds: level3.waves[5].startTime + 1 }
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
    { startTime: 10, fixed: ['normal', 'normal'], pool: ['cone'] }
  ]
})

levels.push(testLevel)

const testFirstSpawn = testLevel.waves[0].startTime

const newGameTest = () => send(
  newState(SEED),
  { type: 'new', levelId: 999, seed: SEED, version: PVZ_CURR_VERSION }
)

const cherry = plants['cherryBomb']

describe('cherry bomb', () => {
  it('deducts sun and sets buy cooldown', () => {
    const s = send(newGameTest(),
      { type: 'advance', seconds: 1 },
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
    const s = send(newGameTest(),
      { type: 'place', plantName: 'sunflower', row: 2, col: 4 },
      { type: 'advance', seconds: 1 },
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
  // fixture: 2 waves, wave 0 at t=5 (single normal), wave 1 at t=15 (many normals)
  const mowerLevel = createLevel({
    id: 998,
    initialSun: 0,
    waves: [
      { startTime: 5, fixed: ['normal'] },
      { startTime: 15, fixed: [
        'normal', 'normal', 'normal', 'normal', 'normal',
        'normal', 'normal', 'normal', 'normal', 'normal',
        'normal', 'normal', 'normal', 'normal', 'normal',
        'normal', 'normal', 'normal', 'normal', 'normal'
      ] }
    ]
  })

  levels.push(mowerLevel)

  const newMowerGame = () => send(
    newState(SEED),
    { type: 'new', levelId: 998, seed: SEED, version: PVZ_CURR_VERSION }
  )

  it('records mowerFiredWave on auto-trigger', () => {
    // advance past wave 0 spawn, let zombie walk to mower
    const s = send(newMowerGame(),
      { type: 'advance', seconds: 40 }
    )

    assert.ok(s.mowerFiredWave.size > 0, 'should have recorded a mower fire')
  })

  it('deprioritizes mowed row in next wave', () => {
    // advance enough for mower to fire and wave 1 to spawn
    const s = send(newMowerGame(),
      { type: 'advance', seconds: 40 }
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
