import { Session } from '../lib/types.js'
import { formatToken } from '../lib/token.js'
import { blank } from '../lib/output.js'
import { input, menu, screen } from '../lib/screen.js'

const br = blank()

const p = (line: string) => [line, ...br]

export const welcomeScreen = () => screen(
  p('Welcome'),
  p('You will receive a token to resume your session later.'),
  menu(
    'Commands',
    ['N', 'New Session', '/new'],
    ['R', 'Resume Session', '/resume'],
  )
)

export const newSessionScreen = (session: Session) => screen(
  p('New Session'),
  p('Your token is:'),
  p(formatToken(session.token)),
  p('Write this down. You will need it to resume your session.'),
  menu(
    'Commands',
    ['S', 'Start', '/main'],
    ['Q', 'Quit', '/quit'],
  )
)

export const resumePromptScreen = () => screen(
  p('Resume Session'),
  'Enter your token:',
  input('/resume/:token')
)

export const resumeFailScreen = () => screen(
  p('Token not found'),
  p('Check your token and try again.'),
  menu(
    'Commands',
    ['R', 'Resume Session', '/resume'],
    ['N', 'New Session', '/new'],
  )
)

export const namePromptScreen = () => screen(
  p('Set Name'),
  'Enter your name:',
  input('/name/:name')
)

const mainMenu = menu(
  'Commands',
  ['N', 'Set Name', '/setname'],
  ['H', 'Help', '/help'],
  ['S', 'Save', '/save'],
  ['Q', 'Quit', '/quit'],
)

export const mainScreen = (session: Session) => screen(
  p(`Hello ${session.name || 'User'}`),
  mainMenu
)

export const helpScreen = () => screen(
  p('Help'),
  '',
  p('Type a command letter and press Enter.'),
  p('N - Set or change your display name.'),
  p('H - Show this help screen.'),
  p('S - Save your session to disk so you can resume it later.'),
  p('Q - Quit and disconnect.'),
  '',
  p('Your session token was given when you started. You can use it to resume where you left off.'),
  mainMenu
)

export const savedScreen = () => screen(
  p('Session saved.'),
  mainMenu
)

export const quitScreen = () => screen(
  'Goodbye.'
)
