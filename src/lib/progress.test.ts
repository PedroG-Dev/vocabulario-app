import { describe, expect, it } from 'vitest'
import { dailyProgress, DAILY_CARDS, emptyProgress, markDone, mergeProgress, recordAnswer, streakOf } from './progress'

const T = '2026-10-10'

describe('progress', () => {
  it('streak counts consecutive days ending today', () => {
    let p = emptyProgress()
    for (const d of ['2026-10-08', '2026-10-09', '2026-10-10']) p = markDone(p, d)
    expect(streakOf(p, T)).toBe(3)
  })

  it('streak stays alive through yesterday while today is pending', () => {
    let p = emptyProgress()
    for (const d of ['2026-10-08', '2026-10-09']) p = markDone(p, d)
    expect(streakOf(p, T)).toBe(2)
  })

  it('streak resets after a missed day', () => {
    const p = markDone(emptyProgress(), '2026-10-07')
    expect(streakOf(p, T)).toBe(0)
  })

  it('daily progress follows answered cards and caps the target by due words', () => {
    let p = emptyProgress()
    p = recordAnswer(recordAnswer(p, T), T)
    expect(dailyProgress(p, T, 2)).toBe(0.5)
    expect(dailyProgress(p, T, 100)).toBe(2 / DAILY_CARDS)
    expect(dailyProgress(markDone(p, T), T, 5)).toBe(1)
  })

  it('merge keeps the larger count and the union of days', () => {
    const a = markDone(recordAnswer(emptyProgress(), T), '2026-10-09')
    const b = markDone({ reviewed: { [T]: 4 }, done: [] }, T)
    const m = mergeProgress(a, b)
    expect(m.reviewed[T]).toBe(4)
    expect(m.done).toEqual(['2026-10-09', T])
  })
})
