import { maybe, seq } from '../../lib/util.js'
import { BOARD_COLS, BOARD_ROWS } from './pvz-const.js'
import { formatPos, formatRow, getIdx } from './pvz-util.js'
import { PlantName, PvzState, ZombieName } from './pvz-types.js'
import { stateToGrid } from './sim/pvz-state.js'

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

const plantKeys: Record<PlantName, string> = {
  sunflower: 'S',
  peashooter: 'P'
}

const zombieKeys: Record<ZombieName, string> = {
  normal: 'Z',
  cone: 'C',
  bucket: 'B'
}

const mowerKey = 'L'
const projectileKey = 'O'
const grassKey = '.'

const nameToKey: Record<string, string> = {
  ...plantKeys,
  ...zombieKeys,
  mower: mowerKey,
  pea: projectileKey,
  grass: grassKey
}

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

  const lines: string[] = [
    header,
    ''
  ]

  const keys: Key[] = [...singleKeys]

  let nextMultiKey = 1

  for (let row = 0; row < BOARD_ROWS; row++) {
    let line = `${formatRow(row)} `
    let prevMulti = false

    for (let col = 0; col < BOARD_COLS; col++) {
      const contents: string[] = []

      const idx = getIdx(row, col)
      const tile = grid.data[idx]

      if (maybe(tile.mower)) contents.push('mower')
      if (maybe(tile.plant)) contents.push(state.plants.get(tile.plant)!.kind)

      contents.push(...seq(tile.projectiles.length, () => 'pea'))
      contents.push(...tile.zombies.map(id => state.zombies.get(id)!.kind))

      const isMulti = contents.length > 1

      line += (isMulti || prevMulti) ? ':' : ' '

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
          names: contents
        })

        nextMultiKey++
      } else if (contents.length) {
        line += nameToKey[contents[0]]
      } else {
        line += grassKey
      }

      prevMulti = isMulti
    }

    lines.push(line)
  }

  return { lines, keys }
}
