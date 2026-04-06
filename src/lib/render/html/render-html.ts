import { MAX_COLS_HTML } from '../../const.js'
import { TextScreen } from '../../view/types.js'
import { menuToLines } from '../text/render-menu.js'
import { tableToLines } from '../text/render-table.js'
import { wrapText } from '../text/text-util.js'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const wrap = (text: string) => wrapText(text, MAX_COLS_HTML)

export const renderHtml = (screen: TextScreen, tokenPrefix = ''): string => {
  const html: string[] = [
    '<!doctype html>',
    '<html>',
    '<head><title>TELNET</title></head>',
    '<body>',
    '<pre>',
  ]

  for (const part of screen.parts) {
    if (part.type === 'paragraph') {
      for (const line of part.lines) {
        html.push(...wrap(escapeHtml(line)))
      }

      html.push('')
    } else if (part.type === 'table') {
      const tableLines = tableToLines(part.rows, MAX_COLS_HTML, escapeHtml)

      html.push(...tableLines)
    } else if (part.type === 'meta') {
      continue
    } else if (part.type === 'menu') {
      const { menu } = part

      const menuLines = menuToLines(
        menu,
        escapeHtml,
        escapeHtml,
        (long, short, path) =>
          `<a href="${escapeHtml(tokenPrefix + path)}" ` +
          `accesskey="${escapeHtml(short.toLowerCase())}"` +
          `>${escapeHtml(long)}</a>`
      )

      html.push(
        ...menuLines.flatMap(wrap)
      )
    } else {
      throw Error(`Unknown screen part type: ${(part as any).type}`)
    }
  }

  html.push('</pre>')

  if (screen.response.type === 'input') {
    const action = escapeHtml(tokenPrefix + (screen.response.formAction ?? ''))
    const inputPath = escapeHtml(screen.response.path)

    html.push(
      `<form method="POST" action="${action}">` +
      `<input type="hidden" name="_inputPath" value="${inputPath}">` +
      '<input type="text" name="input"> ' +
      '<input type="submit" value="GO">' +
      '</form>'
    )
  }

  html.push('</body>', '</html>')

  return html.join('\n')
}
