import { parsePvzEvent } from './sims/pvz/pvz-serialize.js'
import { replayPvzLog } from './sims/pvz/pvz-replay.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

let isGenerateReplay = true

const SESSION_ID = '52KS7JZFEU9WHAP3'

const generateReplay = async (sessionId = SESSION_ID) => {
  const logPath = `data/test-app/pvz/logs/${sessionId}/pvz.log`

  const raw = await readFile(logPath, 'utf8')

  const events = raw.trim().split('\n').map(line => {
    const i = line.indexOf(' ')
    return parsePvzEvent(line.slice(i + 1))
  })

  const lines = replayPvzLog(events)

  await mkdir('_temp', { recursive: true })

  const outPath = `_temp/pvz-sim-${sessionId}.log`

  await writeFile(outPath, lines.join('\n') + '\n')

  console.log(`wrote ${lines.length} lines to ${outPath}`)
}

const start = async () => {
  if( isGenerateReplay ){
    await generateReplay()
  }
}

start().catch(console.error)
