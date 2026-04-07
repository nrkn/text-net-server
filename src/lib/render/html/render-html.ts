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

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '')

const wrap = (text: string) => wrapText(text, MAX_COLS_HTML)

const wrapHtml = (html: string): string[] => {
  const visual = stripTags(html)

  if (visual.length <= MAX_COLS_HTML) return [html]

  const visualLines = wrapText(visual, MAX_COLS_HTML)
  const result: string[] = []

  let htmlPos = 0

  for (const vLine of visualLines) {
    let lineHtml = ''
    let visualConsumed = 0

    while (visualConsumed < vLine.length && htmlPos < html.length) {
      if (html[htmlPos] === '<') {
        const closeIdx = html.indexOf('>', htmlPos)
        lineHtml += html.slice(htmlPos, closeIdx + 1)
        htmlPos = closeIdx + 1
      } else {
        lineHtml += html[htmlPos]
        htmlPos++
        visualConsumed++
      }
    }

    // consume any trailing tags at the break point (eg closing </a>)
    while (htmlPos < html.length && html[htmlPos] === '<') {
      const closeIdx = html.indexOf('>', htmlPos)
      lineHtml += html.slice(htmlPos, closeIdx + 1)
      htmlPos = closeIdx + 1
    }

    // skip spaces between visual lines in the source
    while (htmlPos < html.length && html[htmlPos] === ' ') {
      htmlPos++
    }

    result.push(lineHtml)
  }

  return result
}

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
        ...menuLines.flatMap(wrapHtml)
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
