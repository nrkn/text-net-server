import { TextScreen } from '../../view/types.js'
import { sanitizeOutput, wrapText } from './text-util.js'
import { menuToLines, sanitizeMenu } from './render-menu.js'
import { tableToLines } from './render-table.js'

// flatten structured screen parts to plain lines
export const renderText = (screen: TextScreen): string[] => {
  const lines: string[] = []

  for (const part of screen.parts) {
    if (part.type === 'paragraph') {
      for (const line of part.lines) {
        lines.push(...wrapText(sanitizeOutput(line)))
      }

      lines.push('')
    } else if (part.type === 'table') {
      lines.push(...tableToLines(part.rows))
    } else if (part.type === 'meta') {
      continue
    } else if (part.type === 'menu') {
      lines.push(
        ...menuToLines(sanitizeMenu(part.menu)).flatMap(l => wrapText(l))
      )
    } else {
      throw Error(`Unknown screen part type: ${(part as any).type}`)
    }
  }

  return lines
}
