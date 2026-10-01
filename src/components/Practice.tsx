import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { describeNext, review, ROMAN } from '../lib/leitner'
import type { Box, Word } from '../lib/types'
import { HoldToReveal } from './HoldToReveal'

interface Result {
  word: Word
  from: Box
  to: Box
  knew: boolean
}

interface Props {
  queue: Word[]
  today: string
  onAnswer: (updated: Word) => void
  onClose: () => void
}

const SWIPE = 110

export function Practice({ queue, today, onAnswer, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hint, setHint] = useState(false)
  const [spaceHolding, setSpaceHolding] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [exitDir, setExitDir] = useState(0)
  const [flash, setFlash] = useState<Result | null>(null)

  const word = queue[index] as Word | undefined
  const finished = index >= queue.length

  const reveal = useCallback(() => setRevealed(true), [])

  const answer = useCallback(
    (knew: boolean) => {
      if (!word || !revealed || flash) return
      const updated = review(word, knew, today)
      const result: Result = { word: updated, from: word.box, to: updated.box, knew }
      onAnswer(updated)
      setResults((r) => [...r, result])
      setExitDir(knew ? 1 : -1)
      setFlash(result)
      navigator.vibrate?.(knew ? 8 : [6, 40, 6])
      setTimeout(() => {
        setFlash(null)
        setRevealed(false)
        setHint(false)
        setIndex((i) => i + 1)
      }, 650)
    },
    [word, revealed, flash, today, onAnswer],
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (finished) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat && !revealed) setSpaceHolding(true)
      } else if (e.key === 'ArrowRight') answer(true)
      else if (e.key === 'ArrowLeft') answer(false)
      else if (e.key.toLowerCase() === 'p' && !revealed) setHint(true)
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceHolding(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [answer, finished, revealed, onClose])

  useEffect(() => {
    if (revealed) setSpaceHolding(false)
  }, [revealed])

  return (
    <motion.div
      className="practice"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="practice-top">
        <span className="mono">
          {finished ? 'SESIÓN COMPLETA' : `${String(index + 1).padStart(2, '0')} / ${String(queue.length).padStart(2, '0')}`}
        </span>
        <div className="practice-progress" aria-hidden>
          <span style={{ width: `${(Math.min(index, queue.length) / queue.length) * 100}%` }} />
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Salir de la práctica">
          ✕
        </button>
      </header>

      {finished ? (
        <Summary results={results} today={today} onClose={onClose} />
      ) : (
        <div className="practice-stage">
          <AnimatePresence mode="popLayout" custom={exitDir}>
            {word && (
              <Card
                key={word.id}
                word={word}
                revealed={revealed}
                hint={hint}
                exitDir={exitDir}
                onSwipe={answer}
              />
            )}
          </AnimatePresence>

          <div className="practice-controls">
            {!revealed ? (
              <div className="pre-reveal">
                <HoldToReveal onReveal={reveal} externalHolding={spaceHolding} />
                {word?.context && !hint && (
                  <button className="ghost-btn" onClick={() => setHint(true)}>
                    Ver pista <kbd>P</kbd>
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                className="verdict"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <button className="verdict-btn verdict-btn--no" onClick={() => answer(false)}>
                  <span className="verdict-arrow">←</span>
                  <span>
                    No la sabía
                    <small>vuelve a la órbita I</small>
                  </span>
                </button>
                <button className="verdict-btn verdict-btn--yes" onClick={() => answer(true)}>
                  <span>
                    La sabía
                    <small>{word && word.box < 5 ? `sube a la órbita ${ROMAN[(word.box + 1) as Box]}` : 'se queda en la V'}</small>
                  </span>
                  <span className="verdict-arrow">→</span>
                </button>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {flash && (
              <motion.div
                className={`flash ${flash.knew ? 'flash--yes' : 'flash--no'}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                {flash.knew ? '↗' : '↺'} Órbita {ROMAN[flash.to]} · vuelve {describeNext(flash.word.due, today)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

function Card({
  word,
  revealed,
  hint,
  exitDir,
  onSwipe,
}: {
  word: Word
  revealed: boolean
  hint: boolean
  exitDir: number
  onSwipe: (knew: boolean) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-8, 8])
  const yesOpacity = useTransform(x, [20, SWIPE], [0, 1])
  const noOpacity = useTransform(x, [-SWIPE, -20], [1, 0])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE) onSwipe(true)
    else if (info.offset.x < -SWIPE) onSwipe(false)
  }

  return (
    <motion.article
      className="card"
      style={{ x, rotate, ['--c' as string]: `var(--box-${word.box})` }}
      drag={revealed ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, scale: 0.6, y: 40, filter: 'blur(12px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: exitDir * 520, scale: 0.8, transition: { duration: 0.45 } }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <motion.span className="swipe-tag swipe-tag--yes" style={{ opacity: yesOpacity }}>
        LA SABÍA
      </motion.span>
      <motion.span className="swipe-tag swipe-tag--no" style={{ opacity: noOpacity }}>
        NO LA SABÍA
      </motion.span>

      <div className="card-orbit mono">
        <span className="card-dot" />
        ÓRBITA {ROMAN[word.box]}
      </div>

      <h2 className="card-term">{word.term}</h2>

      <AnimatePresence>
        {hint && word.context && (
          <motion.p
            className="card-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            “{highlight(word.context, word.term)}”
          </motion.p>
        )}
      </AnimatePresence>

      <div className={`card-answer ${revealed ? 'card-answer--on' : ''}`} aria-hidden={!revealed}>
        {revealed && (
          <p className="card-translation">
            {[...word.translation].map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: 'blur(10px)', y: 6 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.4 }}
              >
                {ch}
              </motion.span>
            ))}
          </p>
        )}
        {revealed && word.context && !hint && <p className="card-context">“{highlight(word.context, word.term)}”</p>}
        {!revealed && <div className="nebula" aria-hidden />}
      </div>

      {revealed && <p className="card-swipe-hint mono">← DESLIZA →</p>}
    </motion.article>
  )
}

function highlight(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((p, i) => (p.toLowerCase() === term.toLowerCase() ? <mark key={i}>{p}</mark> : p))
}

function Summary({ results, today, onClose }: { results: Result[]; today: string; onClose: () => void }) {
  const known = results.filter((r) => r.knew).length
  const pct = results.length ? Math.round((known / results.length) * 100) : 0
  return (
    <motion.div
      className="summary"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="mono eyebrow">Repaso de hoy terminado</p>
      <h2 className="summary-title">
        <em>{known}</em> de {results.length} en órbita
      </h2>
      <p className="summary-sub">
        {pct === 100
          ? 'Sesión perfecta. Todas tus palabras se acercan al núcleo.'
          : pct >= 60
            ? 'Buen avance. Las que fallaste vuelven mañana a la órbita I.'
            : 'Las que se resisten vuelven mañana. La repetición hace el trabajo.'}
      </p>
      <ul className="summary-list">
        {results.map((r, i) => (
          <motion.li
            key={r.word.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.04 }}
          >
            <span className="summary-term">{r.word.term}</span>
            <span className="summary-trans">{r.word.translation}</span>
            <span className="summary-move mono">
              <i style={{ color: `var(--box-${r.from})` }}>{ROMAN[r.from]}</i>
              {r.knew ? ' → ' : ' ↺ '}
              <i style={{ color: `var(--box-${r.to})` }}>{ROMAN[r.to]}</i>
              <span className="summary-next">{describeNext(r.word.due, today)}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      <button className="cta" onClick={onClose}>
        Volver al sistema
      </button>
    </motion.div>
  )
}
