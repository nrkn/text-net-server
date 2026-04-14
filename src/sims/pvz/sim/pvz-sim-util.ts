import { maybe } from '../../../lib/util.js'
import { levels } from '../data/pvz-defs.js'
import { PvzEventType, PvzActionFailed } from '../pvz-types.js'

export const getLevel = (levelId: number) => {
  const level = levels.find(l => l.id === levelId)

  if (maybe(level)) return level

  throw Error(`Level not found: "${levelId}"`)
}

export const actionFail = (
  event: PvzEventType, reason: string, message?: string
): PvzActionFailed =>
  ({ ok: false, event, reason, message })
