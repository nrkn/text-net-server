import { maybe } from '../../../lib/util.js'
import { levels } from '../data/pvz-defs.js'
import { PvzEventType, PvzActionFailed } from '../pvz-types.js'

export const getLevel = (levelId: number) => {
  // level 1 is in levels[ 0 ] etc

  const level = levels[levelId - 1]

  if (maybe(level)) return level

  throw Error(`Level out of range: "${levelId}"`)
}

export const actionFail = (
  event: PvzEventType, reason: string, message?: string
): PvzActionFailed =>
  ({ ok: false, event, reason, message })
