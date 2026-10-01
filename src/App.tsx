import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Logbook } from './components/Logbook'
import { Orrery } from './components/Orrery'
import { Practice } from './components/Practice'
import { WordSheet } from './components/WordSheet'
import { BOXES, describeNext, dueWords, ROMAN, todayISO } from './lib/leitner'
import { useWords } from './lib/useWords'
import type { Word } from './lib/types'

type Sheet = { kind: 'add' } | { kind: 'edit'; word: Word } | { kind: 'logbook' } | null

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
  const [sheet, setSheet] = useState<Sheet>(null)
  const [session, setSession] = useState<Word[] | null>(null)

  const due = useMemo(() => dueWords(words, today), [words, today])
  const nextDue = useMemo(() => (due.length ? null : words.map((w) => w.due).sort()[0]), [due, words])

  const startPractice = () => due.length && setSession(due)

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
      <div className="sky" aria-hidden />

      <header className="topbar">
        <h1 className="brand">
          Vocabu<em>leo</em>
        </h1>
        <nav className="topbar-actions">
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
              onSelect={(word) => setSheet({ kind: 'edit', word })}
              onCoreClick={startPractice}
            />
          </motion.div>
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
          <>
            <aside className="legend">
              <p className="mono eyebrow">Órbitas</p>
              {BOXES.map((b) => {
                const n = words.filter((w) => w.box === b).length
                return (
                  <div key={b} className="legend-row">
                    <span className="legend-dot" style={{ background: `var(--box-${b})`, color: `var(--box-${b})` }} />
                    <span className="mono legend-roman">{ROMAN[b]}</span>
                    <span className="legend-bar">
                      <span style={{ width: `${(n / words.length) * 100}%`, background: `var(--box-${b})` }} />
                    </span>
                    <span className="mono legend-n">{n}</span>
                  </div>
                )
              })}
            </aside>

            <motion.div className="dock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              {due.length > 0 ? (
                <button className="cta cta--big" onClick={startPractice}>
                  Practicar <span className="cta-count">{due.length}</span>
                </button>
              ) : (
                <p className="dock-calm">
                  Todo en órbita. Próximo repaso <strong>{nextDue ? describeNext(nextDue, today) : '—'}</strong>.
                </p>
              )}
            </motion.div>
          </>
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
            words={words}
            today={today}
            onSelect={(word) => setSheet({ kind: 'edit', word })}
            onImport={importWords}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {session && <Practice queue={session} today={today} onAnswer={update} onClose={() => setSession(null)} />}
      </AnimatePresence>
    </div>
  )
}
