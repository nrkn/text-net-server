export type GgNewEvent = {
  type: 'new'
  seed: number
}

export type GgGuessEvent = {
  type: 'guess'
  value: number
}

export type GgEvent = GgNewEvent | GgGuessEvent

export type GgState = {
  target: number
  attempts: number
  finished: boolean
}