export type Box = 1 | 2 | 3 | 4 | 5

export interface Word {
  id: string
  term: string
  translation: string
  context?: string
  box: Box
  /** Fecha local YYYY-MM-DD a partir de la cual toca repasarla */
  due: string
  createdAt: string
  reviews: number
  lapses: number
}

export interface WordInput {
  term: string
  translation: string
  context?: string
}

export interface Progress {
  /** Cards answered per local day (YYYY-MM-DD) */
  reviewed: Record<string, number>
  /** Days on which the daily goal was met */
  done: string[]
}
