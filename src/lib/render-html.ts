import { TextScreen } from './types.js'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const renderHtml = (screen: TextScreen, tokenPrefix = ''): string => {
  const parts: string[] = [
    '<html>',
    '<head><title>TELNET</title></head>',
    '<body>',
    '<pre>',
  ]

  for (const line of screen.lines) {
    parts.push(escapeHtml(line))
  }

  parts.push('</pre>')

  if (screen.menu) {
    for (const [short, long, path] of screen.menu.items) {
      const action = escapeHtml(tokenPrefix + path)

      parts.push(
        `<form method="POST" action="${action}">` +
        `<input type="submit" value="${escapeHtml(short)} ${escapeHtml(long)}">` +
        '</form>'
      )
    }
  }

  if (screen.inputPath) {
    const basePath = screen.inputPath.replace(/\/:(\w+)$/, '')
    const action = escapeHtml(tokenPrefix + basePath)

    parts.push(
      `<form method="POST" action="${action}">` +
      '<input type="text" name="input"> ' +
      '<input type="submit" value="GO">' +
      '</form>'
    )
  }

  parts.push('</body>', '</html>')

  return parts.join('\n')
}
