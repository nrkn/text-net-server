import { LevelDefDefault } from '../pvz-def-types.js'
import { allMowers, allTiles } from '../pvz-def-util.js'

export const defaultLevel = (): LevelDefDefault => ({
  plantableTiles: allTiles(),
  
  initialPlants: [],
  initialMowers: allMowers(),
  
  canShovel: true,
  canLaunch: false,

  initialSun: 50,
  firstSun: 5.5,
  sunCd: 5
})