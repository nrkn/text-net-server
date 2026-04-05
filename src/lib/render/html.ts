import { menuToLines } from './text.js'
import { TextScreen } from '../view/types.js'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const renderHtml = (screen: TextScreen, tokenPrefix = ''): string => {
  const html: string[] = [
    '<html>',
    '<head><title>TELNET</title></head>',
    '<body>',
    '<pre>',
  ]

  for (const part of screen.parts) {
    if (part.type === 'paragraph') {
      for (const line of part.lines) {
        html.push(escapeHtml(line))
      }

      html.push('')
    } else if (part.type === 'table') {
      for (const row of part.rows) {
        html.push(row.map(cell => escapeHtml(cell)).join(' | '))
      }

      html.push('')
    } else if (part.type === 'meta') {
      continue
    } else if (part.type === 'menu') {
      const { menu } = part

      html.push(
        ...menuToLines(
          menu,
          escapeHtml,
          escapeHtml,
          (long, short, path) =>
            `<a href="${escapeHtml(tokenPrefix + path)}" ` +
            `accesskey="${escapeHtml(short.toLowerCase())}"` +
            `>${escapeHtml(long)}</a>`
        )
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
