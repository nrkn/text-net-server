
export type MenuItem = [short: string, long: string, path: string]

export type Menu = {
  title: string
  items: MenuItem[]
}

export type MenuResponse = { type: 'menu', menu: Menu }
export type InputResponse = { type: 'input', path: string }
export type EndResponse = { type: 'end', message: string }

export type ScreenResponse = MenuResponse | InputResponse | EndResponse

export type TextPart = { type: 'text', lines: string[] }
export type MenuPart = { type: 'menu', menu: Menu }

export type ScreenPart = TextPart | MenuPart

export type TextScreen = {
  parts: ScreenPart[]
  response: ScreenResponse
}

export type ScreenArg = string | string[] | Menu | InputResponse | EndResponse
