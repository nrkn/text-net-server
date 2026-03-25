export type Maybe<T> = T | null | undefined

export type Session = {
  token: string
  name: string
  created: number
  data: Record<string, unknown>
  dirty: boolean
}

export type Command = {
  name: string
  args: string[]
}

export type MenuItem = [short: string, long: string, path: string]

export type Menu = {
  title: string
  items: MenuItem[]
}

export type TextScreen = {
  lines: string[]
  menu?: Menu
  inputPath?: string
}

export type InputPath = {
  inputPath: string
}