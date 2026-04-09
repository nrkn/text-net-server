import {
  advanceConditions, BOARD_COLS, BOARD_ROWS, plantNames, zombieNames
} from './const.js'

import { AdvanceCondition, PlantName, ZombieName } from './types.js'

export const isPlantName = (value: any): value is PlantName =>
  plantNames.includes(value)

export const isZombieName = (value: any): value is ZombieName =>
  zombieNames.includes(value)

export const isAdvanceCondition = (value: any): value is AdvanceCondition =>
  advanceConditions.includes(value)

export const isRow = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) &&
  value >= 0 && value < BOARD_ROWS

export const isCol = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) &&
  value >= 0 && value < BOARD_COLS
