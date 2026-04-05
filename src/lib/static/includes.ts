const MAX_INCLUDE_DEPTH = 10

export const resolveIncludes = (
  text: string, readFile: (name: string) => string
): string => {
  const stack: string[] = []

  const resolve = (content: string, depth: number): string => {
    if (depth > MAX_INCLUDE_DEPTH)
      throw Error(`Include depth exceeded ${MAX_INCLUDE_DEPTH}`)

    const lines = content.split('\n')
    const result: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('__inc ')) {
        const name = trimmed.slice(6).trim()

        if (!name) throw Error('Empty __inc directive')

        if (stack.includes(name)) throw Error(
          `Include cycle detected: ${[...stack, name].join(' -> ')}`
        )

        stack.push(name)

        const included = readFile(name)

        result.push(resolve(included, depth + 1))

        stack.pop()
      } else {
        result.push(line)
      }
    }

    return result.join('\n')
  }

  return resolve(text, 0)
}
