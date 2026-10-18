import type { Box, Word, WordInput } from './types'

export const BOXES: readonly Box[] = [1, 2, 3, 4, 5]

/** Días hasta el siguiente repaso según la órbita (caja) en la que queda la palabra */
export const INTERVAL_DAYS: Record<Box, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }

export const ROMAN: Record<Box, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' }

export const ORBIT_NAME: Record<Box, string> = {
  1: 'Nuevas',
  2: 'Aprendiendo',
  3: 'En progreso',
  4: 'Consolidadas',
  5: 'Dominadas',
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return todayISO(new Date(y, m - 1, d + days))
}

export function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split('-').map(Number)
  const [y2, m2, d2] = toISO.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export function isDue(word: Word, today: string): boolean {
  return word.due <= today
}

export function dueWords(words: Word[], today: string): Word[] {
  return words.filter((w) => isDue(w, today)).sort((a, b) => a.box - b.box || a.due.localeCompare(b.due))
}

/** Acierto: sube una órbita. Fallo: vuelve a la órbita exterior. */
export function review(word: Word, knew: boolean, today: string): Word {
  const box = (knew ? Math.min(word.box + 1, 5) : 1) as Box
  return {
    ...word,
    box,
    due: addDays(today, INTERVAL_DAYS[box]),
    reviews: word.reviews + 1,
    lapses: word.lapses + (knew ? 0 : 1),
  }
}

export function createWord(input: WordInput, today: string): Word {
  return {
    id: newId(),
    term: input.term.trim(),
    translation: input.translation.trim(),
    context: input.context?.trim() || undefined,
    box: 1,
    due: today,
    createdAt: new Date().toISOString(),
    reviews: 0,
    lapses: 0,
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function describeNext(due: string, today: string): string {
  const n = daysBetween(today, due)
  if (n <= 0) return 'hoy'
  if (n === 1) return 'mañana'
  return `en ${n} días`
}
