
export type MenuItem = [short: string, long: string, path: string]

export type Menu = {
  title: string
  items: MenuItem[]
}

export type MenuResponse = { type: 'menu', menu: Menu }
export type InputResponse = { type: 'input', path: string, formAction?: string }
export type EndResponse = { type: 'end', message: string }

export type ScreenResponse = MenuResponse | InputResponse | EndResponse

export type TextPart = { type: 'text', lines: string[] }
export type MenuPart = { type: 'menu', menu: Menu }
export type MetaPart = { type: 'meta', meta: Record<string, unknown> }

export type ScreenPart = TextPart | MenuPart | MetaPart

export type TextScreen = {
  parts: ScreenPart[]
  response: ScreenResponse
}

export type ScreenArg = (
  string | string[] | Menu | InputResponse | EndResponse | MetaPart
)
