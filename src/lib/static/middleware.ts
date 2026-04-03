import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename, relative } from 'node:path'
import { Maybe, Session } from '../types.js'
import { TextScreen } from '../view/types.js'
import { RtrApp } from '../routing/types.js'
import { resolveIncludes } from './includes.js'
import { resolveTemplates } from './templates.js'
import { parseStaticTextScreen } from './parser.js'

const readStaticFile = (dir: string) => (name: string): string =>
  readFileSync(join(dir, `${name}.txt`), 'utf-8')

export const loadStaticScreen = (
  name: string, dir: string, session: Maybe<Session>
): TextScreen => {
  const raw = readFileSync(join(dir, `${name}.txt`), 'utf-8')
  const withIncludes = resolveIncludes(raw, readStaticFile(dir))
  const withTemplates = resolveTemplates(withIncludes, session)

  return parseStaticTextScreen(withTemplates)
}

const collectFiles = (dir: string, base = dir): string[] => {
  const entries = readdirSync(dir)
  const files: string[] = []

  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)

    if (stat.isDirectory()) {
      files.push(...collectFiles(full, base))
    } else if (entry.endsWith('.txt') && !basename(entry).startsWith('_')) {
      files.push(relative(base, full))
    }
  }

  return files
}

export const useStaticRoutes = (
  app: RtrApp<TextScreen>,
  dir: string,
  getSession: () => Maybe<Session>
) => {
  const files = collectFiles(dir)

  for (const file of files) {
    // welcome.txt -> /welcome, cool-game/start.txt -> /cool-game/start
    const route = '/' + file.replace(/\\/g, '/').replace(/\.txt$/, '')
    const name = file.replace(/\.txt$/, '').replace(/\\/g, '/')

    app.on(route, (_req, res) => {
      res.send(loadStaticScreen(name, dir, getSession()))
    })
  }
}
