import { PvzLogLevel } from './pvz-const.js'

// ordered - first match wins, so specific patterns before general
// unmatched events default to 'verbose'
const eventLevels: { match: string, level: PvzLogLevel }[] = [
  // minimal - significant game events
  { match: 'won', level: 'minimal' },
  { match: 'died', level: 'minimal' },
  { match: 'reachedHouse', level: 'minimal' },
  { match: 'triggeredBy', level: 'minimal' },
  { match: 'waveStarted', level: 'minimal' },

  // detailed - tactical events
  { match: 'sunDropped', level: 'detailed' },
  { match: 'spawnedSun', level: 'detailed' },
  { match: 'zombieSpawned', level: 'detailed' },
  { match: 'waveAccelerated', level: 'detailed' },
  { match: 'exploded selfDestruct', level: 'detailed' },
  { match: 'exploded', level: 'detailed' },
  { match: 'attacking', level: 'detailed' },
  { match: 'exitStageRight', level: 'detailed' },

  // verbose - per-tick noise (fired, hit, biting)
  { match: 'fired', level: 'verbose' },
  { match: 'hit', level: 'verbose' },
  { match: 'biting', level: 'verbose' },
]

const levelRank: Record<PvzLogLevel, number> = {
  none: 0,
  minimal: 1,
  detailed: 2,
  verbose: 3
}

const eventLevel = (event: string): PvzLogLevel => {
  for (const { match, level } of eventLevels) {
    if (event.includes(match)) return level
  }

  return 'verbose'
}

export const filterTickEvents = (
  events: string[], level: PvzLogLevel
): string[] => {
  if (level === 'verbose') return events
  if (level === 'none') return []

  const threshold = levelRank[level]

  return events.filter(e => levelRank[eventLevel(e)] <= threshold)
}
