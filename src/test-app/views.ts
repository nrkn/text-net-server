import { Session } from '../lib/types.js'
import { formatToken } from '../lib/token.js'
import { blank, createMenu } from '../lib/output.js'
import { createScreen } from '../lib/screen.js'

const br = blank()

export const welcomeMenu = createMenu(
  'COMMANDS',
  ['N', 'NEW SESSION', '/new'],
  ['R', 'RESUME SESSION', '/resume'],
)

export const welcomeScreen = () => createScreen(
  'WELCOME',
  br,
  'YOU WILL RECEIVE A TOKEN TO RESUME YOUR SESSION LATER',
  br,
  welcomeMenu
)

export const newSessionMenu = createMenu(
  'COMMANDS',
  ['S', 'START', '/main'],
  ['Q', 'QUIT', '/quit'],
)

export const newSessionScreen = (session: Session) => createScreen(
  'NEW SESSION',
  br,
  'YOUR TOKEN IS',
  br,
  formatToken(session.token),
  br,
  'WRITE THIS DOWN. YOU WILL NEED IT TO RESUME YOUR SESSION.',
  br,
  newSessionMenu
)

export const resumePromptScreen = () => {
  const screen = createScreen(
    'RESUME SESSION',
    br,
    'ENTER YOUR TOKEN'
  )

  screen.inputPath = '/resume/:token'

  return screen
}

export const resumeFailMenu = createMenu(
  'COMMANDS',
  ['R', 'RESUME SESSION', '/resume'],
  ['N', 'NEW SESSION', '/new'],
)

export const resumeFailScreen = () => createScreen(
  'TOKEN NOT FOUND',
  br,
  'CHECK YOUR TOKEN AND TRY AGAIN',
  br,
  resumeFailMenu
)

export const mainMenu = createMenu(
  'COMMANDS',
  ['H', 'HELP', '/help'],
  ['V', 'SAVE', '/save'],
  ['Q', 'QUIT', '/quit'],
)

export const mainScreen = (session: Session) => createScreen(
  `HELLO ${session.name ? session.name.toUpperCase() : 'USER'}`,
  br,
  mainMenu
)

export const helpScreen = () => createScreen(
  'HELP',
  br,
  mainMenu
)

export const savedScreen = () => createScreen(
  'SESSION SAVED',
  br,
  mainMenu
)

export const quitScreen = () => createScreen(
  'GOODBYE'
)
