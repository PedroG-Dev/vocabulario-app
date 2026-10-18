import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Logbook } from './components/Logbook'
import { Orrery } from './components/Orrery'
import { Practice } from './components/Practice'
import { WordSheet } from './components/WordSheet'
import { BOXES, describeNext, dueWords, INTERVAL_DAYS, ORBIT_NAME, ROMAN, todayISO } from './lib/leitner'
import { dailyProgress, streakOf } from './lib/progress'
import { useProgress } from './lib/useProgress'
import { useWords } from './lib/useWords'
import type { Box, Progress, Word } from './lib/types'

type Sheet = { kind: 'add' } | { kind: 'edit'; word: Word } | { kind: 'logbook'; box?: Box } | null

function useToday() {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    document.addEventListener('visibilitychange', refresh)
    const id = setInterval(refresh, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(id)
    }
  }, [])
  return today
}

export default function App() {
  const today = useToday()
  const { words, ready, add, update, remove, importWords } = useWords(today)
  const { progress, answered, complete, importProgress } = useProgress(today)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [session, setSession] = useState<Word[] | null>(null)
  const [highlightBox, setHighlightBox] = useState<Box | null>(null)

  const due = useMemo(() => dueWords(words, today), [words, today])
  const nextDue = useMemo(() => (due.length ? null : words.map((w) => w.due).sort()[0]), [due, words])

  const streak = streakOf(progress, today)
  const dayDone = progress.done.includes(today)
  const ring = dailyProgress(progress, today, due.length)

  const startPractice = () => due.length && setSession(due)
  const handleAnswer = (word: Word) => {
    update(word)
    answered()
  }
  const handleImport = (incoming: Word[], incomingProgress?: Progress) => {
    importWords(incoming)
    if (incomingProgress) importProgress(incomingProgress)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || session || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setSheet({ kind: 'add' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet, session])

  return (
    <div className="app">
      <div className="sky" aria-hidden>
        <div className="stars stars--far" />
        <div className="stars stars--near" />
      </div>

      <header className="topbar">
        <h1 className="brand">
          Vocabu<em>leo</em>
        </h1>
        <nav className="topbar-actions">
          {ready && (
            <span className={`streak ${dayDone ? 'streak--done' : ''}`} title={dayDone ? 'Objetivo de hoy cumplido' : 'Completa una sesión hoy para mantener la racha'}>
              <span className="streak-n">{streak}</span>
              <span className="streak-l">{streak === 1 ? 'día de racha' : 'días de racha'}</span>
            </span>
          )}
          <button className="ghost-btn" onClick={() => setSheet({ kind: 'logbook' })}>
            Bitácora
          </button>
          <button className="add-btn" onClick={() => setSheet({ kind: 'add' })} aria-label="Añadir palabra (N)">
            <span>+</span> Palabra
          </button>
        </nav>
      </header>

      <main className="home">
        {ready && (
          <div className="stage">
            <motion.div
              className="orrery-wrap"
              initial={{ opacity: 0, scale: 0.92, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Orrery
                words={words}
                today={today}
                dueCount={due.length}
                highlightBox={highlightBox}
                dailyProgress={ring}
                onSelect={(word) => setSheet({ kind: 'edit', word })}
                onCoreClick={startPractice}
                onOrbitClick={(box) => setSheet({ kind: 'logbook', box })}
              />
            </motion.div>

            {words.length > 0 && (
              <motion.aside className="legend" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <div className="legend-head">
                  <p className="legend-total">
                    <strong>{words.length}</strong> {words.length === 1 ? 'palabra' : 'palabras'}
                  </p>
                  <p className="legend-due">{due.length > 0 ? `${due.length} por repasar hoy` : 'Nada pendiente hoy'}</p>
                </div>
                {BOXES.map((b) => {
                  const n = words.filter((w) => w.box === b).length
                  const every = INTERVAL_DAYS[b] === 1 ? 'cada día' : `cada ${INTERVAL_DAYS[b]} días`
                  return (
                    <div
                      key={b}
                      className={`legend-row ${highlightBox === b ? 'legend-row--on' : ''}`}
                      tabIndex={0}
                      onPointerEnter={() => setHighlightBox(b)}
                      onPointerLeave={() => setHighlightBox(null)}
                      onFocus={() => setHighlightBox(b)}
                      onBlur={() => setHighlightBox(null)}
                      onClick={() => setSheet({ kind: 'logbook', box: b })}
                      onKeyDown={(e) => e.key === 'Enter' && setSheet({ kind: 'logbook', box: b })}
                      role="button"
                    >
                      <span className="legend-dot" style={{ background: `var(--box-${b})`, color: `var(--box-${b})` }} />
                      <span className="legend-name">
                        <span className="legend-title">
                          <span className="mono legend-roman">{ROMAN[b]}</span> {ORBIT_NAME[b]}
                        </span>
                        <span className="legend-every">{every}</span>
                      </span>
                      <span className="legend-n">{n}</span>
                      <span className="legend-bar">
                        <span style={{ width: `${(n / words.length) * 100}%`, background: `var(--box-${b})` }} />
                      </span>
                    </div>
                  )
                })}
              </motion.aside>
            )}
          </div>
        )}

        {ready && words.length === 0 && (
          <motion.div className="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <p className="empty-title">Tu sistema está vacío</p>
            <p className="empty-sub">Apunta la primera palabra en inglés que te encuentres hoy. Entrará en la órbita exterior.</p>
            <button className="cta" onClick={() => setSheet({ kind: 'add' })}>
              Añadir la primera palabra
            </button>
          </motion.div>
        )}

        {ready && words.length > 0 && (
          <motion.div className="dock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {due.length > 0 ? (
              <button className="cta cta--big" onClick={startPractice}>
                {dayDone ? 'Seguir repasando' : 'Sesión de 5 min'} <span className="cta-count">{due.length}</span>
              </button>
            ) : (
              <p className="dock-calm">
                Todo en órbita. Próximo repaso <strong>{nextDue ? describeNext(nextDue, today) : '—'}</strong>.
              </p>
            )}
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {(sheet?.kind === 'add' || sheet?.kind === 'edit') && (
          <WordSheet
            key={sheet.kind === 'edit' ? sheet.word.id : 'add'}
            word={sheet.kind === 'edit' ? sheet.word : undefined}
            words={words}
            today={today}
            onAdd={add}
            onSave={update}
            onDelete={remove}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.kind === 'logbook' && (
          <Logbook
            key={sheet.box ?? 'all'}
            words={words}
            progress={progress}
            box={sheet.box ?? null}
            today={today}
            onSelect={(word) => setSheet({ kind: 'edit', word })}
            onImport={handleImport}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {session && <Practice queue={session} today={today} onAnswer={handleAnswer} onComplete={complete} onClose={() => setSession(null)} />}
      </AnimatePresence>
    </div>
  )
}
