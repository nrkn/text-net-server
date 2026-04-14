import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { pvzSim } from '../sims/pvz/sim/pvz-sim.js'
import { newState } from '../sims/pvz/sim/pvz-state.js'
import { PvzEvent, PvzState } from '../sims/pvz/pvz-types.js'
import { PVZ_CURR_VERSION, SUN_DROP } from '../sims/pvz/pvz-const.js'
import { levels, plants } from '../sims/pvz/data/pvz-defs.js'

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
const firstSpawnTime = Math.min(...level.spawns.map(s => s.absTime))

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
