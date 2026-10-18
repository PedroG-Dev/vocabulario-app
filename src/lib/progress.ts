import { addDays } from './leitner'
import type { Progress } from './types'

/** Cards answered in a day that count as a completed daily session */
export const DAILY_CARDS = 10
/** Time budget of one practice session */
export const SESSION_MS = 5 * 60_000

export const emptyProgress = (): Progress => ({ reviewed: {}, done: [] })

export function recordAnswer(p: Progress, today: string): Progress {
  return { ...p, reviewed: { ...p.reviewed, [today]: (p.reviewed[today] ?? 0) + 1 } }
}

export function markDone(p: Progress, today: string): Progress {
  return p.done.includes(today) ? p : { ...p, done: [...p.done, today] }
}

/** Consecutive done days ending today, or yesterday if today is still pending */
export function streakOf(p: Progress, today: string): number {
  const done = new Set(p.done)
  let day = done.has(today) ? today : addDays(today, -1)
  let n = 0
  while (done.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

/** 0..1 progress of today's goal, given how many words are still due */
export function dailyProgress(p: Progress, today: string, dueCount: number): number {
  if (p.done.includes(today)) return 1
  const reviewed = p.reviewed[today] ?? 0
  const target = Math.min(DAILY_CARDS, reviewed + dueCount)
  return target ? Math.min(reviewed / target, 1) : 0
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const reviewed = { ...a.reviewed }
  for (const [day, n] of Object.entries(b.reviewed)) reviewed[day] = Math.max(reviewed[day] ?? 0, n)
  return { reviewed, done: [...new Set([...a.done, ...b.done])].sort() }
}

/** Keeps the stored history small: drops per-day counts older than a year */
export function pruneProgress(p: Progress, today: string): Progress {
  const min = addDays(today, -400)
  return {
    reviewed: Object.fromEntries(Object.entries(p.reviewed).filter(([d]) => d >= min)),
    done: p.done.filter((d) => d >= min),
  }
}
