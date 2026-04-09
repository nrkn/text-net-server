import { isCol, isRow } from './guards.js'

const assertPos = (row: any, col: any) => {
  if (isRow(row) && isCol(col)) return

  throw Error(`Expected a valid position, saw row="${row}", col="${col}"`)
}

const assertRow = (row: any) => {
  if (isRow(row)) return

  throw Error(`Expected a valid row, saw "${row}"`)
}

export const parseRow = (rowS: string) => {
  const row = rowS.toUpperCase().charCodeAt(0) - 65

  if (!isRow(row)) {
    throw Error(`Expected a valid row, saw "${rowS}"`)
  }

  return row
}

export const formatRow = (row: number) => {
  assertRow(row)

  return String.fromCharCode(row + 65)
}

export const parsePos = (pos: string): [number, number] => {
  const [rowS, colS] = pos.trim().split('')

  const row = parseRow(rowS)
  const col = Number(colS)

  if (!isCol(col)) {
    throw Error(`Expected a valid col, saw "${col}"`)
  }

  return [row, col]
}

export const formatPos = (row: number, col: number) => {
  assertPos(row, col)

  return `${formatRow(row)}${col}`
}
