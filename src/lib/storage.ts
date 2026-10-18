import { get, set } from 'idb-keyval'
import { emptyProgress } from './progress'
import type { Progress, Word } from './types'

const KEY = 'vocabuleo:words:v1'
const PROGRESS_KEY = 'vocabuleo:progress:v1'

export async function loadWords(): Promise<Word[]> {
  return (await get<Word[]>(KEY)) ?? []
}

export async function saveWords(words: Word[]): Promise<void> {
  await set(KEY, words)
}

export async function loadProgress(): Promise<Progress> {
  return { ...emptyProgress(), ...(await get<Partial<Progress>>(PROGRESS_KEY)) }
}

export async function saveProgress(progress: Progress): Promise<void> {
  await set(PROGRESS_KEY, progress)
}

export function exportJSON(words: Word[], progress: Progress): void {
  const blob = new Blob([JSON.stringify({ app: 'vocabuleo', version: 2, words, progress }, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `vocabuleo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export interface ImportResult {
  words: Word[]
  progress?: Progress
}

export async function parseImport(file: File): Promise<ImportResult> {
  const data = JSON.parse(await file.text())
  const words: unknown = Array.isArray(data) ? data : data?.words
  if (!Array.isArray(words)) throw new Error('El archivo no contiene palabras')
  const raw = data?.progress
  const progress: Progress | undefined =
    raw && typeof raw.reviewed === 'object' && Array.isArray(raw.done)
      ? { reviewed: raw.reviewed, done: raw.done.filter((d: unknown) => typeof d === 'string') }
      : undefined
  return {
    progress,
    words: words.filter(
      (w): w is Word =>
        w && typeof w.id === 'string' && typeof w.term === 'string' && typeof w.translation === 'string' &&
        [1, 2, 3, 4, 5].includes(w.box) && typeof w.due === 'string',
    ),
  }
}
