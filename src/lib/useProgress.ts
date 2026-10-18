import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyProgress, markDone, mergeProgress, pruneProgress, recordAnswer, DAILY_CARDS } from './progress'
import { loadProgress, saveProgress } from './storage'
import type { Progress } from './types'

export function useProgress(today: string) {
  const [progress, setProgress] = useState<Progress>(emptyProgress)
  const loaded = useRef(false)

  useEffect(() => {
    loadProgress().then((p) => {
      setProgress((cur) => mergeProgress(pruneProgress(p, today), cur))
      loaded.current = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loaded.current) saveProgress(progress)
  }, [progress])

  const answered = useCallback(() => {
    setProgress((p) => {
      const next = recordAnswer(p, today)
      return next.reviewed[today] >= DAILY_CARDS ? markDone(next, today) : next
    })
  }, [today])

  const complete = useCallback(() => setProgress((p) => markDone(p, today)), [today])

  const importProgress = useCallback((incoming: Progress) => setProgress((p) => mergeProgress(p, incoming)), [])

  return { progress, answered, complete, importProgress }
}
