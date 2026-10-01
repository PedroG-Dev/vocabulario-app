import { useCallback, useEffect, useRef, useState } from 'react'
import { createWord } from './leitner'
import { loadWords, saveWords } from './storage'
import type { Word, WordInput } from './types'

export function useWords(today: string) {
  const [words, setWords] = useState<Word[]>([])
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    loadWords().then((w) => {
      setWords(w)
      loaded.current = true
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (loaded.current) saveWords(words)
  }, [words])

  const add = useCallback(
    (input: WordInput) => {
      const word = createWord(input, today)
      setWords((ws) => [...ws, word])
      return word
    },
    [today],
  )

  const update = useCallback((word: Word) => {
    setWords((ws) => ws.map((w) => (w.id === word.id ? word : w)))
  }, [])

  const remove = useCallback((id: string) => {
    setWords((ws) => ws.filter((w) => w.id !== id))
  }, [])

  /** Fusiona por id: lo importado sustituye a lo existente */
  const importWords = useCallback((incoming: Word[]) => {
    setWords((ws) => {
      const map = new Map(ws.map((w) => [w.id, w]))
      incoming.forEach((w) => map.set(w.id, w))
      return [...map.values()]
    })
  }, [])

  return { words, ready, add, update, remove, importWords }
}
