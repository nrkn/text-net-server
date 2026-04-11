import { GgEvent, GgState } from './gg-types.js'

export const ggSim = (state: GgState, event: GgEvent): GgState => {
  if (state.finished) return state

  if (event.type === 'new') {
    const target = (event.seed % 100) + 1

    return {
      target,
      attempts: 0,
      finished: false
    }
  }

  if (event.type === 'guess') {
    const attempts = state.attempts + 1
    const finished = event.value === state.target

    return {
      ...state,
      attempts,
      finished,
      lastGuess: event.value
    }
  }

  throw Error(`Unknown event type: "${(event as GgEvent).type}"`)
}

export const parseGgEvent = (data: string) => {
  const [cmd, arg] = data.split(' ')

  if (cmd === 'new') return { type: 'new', seed: Number(arg) }

  if (cmd === 'guess') return { type: 'guess', value: Number(arg) }

  throw Error(`unknown event: ${data}`)
}

export const formatGgEvent = (event: GgEvent) => {
  if (event.type === 'new') return `new ${event.seed}`

  if (event.type === 'guess') return `guess ${event.value}`

  throw Error('invalid event')
}
