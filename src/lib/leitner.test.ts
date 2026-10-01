import { describe, expect, it } from 'vitest'
import { addDays, createWord, dueWords, review } from './leitner'

const T = '2026-10-01'

describe('leitner', () => {
  it('las palabras nuevas entran en la órbita I y tocan hoy', () => {
    const w = createWord({ term: ' gist ', translation: 'esencia' }, T)
    expect(w.box).toBe(1)
    expect(w.term).toBe('gist')
    expect(dueWords([w], T)).toHaveLength(1)
  })

  it('acertar sube una órbita y espacia el repaso', () => {
    let w = createWord({ term: 'gist', translation: 'esencia' }, T)
    w = review(w, true, T)
    expect(w.box).toBe(2)
    expect(w.due).toBe('2026-10-03')
    w = review(review(review(w, true, T), true, T), true, T)
    expect(w.box).toBe(5)
    expect(review(w, true, T).box).toBe(5)
  })

  it('fallar devuelve a la órbita I para mañana', () => {
    let w = createWord({ term: 'gist', translation: 'esencia' }, T)
    w = review(review(w, true, T), true, T)
    w = review(w, false, T)
    expect(w.box).toBe(1)
    expect(w.due).toBe('2026-10-02')
    expect(w.lapses).toBe(1)
  })

  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-30', 4)).toBe('2027-01-03')
  })
})
