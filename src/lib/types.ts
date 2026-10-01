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
