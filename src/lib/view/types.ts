
export type MenuItem = [short: string, long: string, path: string]

export type Menu = {
  title: string
  items: MenuItem[]
}

export type MenuResponse = { type: 'menu', menu: Menu }
export type InputResponse = { type: 'input', path: string, formAction?: string }
export type EndResponse = { type: 'end', message: string }

export type ScreenResponse = MenuResponse | InputResponse | EndResponse

export type ParagraphPart = { type: 'paragraph', lines: string[] }
export type HeadingPart = { type: 'heading', level: 1 | 2 | 3 | 4, text: string }
export type TablePart = { type: 'table', rows: string[][] }
export type MenuPart = { type: 'menu', menu: Menu }
export type MetaPart = { type: 'meta', meta: Record<string, unknown> }

export type ScreenPart = ParagraphPart | HeadingPart | TablePart | MenuPart | MetaPart

export type TextScreen = {
  parts: ScreenPart[]
  response: ScreenResponse
}

export type ScreenArg = (
  string | ParagraphPart | HeadingPart | TablePart | Menu | InputResponse |
  EndResponse | MetaPart
)
