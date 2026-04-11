import {
  assertPositiveInt, assertPositive, assertNonZero,
  assertFinite
} from '../../lib/util.js'

import { isAdvanceCondition, isPlantName } from './pvz-guards.js'
import { formatPos, formatRow, parsePos, parseRow } from './pvz-util.js'
import { PvzEvent } from './pvz-types.js'

const dataToArgs = (data: string) =>
  data.split(' ').map(s => s.trim()).filter(s => s !== '')

export const parsePvzEvent = (data: string): PvzEvent => {
  const [type, ...args] = dataToArgs(data)

  // eg 'new 7 1775623176551 0.1'
  if (type === 'new') {
    const [levelId, seed, version] = args.map(Number)

    // level ids should be uint
    assertPositiveInt(levelId)
    // no zero, NaN etc for rng plz
    assertNonZero(seed)
    // any actual number
    assertFinite(version)

    return { type, levelId, seed, version }
  }

  // eg 'place sunflower C3'
  if (type === 'place') {
    const [plantName, pos] = args

    if (!isPlantName(plantName)) {
      throw Error(`Expected a plant name, saw "${plantName}"`)
    }

    const [row, col] = parsePos(pos)

    return { type, plantName, row, col }
  }

  // eg 'shovel C3'
  if (type === 'shovel') {
    const [row, col] = parsePos(args[0])

    return { type, row, col }
  }

  // eg 'launchMower C'
  if (type === 'launchMower') {
    const row = parseRow(args[0])

    return { type, row }
  }

  // eg 'advance 0.5'
  if (type === 'advance') {
    const seconds = Number(args[0])

    assertPositive(seconds)

    return { type, seconds }
  }

  // eg 'advanceUntil sunIncrease'
  if (type === 'advanceUntil') {
    const condition = args[0]

    if (!isAdvanceCondition(condition)) {
      throw Error(`Expected advance condition, saw "${condition}"`)
    }

    return { type, condition }
  }

  throw Error(`Unexpected command "${data}"`)
}

export const formatPvzEvent = (event: PvzEvent) => {
  if (event.type === 'new') {
    return `new ${event.levelId} ${event.seed} ${event.version}`
  }

  if (event.type === 'place') {
    return `place ${event.plantName} ${formatPos(event.row, event.col)}`
  }

  if (event.type === 'shovel') {
    return `shovel ${formatPos(event.row, event.col)}`
  }

  if (event.type === 'launchMower') {
    return `launchMower ${formatRow(event.row)}`
  }

  if (event.type === 'advance') {
    return `advance ${event.seconds}`
  }

  if (event.type === 'advanceUntil') {
    return `advanceUntil ${event.condition}`
  }

  throw Error('Unexpected event')
}
