import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 550
const R = 30
const C = 2 * Math.PI * R

interface Props {
  onReveal: () => void
  /** Permite que la barra espaciadora controle la pulsación desde fuera */
  externalHolding?: boolean
}

export function HoldToReveal({ onReveal, externalHolding = false }: Props) {
  const [pointerHolding, setPointerHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const holding = pointerHolding || externalHolding
  const doneRef = useRef(false)

  useEffect(() => {
    if (!holding) {
      setProgress(0)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / HOLD_MS, 1)
      setProgress(p)
      if (p >= 1) {
        if (!doneRef.current) {
          doneRef.current = true
          navigator.vibrate?.(12)
          onReveal()
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [holding, onReveal])

  return (
    <button
      type="button"
      className={`hold ${holding ? 'hold--active' : ''}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setPointerHolding(true)
      }}
      onPointerUp={() => setPointerHolding(false)}
      onPointerCancel={() => setPointerHolding(false)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Mantén pulsado para revelar la traducción"
    >
      <svg viewBox="-40 -40 80 80" className="hold-ring" aria-hidden>
        <circle r={R} className="hold-track" />
        <circle
          r={R}
          className="hold-progress"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90)"
        />
        <circle r={6 + progress * 10} className="hold-core" />
      </svg>
      <span className="hold-label">Mantén pulsado para revelar</span>
      <span className="hold-key">o mantén ESPACIO</span>
    </button>
  )
}
