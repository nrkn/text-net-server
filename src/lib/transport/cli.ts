import { createInterface } from 'node:readline'
import { CreateHandler } from './types.js'

export const startCli = (createHandler: CreateHandler) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  const handleLine = createHandler(process.stdout, () => {
    rl.close()
    process.exit(0)
  })

  rl.on('line', handleLine)

  return rl
}
