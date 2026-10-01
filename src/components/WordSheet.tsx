import { motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { describeNext, ROMAN } from '../lib/leitner'
import type { Word, WordInput } from '../lib/types'

interface Props {
  /** Si se pasa, el formulario edita esa palabra */
  word?: Word
  words: Word[]
  today: string
  onAdd: (input: WordInput) => Word
  onSave: (word: Word) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function WordSheet({ word, words, today, onAdd, onSave, onDelete, onClose }: Props) {
  const editing = Boolean(word)
  const [term, setTerm] = useState(word?.term ?? '')
  const [translation, setTranslation] = useState(word?.translation ?? '')
  const [context, setContext] = useState(word?.context ?? '')
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const termRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) termRef.current?.focus()
  }, [editing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const duplicate = term.trim()
    ? words.find((w) => w.id !== word?.id && w.term.toLowerCase() === term.trim().toLowerCase())
    : undefined

  const canSubmit = term.trim() && translation.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (word) {
      onSave({ ...word, term: term.trim(), translation: translation.trim(), context: context.trim() || undefined })
      onClose()
      return
    }
    const created = onAdd({ term, translation, context })
    setToast(`«${created.term}» entra en la órbita I`)
    setTerm('')
    setTranslation('')
    setContext('')
    termRef.current?.focus()
    setTimeout(() => setToast(null), 2400)
  }

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="sheet"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <header className="sheet-head">
          <div>
            <p className="mono eyebrow">{editing ? `Órbita ${ROMAN[word!.box]}` : 'Nueva palabra'}</p>
            <h2 className="sheet-title">{editing ? 'Editar palabra' : 'Lánzala al sistema'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <label className="field">
          <span className="mono">Palabra en inglés</span>
          <input
            ref={termRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="serendipity"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="field-term"
          />
          {duplicate && <small className="field-warn">Ya la tienes en la órbita {ROMAN[duplicate.box]}</small>}
        </label>

        <label className="field">
          <span className="mono">Traducción</span>
          <input
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="casualidad afortunada"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="mono">
            Dónde la encontraste <em>· opcional, será tu pista</em>
          </span>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="It was pure serendipity that we met at the station."
            rows={2}
          />
        </label>

        {editing && word && (
          <p className="sheet-stats mono">
            Próximo repaso {describeNext(word.due, today)} · {word.reviews} repasos · {word.lapses} fallos
          </p>
        )}

        <footer className="sheet-actions">
          {editing && (
            <button
              type="button"
              className={`ghost-btn danger ${confirmDelete ? 'danger--armed' : ''}`}
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                onDelete(word!.id)
                onClose()
              }}
            >
              {confirmDelete ? '¿Seguro? Pulsa otra vez' : 'Eliminar'}
            </button>
          )}
          <button type="submit" className="cta" disabled={!canSubmit}>
            {editing ? 'Guardar' : 'Añadir'} <kbd>↵</kbd>
          </button>
        </footer>

        {toast && (
          <motion.p className="toast" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <span className="toast-dot" /> {toast}
          </motion.p>
        )}
      </motion.form>
    </motion.div>
  )
}
