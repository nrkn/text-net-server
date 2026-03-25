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

