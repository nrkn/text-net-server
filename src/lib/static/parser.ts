import { ScreenArg } from '../view/types.js'
import { TextScreen } from '../view/types.js'
import { screen } from '../view/screen.js'
import { menu } from '../view/menu.js'
import { meta } from '../view/meta.js'
import { input } from '../view/input-path.js'
import { end } from '../view/end.js'
import { MenuItem } from '../view/types.js'

type BlockState = 'none' | 'menu' | 'meta' | 'tab'

const parseMenuLine = (line: string): MenuItem => {
  const parts = line.match(/^(\S+)\s+(.+?)\s+(\/\S+)$/)

  if (!parts) throw Error(`Invalid menu item: "${line}"`)

  return [parts[1], parts[2], parts[3]]
}

const parseMetaValue = (value: string): unknown => {
  if (value === 'true') return true
  if (value === 'false') return false

  const num = Number(value)

  if (!isNaN(num) && value !== '') return num

  return value
}

const parseTabRow = (line: string): string[] => {
  const cells: string[] = []
  let current = ''

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') {
      current += '|'
      i++
    } else if (line[i] === '|') {
      cells.push(current)
      current = ''
    } else {
      current += line[i]
    }
  }

  cells.push(current)

  return cells
}

export const parseStaticTextScreen = (staticText: string): TextScreen => {
  const lines = staticText.split('\n')
  const args: ScreenArg[] = []

  let block: BlockState = 'none'
  let menuTitle = ''
  let menuItems: MenuItem[] = []
  let metaObj: Record<string, unknown> = {}
  let tabRows: string[][] = []
  let textLines: string[] = []

  const flushText = () => {
    if (textLines.length === 0) return

    // trim trailing blank lines
    while (textLines.length > 0 && textLines[textLines.length - 1] === '')
      textLines.pop()

    if (textLines.length > 0) {
      // split on blank lines to create paragraph groups
      const paragraphs: string[][] = []
      let current: string[] = []

      for (const line of textLines) {
        if (line === '') {
          if (current.length > 0) {
            paragraphs.push(current)
            current = []
          }
        } else {
          current.push(line)
        }
      }

      if (current.length > 0) paragraphs.push(current)

      for (const para of paragraphs) {
        args.push({ type: 'paragraph', lines: para })
      }
    }

    textLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    // strip trailing \r for windows line endings
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    const trimmed = line.trim()

    // comments - only at line start (after trim)
    if (trimmed.startsWith('//')) continue

    // block close
    if (block !== 'none' && (trimmed === '==' || trimmed === '--')) {
      if (block === 'menu') {
        args.push(menu(menuTitle, ...menuItems))
        menuTitle = ''
        menuItems = []
      } else if (block === 'meta') {
        args.push(meta(metaObj))
        metaObj = {}
      } else if (block === 'tab') {
        args.push({ type: 'table', rows: tabRows })
        tabRows = []
      }

      block = 'none'
      continue
    }

    // inside blocks
    if (block === 'menu') {
      if (trimmed !== '') menuItems.push(parseMenuLine(trimmed))
      continue
    }

    if (block === 'meta') {
      if (trimmed !== '') {
        const spaceIdx = trimmed.indexOf(' ')

        if (spaceIdx === -1) {
          metaObj[trimmed] = true
        } else {
          const key = trimmed.slice(0, spaceIdx)
          const value = trimmed.slice(spaceIdx + 1)

          metaObj[key] = parseMetaValue(value)
        }
      }

      continue
    }

    if (block === 'tab') {
      if (trimmed !== '') tabRows.push(parseTabRow(trimmed))
      continue
    }

    // menu block open: ==Title
    if (trimmed.startsWith('==') && trimmed.length > 2) {
      flushText()
      menuTitle = trimmed.slice(2)
      block = 'menu'
      continue
    }

    // general block open: --id
    if (trimmed.startsWith('--') && trimmed.length > 2) {
      flushText()
      const id = trimmed.slice(2)

      if (id === 'meta') {
        block = 'meta'
      } else if (id === 'tab') {
        block = 'tab'
      } else {
        throw Error(`Unknown block type: "${id}"`)
      }

      continue
    }

    // inline commands
    if (trimmed.startsWith('__input ')) {
      flushText()
      args.push(input(trimmed.slice(8).trim()))
      continue
    }

    if (trimmed.startsWith('__end ')) {
      flushText()
      args.push(end(trimmed.slice(6).trim()))
      continue
    }

    // __inc should already be resolved before parsing
    if (trimmed.startsWith('__inc ')) {
      throw Error(
        `Unresolved include: "${trimmed}" - ` +
        `includes must be resolved before parsing`
      )
    }

    // plain text
    textLines.push(line)
  }

  if (block !== 'none') throw Error(`Unclosed ${block} block`)

  flushText()

  return screen(...args)
}
