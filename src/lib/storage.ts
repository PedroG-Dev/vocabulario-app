import { get, set } from 'idb-keyval'
import type { Word } from './types'

const KEY = 'vocabuleo:words:v1'

export async function loadWords(): Promise<Word[]> {
  return (await get<Word[]>(KEY)) ?? []
}

export async function saveWords(words: Word[]): Promise<void> {
  await set(KEY, words)
}

export function exportJSON(words: Word[]): void {
  const blob = new Blob([JSON.stringify({ app: 'vocabuleo', version: 1, words }, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `vocabuleo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function parseImport(file: File): Promise<Word[]> {
  const data = JSON.parse(await file.text())
  const words: unknown = Array.isArray(data) ? data : data?.words
  if (!Array.isArray(words)) throw new Error('El archivo no contiene palabras')
  return words.filter(
    (w): w is Word =>
      w && typeof w.id === 'string' && typeof w.term === 'string' && typeof w.translation === 'string' &&
      [1, 2, 3, 4, 5].includes(w.box) && typeof w.due === 'string',
  )
}
