import { MenuItem, TextScreen } from '../lib/view/types.js'
import { RtrApp } from '../lib/routing/types.js'
import { ConnectionState } from '../lib/app/types.js'
import { useStaticRoutes, loadStaticScreen } from '../lib/static/middleware.js'
import { Store } from '../lib/log/types.js'
import { createLog } from '../lib/log/create-log.js'
import { createReducerStore } from '../lib/log/create-store.js'
import { PvzState, PvzEvent, PlantName } from '../sims/pvz/pvz-types.js'
import { pvzSim } from '../sims/pvz/sim/pvz-sim.js'
import { parsePvzEvent, formatPvzEvent } from '../sims/pvz/pvz-serialize.js'
import { newState } from '../sims/pvz/sim/pvz-state.js'
import { pvzBoardView } from '../sims/pvz/pvz-views.js'

import {
  PVZ_CURR_VERSION, pvzLogLevels, PvzLogLevel, PVZ_DEFAULT_LOG_LEVEL
} from '../sims/pvz/pvz-const.js'

import { filterTickEvents } from '../sims/pvz/pvz-log-filter.js'
import { levels } from '../sims/pvz/data/pvz-defs.js'

import {
  keyToPlant, plantKeys, zombieKeys, mowerKey, projectileKey
} from '../sims/pvz/pvz-keys.js'

import { LevelDef } from '../sims/pvz/data/pvz-def-types.js'
import { currentWaveIndex, getPlantCds } from '../sims/pvz/sim/pvz-query.js'
import { isPlantName } from '../sims/pvz/pvz-guards.js'
import { parsePos, parseRow } from '../sims/pvz/pvz-util.js'
import { Session } from '../lib/types.js'
import { existsSync } from 'node:fs'
import { screen } from '../lib/view/screen.js'
import { input } from '../lib/view/input-path.js'
import { menu } from '../lib/view/menu.js'
import { p, h1 } from '../lib/view/util.js'
import { tab } from '../lib/view/table.js'

const STATIC_DIR = 'data/test-app/pvz/static'
const LOGS_DIR = 'data/test-app/pvz/logs'

const INITIAL_STATE: PvzState = newState(1)

const stores = new Map<string, Promise<Store<PvzState, PvzEvent>>>()

const getOrCreateStore = (token: string) => {
  let storePromise = stores.get(token)

  if (!storePromise) {
    const log = createLog(`${LOGS_DIR}/${token}`, 'pvz')

    storePromise = createReducerStore<PvzState, PvzEvent>(
      log, INITIAL_STATE, pvzSim,
      { parse: parsePvzEvent, format: formatPvzEvent }
    )

    stores.set(token, storePromise)
  }

  return storePromise
}

const isInProgress = (state: PvzState) =>
  state.levelId !== 0 && state.status === 'playing'

const getPvzLogLevel = (session: Session): PvzLogLevel => {
  const v = session.data.pvzLogLevel

  if (typeof v === 'string' && pvzLogLevels.includes(v as PvzLogLevel))
    return v as PvzLogLevel

  return PVZ_DEFAULT_LOG_LEVEL
}

const setPvzLogLevel = (session: Session, level: PvzLogLevel) => {
  session.data.pvzLogLevel = level
  session.dirty = true
}

const formatTime = (t: number) => {
  const s = Math.floor(t)
  const m = Math.floor(s / 60)
  const rem = s % 60

  return m > 0 ? `${m}M ${rem}S` : `${rem}S`
}

const conditionShorts: Record<string, string> = {
  S: 'sunIncrease',
  Z: 'zombieSpawn',
  P: 'plantReady',
  SUN: 'sunIncrease',
  ZOMBIE: 'zombieSpawn',
  PLANT: 'plantReady',
}

type CommandResult =
  | { event: PvzEvent }
  | { redirect: string }
  | { error: string }
  | { logLevel: PvzLogLevel }

const resolveCommand = (
  raw: string, state: PvzState
): CommandResult => {
  const parts = raw.trim().toUpperCase().split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)

  if (!cmd) return { error: 'Empty command' }

  // Leave
  if (cmd === 'L' || cmd === 'LEAVE') {
    return { redirect: '/leave' }
  }

  // Advance - A {seconds}
  if (cmd === 'A' || cmd === 'ADVANCE') {
    const seconds = Number(args[0])

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return { error: 'Advance should be a positive number' }
    }

    return { event: { type: 'advance', seconds } }
  }

  // Wait - W {condition}
  if (cmd === 'W' || cmd === 'WAIT') {
    const condKey = (args[0] || '').toUpperCase()
    const condition = conditionShorts[condKey]

    if (!condition) {
      return { error: 'Wait expects S (Sun), Z (Zombie) or P (Plant)' }
    }

    return {
      event: {
        type: 'advanceUntil',
        condition: condition as PvzEvent & { type: 'advanceUntil' } extends { condition: infer C } ? C : never
      }
    }
  }

  // Shovel - S {pos}  
  if (cmd === 'SHOVEL') {
    return parsePlaceOrShovel('shovel', args)
  }

  // Mower - M {row}
  if (cmd === 'M' || cmd === 'MOWER') {
    if (!args[0]) return { error: 'Mower expects a row (A-E)' }

    try {
      const row = parseRow(args[0])
      return { event: { type: 'launchMower', row } }
    } catch {
      return { error: `Invalid row "${args[0]}"` }
    }
  }

  // Place - P {pos} or P {plant} {pos}
  if (cmd === 'P' || cmd === 'PLACE') {
    return resolvePlaceCommand(args, state)
  }

  // Verbosity - V cycles, V {level} sets directly
  if (cmd === 'V' || cmd === 'LOG') {
    if (args[0]) {
      const arg = args[0].toLowerCase()
      if (pvzLogLevels.includes(arg as PvzLogLevel)) {
        return { logLevel: arg as PvzLogLevel }
      }
      return {
        error: `Unknown log level "${args[0]}" (none,minimal,detailed,verbose)`
      }
    }

    return { logLevel: '__cycle' as PvzLogLevel }
  }

  // S could be shovel or sunflower shorthand place
  // If S + a position arg, treat as shovel
  if (cmd === 'S') {
    if (args.length === 0) return { error: 'S needs a position (eg S C3)' }

    return parsePlaceOrShovel('shovel', args)
  }

  return { error: `Unknown command "${cmd}"` }
}

const parsePlaceOrShovel = (
  type: 'shovel', args: string[]
): { event: PvzEvent } | { error: string } => {
  if (!args[0]) return { error: 'Shovel needs a position (eg S C3)' }

  try {
    const [row, col] = parsePos(args[0])
    return { event: { type, row, col } }
  } catch {
    return { error: `Invalid position "${args[0]}"` }
  }
}

const resolvePlaceCommand = (
  args: string[], state: PvzState
): { event: PvzEvent } | { error: string } => {
  const level = levels.find(l => l.id === state.levelId)

  if (!level) return { error: 'No level loaded' }

  // P {pos} - infer plant when whitelist has one entry
  // P {plant} {pos} - explicit plant
  if (args.length === 0) return { error: 'Place needs a position' }

  let plantName: string | undefined
  let posStr: string

  if (args.length === 1) {
    // infer plant
    const wl = level.plantWhitelist

    if (!wl || wl.length !== 1) {
      return { error: 'Specify a plant (eg P S C3)' }
    }

    plantName = wl[0]
    posStr = args[0]
  } else {
    const plantArg = args[0].toUpperCase()

    // try key lookup first (S, P, X)
    plantName = keyToPlant.get(plantArg)

    // try full name
    if (!plantName) {
      const lower = args[0].toLowerCase()
      if (isPlantName(lower)) plantName = lower
    }

    if (!plantName) {
      return { error: `Unknown plant "${args[0]}"` }
    }

    posStr = args[1]
  }

  if (!posStr) return { error: 'Place needs a position' }

  try {
    const [row, col] = parsePos(posStr)

    return {
      event: {
        type: 'place',
        plantName: plantName as PvzEvent & { type: 'place' } extends { plantName: infer N } ? N : never, row, col
      }
    }
  } catch {
    return { error: `Invalid position "${posStr}"` }
  }
}

// render

const keyLegendLines = (boardView: ReturnType<typeof pvzBoardView>) => {
  const lines: string[] = []

  // single keys that appear on the board are in the view's singleKeys list
  // multi keys need expanding
  for (const key of boardView.keys) {
    if (key.kind === 'multi') {
      lines.push(`${key.key} ${key.pos} ${key.names.join(', ')}`)
    }
  }

  return lines
}

const levelZombieKinds = (level: LevelDef) => {
  const kinds = new Set<string>(['normal'])

  for (const wave of level.waves) {
    if (wave.fixed) for (const k of wave.fixed) kinds.add(k)
    if (wave.pool) for (const k of wave.pool) kinds.add(k)
  }

  return kinds
}

const singleKeyLegend = (level: LevelDef) => {
  const entries: [string, string][] = []

  const wl = level.plantWhitelist ?? Object.keys(plantKeys)
  for (const name of wl) {
    const key = plantKeys[name as keyof typeof plantKeys]
    if (key) entries.push([name, key])
  }

  const zk = levelZombieKinds(level)
  for (const name of zk) {
    const key = zombieKeys[name as keyof typeof zombieKeys]
    if (key) entries.push([name, key])
  }

  if (level.initialMowers.some(Boolean)) entries.push(['mower', mowerKey])

  entries.push(['pea', projectileKey])

  return entries.map(([name, key]) => `${key}:${name}`).join(' ')
}

const commandHelp = (state: PvzState, logLevel: PvzLogLevel) => {
  const level = levels.find(l => l.id === state.levelId)
  const rows: string[][] = []

  // place
  if (level?.plantWhitelist && level.plantWhitelist.length === 1) {
    rows.push([`P {pos}`, ` - place ${level.plantWhitelist[0]}`])
  } else {
    rows.push([`P {plant} {pos}`, ' - place plant'])
  }

  // shovel
  if (level?.canShovel) {
    rows.push(['S {pos}', ' - shovel'])
  }

  // mower
  if (level?.canLaunch) {
    rows.push(['M {row}', ' - launch mower'])
  }

  // advance
  rows.push(['A {seconds}', ' - advance time'])

  // wait
  rows.push(['W S,Z,P', ' - wait for sun,zombie,plant'])

  // verbosity
  rows.push([`V {level}`, ` - log level (${logLevel})`])

  // leave
  rows.push(['L', ' - leave'])

  return rows
}

const plantCdsDisplay = (state: PvzState) => {
  const plantCds = getPlantCds(state)

  const plantNames = (Object.keys(plantCds) as PlantName[]).filter(
    p => plantCds[p] > 0
  )

  if (plantNames.length === 0) return 'CD: none'

  return 'CD: ' + plantNames.map(
    p => `${plantKeys[p]} ${plantCds[p].toFixed(2)}`
  ).join(', ')
}

const playScreen = (state: PvzState, logLevel: PvzLogLevel): TextScreen => {
  const level = levels.find(l => l.id === state.levelId)
  const waveCount = level?.waves.length ?? 0
  const curWave = currentWaveIndex(state)

  const boardView = pvzBoardView(state)
  const multiLines = keyLegendLines(boardView)

  const screenParts: Parameters<typeof screen> = [
    h1(`PVZ - Level ${state.levelId}`),
    p(
      `Sun: ${state.sun}  Time: ${formatTime(state.time)}  ` +
      `Wave: ${curWave + 1} of ${waveCount}`,
      plantCdsDisplay(state)
    ),
    p(...boardView.lines),
  ]

  // key legend
  screenParts.push(p(singleKeyLegend(level!)))

  if (multiLines.length > 0) {
    screenParts.push(p(...multiLines))
  }

  // tick events from last action, filtered by log level
  const filtered = filterTickEvents(state.tickEvents, logLevel)

  if (filtered.length > 0) {
    screenParts.push(p(...filtered))
  }

  // error from last action
  if (state.error) {
    const msg = state.error.message ?? state.error.reason
    screenParts.push(p(`Error: ${msg}`))
  }

  screenParts.push(tab(...commandHelp(state, logLevel)))
  screenParts.push(input('/cmd/:command'))

  return screen(...screenParts)
}

const endScreen = (state: PvzState): TextScreen => {
  const title = state.status === 'won' ? 'You Win!' : 'Game Over'
  const message = state.status === 'won'
    ? `You survived Level ${state.levelId} in ${formatTime(state.time)}.`
    : 'The zombies reached your house.'

  const items: MenuItem[] = []

  if (state.status === 'won') {
    const nextLevel = levels.find(l => l.id === state.levelId + 1)

    if (nextLevel) {
      items.push(
        ['C', `Continue to Level ${nextLevel.id}`, `/new/${nextLevel.id}`]
      )
    }
  }

  items.push(['N', 'New Game', '/main'])
  items.push(['L', 'Leave', '/leave'])

  return screen(
    h1(title),
    p(message),
    menu('Commands', ...items)
  )
}

export const setupPvzRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState
) => {
  useStaticRoutes(app, STATIC_DIR, () => state.session)

  // override static /main - redirect to /play if a game is in progress
  app.on('/main', async (_req, res) => {
    const token = state.session!.token

    if (stores.has(token) || existsSync(`${LOGS_DIR}/${token}/pvz.log`)) {
      const store = await getOrCreateStore(token)
      const gameState = store.getState()

      if (isInProgress(gameState)) {
        return res.redirect('/play')
      }
    }

    res.send(screen(
      h1('Plants vs Zombies'),
      'Choose a level to play.',
      menu('Levels',
        ...levels.map(
          (l, i) => [`${i + 1}`, `Level ${l.id}`, `/new/${l.id}`] as MenuItem
        ),
        ['L', 'Leave', '/leave']
      )
    ))
  })

  app.on('/new/:level', async (req, res) => {
    const levelId = Number(req.params.level)

    if (!levels.find(l => l.id === levelId)) {
      return res.redirect('/main')
    }

    const store = await getOrCreateStore(state.session!.token)

    await store.dispatch({
      type: 'new',
      levelId,
      seed: Date.now(),
      version: PVZ_CURR_VERSION
    })

    return res.redirect('/play')
  })

  app.on('/play', async (_req, res) => {
    const store = await getOrCreateStore(state.session!.token)
    const gameState = store.getState()

    if (gameState.levelId === 0) {
      return res.redirect('/main')
    }

    if (gameState.status !== 'playing') {
      return res.send(endScreen(gameState))
    }

    const logLevel = getPvzLogLevel(state.session!)

    res.send(playScreen(gameState, logLevel))
  })

  app.on('/cmd/:command', async (req, res) => {
    const store = await getOrCreateStore(state.session!.token)
    const gameState = store.getState()

    if (!isInProgress(gameState)) {
      return res.redirect('/play')
    }

    const result = resolveCommand(req.params.command, gameState)

    if ('redirect' in result) {
      return res.redirect(result.redirect)
    }

    if ('error' in result) {
      // store the error in a way the play screen can show it
      // we can't easily flash, so just redirect - the sim state 
      // already has error handling for invalid dispatches
      return res.redirect('/play')
    }

    if ('logLevel' in result) {
      const session = state.session!

      if (result.logLevel === '__cycle' as PvzLogLevel) {
        const current = getPvzLogLevel(session)
        const idx = pvzLogLevels.indexOf(current)
        const next = pvzLogLevels[(idx + 1) % pvzLogLevels.length]
        setPvzLogLevel(session, next)
      } else {
        setPvzLogLevel(session, result.logLevel)
      }

      return res.redirect('/play')
    }

    try {
      await store.dispatch(result.event)
    } catch (err: unknown) {
      // sim threw - redirect to play, state unchanged
      console.warn('PvZ sim threw error')
      console.error(err)
    }

    return res.redirect('/play')
  })
}
