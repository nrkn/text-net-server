import { Session } from '../lib/types.js'
import { formatToken } from '../lib/token.js'
import { screen } from '../lib/view/screen.js'
import { input } from '../lib/view/input-path.js'
import { menu } from '../lib/view/menu.js'
import { p } from '../lib/view/util.js'
import { end } from '../lib/view/end.js'
import { tab } from '../lib/view/table.js'

export const welcomeScreen = () => screen(
  p('Welcome'),
  menu(
    'Commands',
    ['N', 'New Session', '/new'],
    ['R', 'Resume Session', '/resume'],
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

export const tokenScreen = (session: Session) => screen(
  p('Your Token'),
  p(formatToken(session.token)),
  p('Use this token to resume your session.'),
  menu(
    'Commands',
    ['M', 'Main Menu', '/main'],
  )
)

const mainMenu = menu(
  'Commands',
  ['N', 'Set Name', '/setname'],
  ['T', 'Show Token', '/token'],
  ['H', 'Help', '/help'],
  ['Q', 'Quit', '/quit'],
)

export const mainScreen = (session: Session) => screen(
  p(`Hello ${session.name || 'User'}`),
  mainMenu
)

export const helpScreen = () => screen(
  p('Help'),
  p('Type a command letter and press Enter.'),
  tab(
    ['N - ', 'Set or change your display name.'],
    ['T - ', 'Show your session token for resuming later.'],
    ['H - ', 'Show this help screen.'],
    ['Q - ', 'Quit and disconnect.'],
  ),
  p('Your session is saved automatically.'),
  mainMenu
)

export const quitScreen = () => screen(
  end('Goodbye.')
)
