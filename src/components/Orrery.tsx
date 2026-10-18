import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'
import { BOXES, describeNext, isDue, ORBIT_NAME, ROMAN } from '../lib/leitner'
import type { Box, Word } from '../lib/types'

/** Radio de cada órbita: la I es la más lejana, la V roza el núcleo */
export const ORBIT_RADIUS: Record<Box, number> = { 1: 445, 2: 365, 3: 285, 4: 205, 5: 125 }
/** Las órbitas exteriores giran más despacio (a lo Kepler) */
const ORBIT_PERIOD: Record<Box, number> = { 1: 240, 2: 180, 3: 130, 4: 90, 5: 60 }
const ORBIT_PHASE: Record<Box, number> = { 1: 0.1, 2: 0.55, 3: 0.3, 4: 0.8, 5: 0.15 }

const CORE_R = 78
const MAX_TERM_CHARS = 14
/** Up to this many words an orbit draws clean planets with labels; above it becomes a belt */
const PLANET_MAX = 8
/** Permanent labels per belt (due words first) */
const MAX_LABELS = 5
const GOLDEN_ANGLE = 2.399963
const TAU = Math.PI * 2

interface Dot {
  word: Word
  x: number
  y: number
}

/** Stable pseudo-random number in [0,1) from a string */
function hash01(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return ((h >>> 0) % 100_000) / 100_000
}

/** Real-pixel dot radius: fewer words → bigger bodies, so 5 and 600 words both look intentional */
function dotPx(n: number): number {
  if (n <= PLANET_MAX) return 6
  if (n <= 25) return 4.5
  if (n <= 80) return 3.4
  if (n <= 200) return 2.6
  return 2
}

function layoutOrbit(list: Word[], b: Box): Dot[] {
  const n = list.length
  const r = ORBIT_RADIUS[b]
  const spread = n <= PLANET_MAX ? 0 : Math.min(30, 5 + Math.sqrt(n) * 1.5)
  return list.map((word, i) => {
    const a = n <= PLANET_MAX ? (i / n + ORBIT_PHASE[b]) * TAU : ORBIT_PHASE[b] * TAU + i * GOLDEN_ANGLE
    const rr = r + (hash01(word.id) * 2 - 1) * spread
    return { word, x: Math.cos(a) * rr, y: Math.sin(a) * rr }
  })
}

interface Props {
  words: Word[]
  today: string
  dueCount: number
  highlightBox: Box | null
  /** 0..1 progress of today's goal, drawn as a ring around the sun */
  dailyProgress: number
  onSelect: (word: Word) => void
  onCoreClick: () => void
  onOrbitClick: (box: Box) => void
}

const shortTerm = (term: string) => (term.length > MAX_TERM_CHARS ? `${term.slice(0, MAX_TERM_CHARS - 1)}…` : term)

export function Orrery({ words, today, dueCount, highlightBox, dailyProgress, onSelect, onCoreClick, onOrbitClick }: Props) {
  const [hovered, setHovered] = useState<Word | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  /** Unidades del viewBox por píxel real: así los textos miden lo mismo en cualquier pantalla */
  const k = useUnitsPerPx(wrapRef)
  const px = (n: number) => n * k
  /** Small screens: the SVG is scaled down a lot, so labels get leaner */
  const compact = k > 1.8
  const labelSize = px(compact ? 10 : 12)
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

  const layouts = useMemo(() => {
    const out = {} as Record<Box, Dot[]>
    for (const b of BOXES) out[b] = layoutOrbit(byBox[b], b)
    return out
  }, [byBox])

  const dotById = useMemo(() => {
    const m = new Map<string, Dot>()
    for (const b of BOXES) for (const d of layouts[b]) m.set(d.word.id, d)
    return m
  }, [layouts])

  /** Words that always carry a label: every word on sparse orbits, otherwise a few due ones */
  const labelled = useMemo(() => {
    const ids = new Set<string>()
    for (const b of BOXES) {
      const list = byBox[b]
      if (list.length <= PLANET_MAX) list.forEach((w) => ids.add(w.id))
      else
        list
          .filter((w) => isDue(w, today))
          .sort((x, y) => x.due.localeCompare(y.due))
          .slice(0, compact ? 2 : MAX_LABELS)
          .forEach((w) => ids.add(w.id))
    }
    return ids
  }, [byBox, today, compact])

  /** Nearest word to the pointer, accounting for each orbit's current rotation */
  const pick = (e: ReactMouseEvent<SVGSVGElement>): Word | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    if ((e.target as Element).closest('.core, .orbit-pill')) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    const t = reducedMotion ? 0 : svg.getCurrentTime()
    const reach = px(16)
    const dist = Math.hypot(p.x, p.y)
    let best: Word | null = null
    let bestD = reach * reach
    for (const b of BOXES) {
      if (Math.abs(dist - ORBIT_RADIUS[b]) > 34 + reach) continue
      const th = ((t % ORBIT_PERIOD[b]) / ORBIT_PERIOD[b]) * TAU
      const c = Math.cos(th)
      const sn = Math.sin(th)
      const ux = p.x * c + p.y * sn
      const uy = -p.x * sn + p.y * c
      for (const d of layouts[b]) {
        const dd = (d.x - ux) ** 2 + (d.y - uy) ** 2
        if (dd < bestD) {
          bestD = dd
          best = d.word
        }
      }
    }
    return best
  }

  const circ = 2 * Math.PI * (CORE_R + 14)

  return (
    <div className={`orrery ${hovered ? 'orrery--hot' : ''}`} ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox="-500 -500 1000 1000"
        role="img"
        aria-label="Sistema orbital de palabras"
        onPointerMove={(e) => {
          const w = pick(e)
          setHovered((h) => (h?.id === w?.id ? h : w))
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(e) => {
          const w = pick(e)
          if (w) onSelect(w)
        }}
      >
        <defs>
          <radialGradient id="core-grad" cx="0.42" cy="0.38" r="0.7">
            <stop offset="0" stopColor="#fff6e6" />
            <stop offset="0.35" stopColor="#ffc879" />
            <stop offset="0.75" stopColor="#ff7a3a" />
            <stop offset="1" stopColor="#d9401c" />
          </radialGradient>
          <radialGradient id="core-glow">
            <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.4" />
            <stop offset="0.45" stopColor="#ff6a2c" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ff6a2c" stopOpacity="0" />
          </radialGradient>
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

        {/* Órbitas: banda tenue + trazo */}
        {BOXES.map((b) => (
          <g
            key={b}
            className={`orbit-group ${highlightBox === b ? 'orbit-group--on' : ''} ${highlightBox && highlightBox !== b ? 'orbit-group--dim' : ''}`}
            style={{ color: `var(--box-${b})` }}
          >
            <circle r={ORBIT_RADIUS[b]} className="orbit-band" />
            <circle r={ORBIT_RADIUS[b]} className="orbit" />
          </g>
        ))}

        {/* Núcleo */}
        <circle r={210} fill="url(#core-glow)" className="core-glow" />
        <g className="corona" aria-hidden>
          <circle r={CORE_R + 14} className="daily-track" />
          <circle
            r={CORE_R + 14}
            className="daily-arc"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - dailyProgress)}
            transform="rotate(-90)"
          />
          <circle r={CORE_R + 30} className="corona-ring corona-ring--2" />
        </g>
        <g
          className={`core ${dueCount > 0 ? 'core--active' : ''}`}
          onClick={dueCount > 0 ? onCoreClick : undefined}
          role={dueCount > 0 ? 'button' : undefined}
          aria-label={dueCount > 0 ? `Practicar ${dueCount} palabras` : undefined}
          tabIndex={dueCount > 0 ? 0 : -1}
          onKeyDown={(e) => dueCount > 0 && (e.key === 'Enter' || e.key === ' ') && onCoreClick()}
        >
          <circle r={CORE_R} fill="url(#core-grad)" className="core-disc" />
          <text y={dueCount > 0 ? 6 : 8} className="core-count">
            {dueCount > 0 ? dueCount : '✓'}
          </text>
          <text y={38} className="core-label" style={{ fontSize: Math.min(px(12), 17) }}>
            {dueCount > 0 ? 'REPASAR' : 'AL DÍA'}
          </text>
        </g>

        {/* Planetas y cinturones: cada órbita gira como un bloque; las etiquetas contrarrotan para quedar horizontales */}
        {BOXES.map((b) => {
          const dots = layouts[b]
          const n = dots.length
          const r = px(dotPx(n))
          const rotate = (to: number) =>
            !reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to={to}
                dur={`${ORBIT_PERIOD[b]}s`}
                repeatCount="indefinite"
              />
            )
          const label = (d: Dot, bodyR: number, due: boolean) => (
            <g transform={`translate(${d.x.toFixed(2)} ${d.y.toFixed(2)})`} key={d.word.id}>
              <g>
                {rotate(-360)}
                <text
                  x={bodyR + px(7)}
                  y={labelSize * 0.35}
                  className={`planet-label ${due ? 'planet-label--due' : ''}`}
                  style={{ fontSize: labelSize }}
                >
                  {shortTerm(d.word.term)}
                </text>
              </g>
            </g>
          )
          const hot = hovered && hovered.box === b ? dotById.get(hovered.id) : undefined
          return (
            <g
              key={b}
              className={`planets ${highlightBox && highlightBox !== b ? 'planets--dim' : ''}`}
              style={{ color: `var(--box-${b})` }}
            >
              {rotate(360)}
              {dots.map((d) => {
                const due = isDue(d.word, today)
                return (
                  <circle
                    key={d.word.id}
                    cx={d.x.toFixed(1)}
                    cy={d.y.toFixed(1)}
                    r={due ? r * 1.35 : r}
                    className={due ? 'dot dot--due' : 'dot'}
                  />
                )
              })}
              {dots
                .filter((d) => labelled.has(d.word.id) && d.word.id !== hovered?.id)
                .map((d) => label(d, isDue(d.word, today) ? r * 1.35 : r, isDue(d.word, today)))}
              {hot && (
                <g transform={`translate(${hot.x.toFixed(2)} ${hot.y.toFixed(2)})`}>
                  <circle r={r * 1.35 + px(5)} className="dot-focus" />
                  <circle r={r * 1.35} className="dot dot--due" />
                  <g>
                    {rotate(-360)}
                    <text x={r * 1.35 + px(12)} y={labelSize * 0.35} className="planet-label planet-label--due" style={{ fontSize: labelSize }}>
                      {shortTerm(hot.word.term)}
                    </text>
                  </g>
                </g>
              )}
            </g>
          )
        })}

        {/* Etiquetas de órbita (fijas, en píldora) */}
        {BOXES.map((b) => {
          const text = compact ? ROMAN[b] : `${ROMAN[b]} · ${ORBIT_NAME[b].toUpperCase()} · ${byBox[b].length}`
          const fs = px(compact ? 10 : 12)
          const w = text.length * fs * 0.64 + px(compact ? 14 : 22)
          const h = px(compact ? 20 : 26)
          const a = ((-90 + (b - 3) * 9) * Math.PI) / 180
          const cx = Math.cos(a) * ORBIT_RADIUS[b]
          const cy = Math.sin(a) * ORBIT_RADIUS[b]
          return (
            <g
              key={b}
              transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)})`}
              className={`orbit-pill ${highlightBox && highlightBox !== b ? 'orbit-pill--dim' : ''}`}
              style={{ color: `var(--box-${b})` }}
              onClick={() => onOrbitClick(b)}
              role="button"
              tabIndex={0}
              aria-label={`Ver palabras de la órbita ${ROMAN[b]}`}
              onKeyDown={(e) => e.key === 'Enter' && onOrbitClick(b)}
            >
              <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} className="orbit-pill-bg" />
              <text y={fs * 0.36} className="orbit-label" style={{ fontSize: fs }}>
                {text}
              </text>
            </g>
          )
        })}
      </svg>

      <div className={`readout ${hovered ? 'readout--on' : ''}`} aria-live="polite">
        {hovered && (
          <>
            <span className="readout-dot" style={{ background: `var(--box-${hovered.box})` }} />
            <span className="readout-term">{hovered.term}</span>
            <span className="readout-trans">{hovered.translation}</span>
            <span className="readout-meta">
              ÓRBITA {ROMAN[hovered.box]} · {describeNext(hovered.due, today).toUpperCase()}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function useUnitsPerPx(ref: RefObject<HTMLElement | null>) {
  const [k, setK] = useState(1.2)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setK(1000 / w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return k
}
