import { TextScreen } from '../lib/view/types.js'
import { RtrApp } from '../lib/routing/types.js'
import { ConnectionState } from '../lib/app/types.js'
import { useStaticRoutes, loadStaticScreen } from '../lib/static/middleware.js'
import { Store } from '../lib/log/types.js'
import { createLog } from '../lib/log/create-log.js'
import { createReducerStore } from '../lib/log/create-store.js'
import { GgState, GgEvent } from '../sims/guessing-game/gg-types.js'
import { ggSim, parseGgEvent, formatGgEvent } from '../sims/guessing-game/gg-sim.js'
import { existsSync } from 'node:fs'
import { screen } from '../lib/view/screen.js'
import { input } from '../lib/view/input-path.js'
import { menu } from '../lib/view/menu.js'
import { p, h1 } from '../lib/view/util.js'
import { pluralize } from '../lib/render/text/text-util.js'

const STATIC_DIR = 'data/test-app/game/static'
const LOGS_DIR = 'data/test-app/game/logs'

const INITIAL_STATE: GgState = {
  target: 0,
  attempts: 0,
  finished: false
}

const stores = new Map<string, Promise<Store<GgState, GgEvent>>>()

const getOrCreateStore = (token: string) => {
  let storePromise = stores.get(token)

  if (!storePromise) {
    const log = createLog(`${LOGS_DIR}/${token}`, 'game')

    storePromise = createReducerStore<GgState, GgEvent>(
      log, INITIAL_STATE, ggSim,
      { parse: parseGgEvent as (data: string) => GgEvent, format: formatGgEvent }
    )

    stores.set(token, storePromise)
  }

  return storePromise
}

const getHint = (state: GgState): string => {
  if (state.lastGuess === undefined) return 'Make your first guess!'

  if (state.lastGuess < state.target) return `${state.lastGuess} is too low.`

  return `${state.lastGuess} is too high.`
}

const winScreen = (state: GgState): TextScreen => {
  const attempts = `${state.attempts} ` + pluralize(state.attempts, 'attempt')

  return screen(
    h1('You Win!'),
    p(`You found the number ${state.target} in ${attempts}.`),
    menu(
      'Commands',
      ['N', 'New Game', '/new'],
      ['L', 'Leave', '/leave']
    )
  )
}

const playScreen = (state: GgState): TextScreen => {
  if (state.finished) {
    return winScreen(state)
  }

  const parts = [
    h1('Guessing Game'),
    p(`Attempts: ${state.attempts}`),
    p(getHint(state)),
    p('Guess a number between 1 and 100:'),
    input('/guess/:value')
  ]

  return screen(...parts)
}

export const setupGameRoutes = (
  app: RtrApp<TextScreen>,
  state: ConnectionState
) => {
  useStaticRoutes(app, STATIC_DIR, () => state.session)

  // override static /main - redirect to /play if a game is in progress
  app.on('/main', async (_req, res) => {
    const token = state.session!.token

    if (stores.has(token) || existsSync(`${LOGS_DIR}/${token}/game.log`)) {
      const store = await getOrCreateStore(token)
      const gameState = store.getState()

      if (gameState.target !== 0 && !gameState.finished) {
        return res.redirect('/play')
      }
    }

    res.send(loadStaticScreen('main', STATIC_DIR, state.session))
  })

  app.on('/new', async (_req, res) => {
    const store = await getOrCreateStore(state.session!.token)

    await store.dispatch({ type: 'new', seed: Date.now() })

    return res.redirect('/play')
  })

  app.on('/guess/:value', async (req, res) => {
    const value = Number(req.params.value)

    if (!Number.isFinite(value) || value < 1 || value > 100) {
      return res.redirect('/play')
    }

    const store = await getOrCreateStore(state.session!.token)

    await store.dispatch({ type: 'guess', value })

    return res.redirect('/play')
  })

  app.on('/play', async (_req, res) => {
    const store = await getOrCreateStore(state.session!.token)
    const gameState = store.getState()

    if (gameState.target === 0) {
      return res.redirect('/main')
    }

    res.send(playScreen(gameState))
  })
}
