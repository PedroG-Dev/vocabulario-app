import { useEffect, useMemo, useState } from 'react'
import { BOXES, describeNext, INTERVAL_DAYS, isDue, ROMAN } from '../lib/leitner'
import type { Box, Word } from '../lib/types'

/** Radio de cada órbita: la I es la más lejana, la V roza el núcleo */
export const ORBIT_RADIUS: Record<Box, number> = { 1: 445, 2: 365, 3: 285, 4: 205, 5: 125 }
/** Las órbitas exteriores giran más despacio (a lo Kepler) */
const ORBIT_PERIOD: Record<Box, number> = { 1: 240, 2: 180, 3: 130, 4: 90, 5: 60 }
const ORBIT_PHASE: Record<Box, number> = { 1: 0.1, 2: 0.55, 3: 0.3, 4: 0.8, 5: 0.15 }

interface Props {
  words: Word[]
  today: string
  dueCount: number
  onSelect: (word: Word) => void
  onCoreClick: () => void
}

export function Orrery({ words, today, dueCount, onSelect, onCoreClick }: Props) {
  const [hovered, setHovered] = useState<Word | null>(null)
  const compact = useCompact()
  const planetR = compact ? 10 : 5
  const labelSize = compact ? 22 : 11
  const reducedMotion = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const byBox = useMemo(() => {
    const groups: Record<Box, Word[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    for (const w of words) groups[w.box].push(w)
    for (const b of BOXES) groups[b].sort((a, c) => a.createdAt.localeCompare(c.createdAt))
    return groups
  }, [words])

  return (
    <div className="orrery">
      <svg viewBox="-500 -500 1000 1000" role="img" aria-label="Sistema orbital de palabras">
        <defs>
          <radialGradient id="core-grad" cx="0.42" cy="0.38" r="0.7">
            <stop offset="0" stopColor="#fff6e6" />
            <stop offset="0.35" stopColor="#ffc879" />
            <stop offset="0.75" stopColor="#ff7a3a" />
            <stop offset="1" stopColor="#d9401c" />
          </radialGradient>
          <radialGradient id="core-glow">
            <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="#ff6a2c" stopOpacity="0.12" />
            <stop offset="1" stopColor="#ff6a2c" stopOpacity="0" />
          </radialGradient>
          <filter id="planet-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Escala graduada exterior */}
        <g className="ticks">
          {Array.from({ length: 120 }, (_, i) => {
            const a = (i / 120) * Math.PI * 2
            const long = i % 10 === 0
            const r1 = 478
            const r2 = long ? 466 : 472
            return (
              <line
                key={i}
                x1={Math.cos(a) * r1}
                y1={Math.sin(a) * r1}
                x2={Math.cos(a) * r2}
                y2={Math.sin(a) * r2}
                className={long ? 'tick tick--long' : 'tick'}
              />
            )
          })}
        </g>

        {/* Órbitas */}
        {BOXES.map((b) => (
          <circle key={b} r={ORBIT_RADIUS[b]} className="orbit" style={{ stroke: `var(--box-${b})` }} />
        ))}

        {/* Núcleo */}
        <circle r={190} fill="url(#core-glow)" className="core-glow" />
        <g
          className={`core ${dueCount > 0 ? 'core--active' : ''}`}
          onClick={dueCount > 0 ? onCoreClick : undefined}
          role={dueCount > 0 ? 'button' : undefined}
          aria-label={dueCount > 0 ? `Practicar ${dueCount} palabras` : undefined}
          tabIndex={dueCount > 0 ? 0 : -1}
          onKeyDown={(e) => dueCount > 0 && (e.key === 'Enter' || e.key === ' ') && onCoreClick()}
        >
          <circle r={62} fill="url(#core-grad)" />
          <text y={dueCount > 0 ? 8 : 6} className="core-count">
            {dueCount > 0 ? dueCount : '✓'}
          </text>
          <text y={30} className="core-label">
            {dueCount > 0 ? 'HOY' : 'AL DÍA'}
          </text>
        </g>

        {/* Planetas: cada órbita gira como un bloque */}
        {BOXES.map((b) => {
          const list = byBox[b]
          const r = ORBIT_RADIUS[b]
          return (
            <g key={b}>
              {!reducedMotion && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur={`${ORBIT_PERIOD[b]}s`}
                  repeatCount="indefinite"
                />
              )}
              {list.map((w, i) => {
                const a = ((i / list.length + ORBIT_PHASE[b]) % 1) * Math.PI * 2
                const x = Math.cos(a) * r
                const y = Math.sin(a) * r
                const due = isDue(w, today)
                return (
                  <g
                    key={w.id}
                    transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
                    className={`planet ${due ? 'planet--due' : ''} ${hovered?.id === w.id ? 'planet--hover' : ''}`}
                    style={{ color: `var(--box-${b})` }}
                    onPointerEnter={() => setHovered(w)}
                    onPointerLeave={() => setHovered((h) => (h?.id === w.id ? null : h))}
                    onClick={() => onSelect(w)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${w.term}, órbita ${ROMAN[b]}`}
                    onFocus={() => setHovered(w)}
                    onBlur={() => setHovered(null)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(w)}
                  >
                    <circle r={22} className="planet-hit" />
                    {due && <circle r={planetR * 1.8} className="planet-halo" />}
                    <circle r={due ? planetR * 1.4 : planetR} className="planet-body" filter="url(#planet-glow)" />
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Etiquetas de órbita (fijas) */}
        {BOXES.map((b) => (
          <text
            key={b}
            x={0}
            y={-ORBIT_RADIUS[b] - labelSize * 0.8}
            className="orbit-label"
            style={{ fill: `var(--box-${b})`, fontSize: labelSize, strokeWidth: labelSize * 0.7 }}
          >
            {ROMAN[b]} · {INTERVAL_DAYS[b]}D · {byBox[b].length}
          </text>
        ))}
      </svg>

      <div className={`readout ${hovered ? 'readout--on' : ''}`} aria-live="polite">
        {hovered && (
          <>
            <span className="readout-dot" style={{ background: `var(--box-${hovered.box})` }} />
            <span className="readout-term">{hovered.term}</span>
            <span className="readout-meta">
              ÓRBITA {ROMAN[hovered.box]} · {describeNext(hovered.due, today).toUpperCase()}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function useCompact() {
  const query = '(max-width: 600px)'
  const [compact, setCompact] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const onChange = () => setCompact(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
}
