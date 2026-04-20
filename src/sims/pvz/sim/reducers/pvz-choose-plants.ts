import { INSTANT_BUY_THRESHOLD } from '../../pvz-const.js'
import { PvzState, PvzChoosePlantsEvent } from '../../pvz-types.js'
import { choosePlantsRequired, getPlantPool } from '../pvz-query.js'
import { newEventState } from '../pvz-state.js'
import { actionFail } from '../pvz-sim-util.js'
import { plants } from '../../data/pvz-defs.js'

export const reducePvzChoosePlants = (
  state: PvzState, event: PvzChoosePlantsEvent
): PvzState => {
  state = newEventState(state)

  if (!choosePlantsRequired(state)) {
    state.error = actionFail('choosePlants', 'chooseNotRequired')
    return state
  }

  if (state.seedBank.length > 0) {
    state.error = actionFail('choosePlants', 'alreadyChosen')
    return state
  }

  const { seedBank } = event

  if (seedBank.length !== state.seedBankSlots) {
    state.error = actionFail(
      'choosePlants', 'wrongCount',
      `Expected ${state.seedBankSlots} plants, got ${seedBank.length}`
    )
    return state
  }

  if (new Set(seedBank).size !== seedBank.length) {
    state.error = actionFail('choosePlants', 'duplicatePlants')
    return state
  }

  const pool = getPlantPool(state.levelId)

  for (const plant of seedBank) {
    if (!pool.includes(plant)) {
      state.error = actionFail(
        'choosePlants', 'notInPool',
        `"${plant}" is not available for this level`
      )
      return state
    }
  }

  state.seedBank = [...seedBank]

  // reset cooldowns for chosen plants only
  state.nextBuy.clear()

  for (const plant of seedBank) {
    const def = plants[plant]

    const cd = (
      def.buyCd <= INSTANT_BUY_THRESHOLD ?
        0 :
        Math.max(0, def.buyCd * 0.75 - 2.5)
    )

    state.nextBuy.set(plant, cd)
  }

  return state
}
