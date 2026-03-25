import { TextScreen } from './view/types.js'

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
  ]

  for (const part of screen.parts) {
    if (part.type === 'text') {
      html.push('<pre>')

      for (const line of part.lines) {
        html.push(escapeHtml(line))
      }

      html.push('</pre>')
    } else {
      const { menu } = part

      html.push(`<pre>${escapeHtml(menu.title)}</pre>`)
      html.push('<ul>')

      for (const [short, long, path] of menu.items) {
        const href = escapeHtml(tokenPrefix + path)

        html.push(
          `<li><a href="${href}" accesskey="${escapeHtml(short.toLowerCase())}"` +
          `>${escapeHtml(short)} ${escapeHtml(long)}</a></li>`
        )
      }

      html.push('</ul>')
    }
  }

  if (screen.response.type === 'input') {
    const basePath = screen.response.path.replace(/\/:(\w+)$/, '')
    const action = escapeHtml(tokenPrefix + basePath)

    html.push(
      `<form method="POST" action="${action}">` +
      '<input type="text" name="input"> ' +
      '<input type="submit" value="GO">' +
      '</form>'
    )
  }

  html.push('</body>', '</html>')

  return html.join('\n')
}
