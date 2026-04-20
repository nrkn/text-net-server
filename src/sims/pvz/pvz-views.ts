import { maybe, seq } from '../../lib/util.js'
import {
  BOARD_COLS, BOARD_ROWS, PLANT_ARMED, CH_EATING
} from './pvz-const.js'
import { nameToKey } from './pvz-keys.js'
import { formatPos, formatRow, getIdx } from './pvz-util.js'
import { PvzState } from './pvz-types.js'
import { stateToGrid } from './sim/pvz-state.js'
import { getLevel } from './sim/pvz-sim-util.js'
import { getZombieCountForRow } from './sim/pvz-query.js'

/*
   0 1 2 3 4 5 6 7 8 9 
A  L S . . . . . . Z .  
B  L S . . . . . . . Z 
C  L . . P . .:1:. . . 
D  L S . P-Z . . Z . C  
E  L S . . . . . .:2:Z 

1 C6 pea, normal
2 E8 bucket, normal, normal
*/

const header = `  ${seq(BOARD_COLS, i => ` ${i}`).join('')}`

const grassKey = '.'

type SingleKey = {
  kind: 'single'
  key: string
  name: string
}

const singleKeys = Object.entries(nameToKey).map(([key, name]) => ({
  kind: 'single', key, name
} as const))

type MultiKey = {
  kind: 'multi'
  key: number
  pos: string // eg C4
  names: string[]
}

type Key = SingleKey | MultiKey

export const pvzBoardView = (state: PvzState) => {
  const grid = stateToGrid(state)
  const level = getLevel(state.levelId)

  const lines: string[] = [
    header
  ]

  const keys: Key[] = [...singleKeys]

  let nextMultiKey = 1

  for (let row = 0; row < BOARD_ROWS; row++) {
    const levelHasRow = (
      maybe(level.spawnRows) ? level.spawnRows.includes(row) : true
    )

    if (!levelHasRow) continue

    let line = `${formatRow(row)} `
    let prevMulti = false
    let prevState = false

    for (let col = 0; col < BOARD_COLS; col++) {
      const contents: string[] = []

      const idx = getIdx(row, col)
      const tile = grid.data[idx]

      if (maybe(tile.mower)) contents.push('mower')

      if (maybe(tile.plant)) {
        const plant = state.plants.get(tile.plant)!

        if (plant.kind === 'potatoMine' && plant.currState !== PLANT_ARMED) {
          contents.push('mine:arming')
        } else if (plant.kind === 'chomper' && plant.currState === CH_EATING) {
          contents.push('chomper:eating')
        } else {
          contents.push(plant.kind)
        }
      }

      for (const id of tile.projectiles) {
        contents.push('projectile')
      }

      contents.push(...tile.zombies.map(id => state.zombies.get(id)!.kind))

      // collapse projectile overlaps - projectiles are transient and add
      // noise when sharing a tile with a plant or zombie
      const hasProjectile = contents.includes('projectile')
      const nonProjectiles = hasProjectile
        ? contents.filter(n => n !== 'projectile')
        : contents

      // only collapse if there's something else to show
      // if only projectiles, dedupe 'em to unique types
      const resolved = nonProjectiles.length > 0
        ? nonProjectiles
        : [...new Set(contents)]

      const isMulti = resolved.length > 1
      const isState = (
        resolved.length === 1 && resolved[0].includes(':')
      )

      const delim = (isMulti || prevMulti)
        ? ':'
        : (isState || prevState)
          ? ','
          : ' '

      line += delim

      // todo - but no rush - when zombie biting plant P-Z

      if (isMulti) {
        const pos = formatPos(row, col)

        // we can only fit 0..9 in the cell, in the unlikely event we exceed 9
        // multiKeys (eg a very crowded board) we will just replace it with ?
        const key = nextMultiKey < 10 ? nextMultiKey : '?'

        line += key

        keys.push({
          kind: 'multi',
          key: nextMultiKey,
          pos,
          names: resolved
        })

        nextMultiKey++
      } else if (resolved.length) {
        line += nameToKey[resolved[0]]
      } else {
        line += grassKey
      }

      prevMulti = isMulti
      prevState = isState
    }

    const zombieCount = getZombieCountForRow(state, row)

    if (zombieCount > 0) {
      line += `  ${zombieCount}`
    }

    lines.push(line)
  }

  return { lines, keys }
}
