import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { describeNext, ORBIT_NAME, ROMAN } from '../lib/leitner'
import { exportJSON, parseImport } from '../lib/storage'
import type { Box, Progress, Word } from '../lib/types'

interface Props {
  words: Word[]
  progress: Progress
  today: string
  /** Shows only one orbit until the user clears the filter */
  box?: Box | null
  onSelect: (word: Word) => void
  onImport: (words: Word[], progress?: Progress) => void
  onClose: () => void
}

export function Logbook({ words, progress, today, box = null, onSelect, onImport, onClose }: Props) {
  const [q, setQ] = useState('')
  const [boxFilter, setBoxFilter] = useState<Box | null>(box)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return words
      .filter((w) => !boxFilter || w.box === boxFilter)
      .filter((w) => !needle || w.term.toLowerCase().includes(needle) || w.translation.toLowerCase().includes(needle))
      .sort((a, b) => a.due.localeCompare(b.due) || a.term.localeCompare(b.term))
  }, [words, q, boxFilter])

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      >
        <header className="sheet-head">
          <div>
            <p className="mono eyebrow">{boxFilter ? `${list.length} de ${words.length} palabras` : `${words.length} palabras`}</p>
            <h2 className="sheet-title">{boxFilter ? `${ROMAN[boxFilter]} · ${ORBIT_NAME[boxFilter]}` : 'Bitácora'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <input className="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        {boxFilter && (
          <button className="ghost-btn log-filter" onClick={() => setBoxFilter(null)}>
            Ver todas las órbitas ✕
          </button>
        )}

        <ul className="log-list">
          {list.map((w) => (
            <li key={w.id}>
              <button onClick={() => onSelect(w)}>
                <span className="log-dot" style={{ background: `var(--box-${w.box})`, color: `var(--box-${w.box})` }} />
                <span className="log-words">
                  <span className="log-term">{w.term}</span>
                  <span className="log-trans">{w.translation}</span>
                </span>
                <span className="log-meta mono">
                  {ROMAN[w.box]} · {describeNext(w.due, today)}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="log-empty">{words.length ? 'Sin resultados' : 'Aún no hay palabras'}</li>}
        </ul>

        <footer className="drawer-foot">
          <p className="mono drawer-note">
            Tus palabras viven solo en este navegador. Exporta de vez en cuando para tener una copia.
          </p>
          <div className="drawer-actions">
            <button className="ghost-btn" onClick={() => exportJSON(words, progress)} disabled={!words.length}>
              Exportar
            </button>
            <button className="ghost-btn" onClick={() => fileRef.current?.click()}>
              Importar
            </button>
          </div>
          {msg && <p className="mono drawer-msg">{msg}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const imported = await parseImport(file)
                onImport(imported.words, imported.progress)
                setMsg(`${imported.words.length} palabras importadas`)
              } catch {
                setMsg('No se pudo leer el archivo')
              }
            }}
          />
        </footer>
      </motion.aside>
    </motion.div>
  )
}
