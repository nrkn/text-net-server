
export type MenuItem = [short: string, long: string, path: string]

export type Menu = {
  title: string
  items: MenuItem[]
}

export type TextScreen = {
  lines: string[]
  response: ScreenResponse
}

export type InputPath = {
  inputPath: string
}

export type MenuResponse = ['MENU', Menu]
export type InputResponse = ['INPUT', inputPath: string]
export type EndResponse = ['END', message: string]

export type ScreenResponse = MenuResponse | InputResponse | EndResponse
