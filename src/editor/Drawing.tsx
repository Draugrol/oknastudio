/**
 * Чертёж изделия: SVG в миллиметрах модели.
 *
 * Порядок отрисовки повторяет физику узла: заполнение -> рама -> импосты -> створки,
 * поэтому наплав створки закрывает раму, а стеклопакет уходит под штапик.
 * Начало координат — левый нижний угол рамы, ось Y вверх (конвенция ядра),
 * в SVG координаты переворачиваются функцией toSvg.
 */
import { useRef } from 'react'
import type { CalcResult, ProductInput, Rect } from '../core/types'
import { catalog } from '../catalog'

interface Props {
  input: ProductInput
  calc: CalcResult
  selectedId?: string | null
  onSelect?: (id: string) => void
  onMoveSplit?: (id: string, ratio: number) => void
  /** Мини-чертёж для списков: без размерных линий и без взаимодействия. */
  compact?: boolean
}

export function Drawing({ input, calc, selectedId, onSelect, onMoveSplit, compact }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; dir: 'v' | 'h'; region: Rect } | null>(null)

  const W = input.width
  const H = input.height
  const margin = compact ? Math.max(W, H) * 0.03 : Math.max(140, Math.max(W, H) * 0.13)
  const fs = Math.max(W, H) / (compact ? 26 : 44)
  const color = catalog.colors.find((c) => c.id === input.colorId) ?? catalog.colors[0]

  const frame = calc.contours.find((c) => c.kind === 'frame')!
  const sashes = calc.contours.filter((c) => c.kind === 'sash')
  const imposts = calc.elements.filter((e) => e.role === 'impost')

  const toSvg = (r: Rect) => ({ x: r.x, y: H - r.y - r.h, w: r.w, h: r.h })

  function ring(outer: Rect, innerRect: Rect) {
    const o = toSvg(outer)
    const i = toSvg(innerRect)
    return (
      `M${o.x},${o.y} h${o.w} v${o.h} h${-o.w} Z ` +
      `M${i.x},${i.y} h${i.w} v${i.h} h${-i.w} Z`
    )
  }

  function modelPoint(event: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: H - pt.y }
  }

  function onPointerDown(event: React.PointerEvent, split: CalcResult['splits'][number]) {
    if (compact || !onMoveSplit) return
    event.stopPropagation()
    drag.current = { id: split.id, dir: split.dir, region: split.region }
    ;(event.target as Element).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent) {
    const active = drag.current
    if (!active || !onMoveSplit) return
    const p = modelPoint(event)
    if (!p) return
    const { region, dir } = active
    const ratio = dir === 'v' ? (p.x - region.x) / region.w : (region.y + region.h - p.y) / region.h
    onMoveSplit(active.id, Math.min(0.92, Math.max(0.08, ratio)))
  }

  function endDrag() {
    drag.current = null
  }

  return (
    <svg
      ref={svgRef}
      className="drawing"
      viewBox={`${-margin} ${-margin} ${W + 2 * margin} ${H + 2 * margin}`}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dceaf3" />
          <stop offset="45%" stopColor="#eef6fa" />
          <stop offset="100%" stopColor="#cfe0ec" />
        </linearGradient>
      </defs>

      {/* Заполнения */}
      {calc.glazings.map((g) => {
        const r = toSvg(g.rect)
        return (
          <rect key={g.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#glass)" stroke="#a9c3d4" strokeWidth={Math.max(1, W / 900)} />
        )
      })}

      {/* Рама */}
      <path d={ring(frame.rect, frame.light)} fillRule="evenodd" fill={color.render.outer} stroke={color.render.edge} strokeWidth={Math.max(1.5, W / 600)} />

      {/* Импосты */}
      {imposts.map((el) => {
        const r = toSvg(el.rect)
        return <rect key={el.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={color.render.outer} stroke={color.render.edge} strokeWidth={Math.max(1.5, W / 600)} />
      })}

      {/* Створки */}
      {sashes.map((c) => (
        <g key={c.id}>
          <path d={ring(c.rect, c.light)} fillRule="evenodd" fill={color.render.inner} stroke={color.render.edge} strokeWidth={Math.max(1.5, W / 600)} />
          <OpeningSymbol contour={c} H={H} stroke="#4b5b6b" width={Math.max(1.2, W / 900)} />
          <Handle contour={c} H={H} />
        </g>
      ))}

      {/* Зоны выбора полей */}
      {calc.fields.map((f) => {
        const r = toSvg(f.rect)
        const active = f.id === selectedId
        return (
          <rect
            key={f.id}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill="transparent"
            stroke={active ? '#0f62fe' : 'transparent'}
            strokeWidth={Math.max(3, W / 260)}
            strokeDasharray={active ? `${W / 90} ${W / 140}` : undefined}
            style={{ cursor: compact ? 'default' : 'pointer' }}
            onClick={compact ? undefined : () => onSelect?.(f.id)}
          />
        )
      })}

      {/* Импост как ручка перетаскивания */}
      {!compact &&
        onMoveSplit &&
        calc.splits.map((s) => {
          const r = toSvg(s.rect)
          return (
            <rect
              key={s.id}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill="transparent"
              style={{ cursor: s.dir === 'v' ? 'ew-resize' : 'ns-resize' }}
              onPointerDown={(e) => onPointerDown(e, s)}
            />
          )
        })}

      {/* Размеры стеклопакетов */}
      {!compact &&
        calc.glazings.map((g) => {
          const r = toSvg(g.rect)
          return (
            <text key={`t-${g.id}`} x={r.x + r.w / 2} y={r.y + r.h / 2} fontSize={fs * 0.82} textAnchor="middle" fill="#41586d">
              {`СП ${g.size.w}×${g.size.h}`}
            </text>
          )
        })}

      {/* Размеры створок */}
      {!compact &&
        sashes.map((c) => {
          const r = toSvg(c.rect)
          return (
            <text key={`s-${c.id}`} x={r.x + r.w / 2} y={r.y + fs * 1.5} fontSize={fs * 0.78} textAnchor="middle" fill="#6b7c8d">
              {`створка ${Math.round(c.rect.w)}×${Math.round(c.rect.h)}`}
            </text>
          )
        })}

      {!compact && (
        <g stroke="#8b98a5" strokeWidth={Math.max(1, W / 1100)} fill="#3c4a58">
          {/* Габарит по ширине — под изделием */}
          <DimH y={H + margin * 0.72} x1={0} x2={W} fs={fs} label={`${W}`} />
          {/* Габарит по высоте — слева от изделия */}
          <DimV x={-margin * 0.72} y1={0} y2={H} fs={fs} label={`${H}`} />
          {/* Цепочка размеров по импостам */}
          {calc.splits.map((s) => {
            const center = s.dir === 'v' ? s.rect.x + s.rect.w / 2 : s.rect.y + s.rect.h / 2
            return s.dir === 'v' ? (
              <g key={`d-${s.id}`}>
                <line x1={center} y1={0} x2={center} y2={H + margin * 0.32} strokeDasharray={`${fs / 3} ${fs / 4}`} opacity={0.4} />
                <text x={center} y={H + margin * 0.26} fontSize={fs * 0.78} textAnchor="middle" stroke="none">
                  {Math.round(center)}
                </text>
              </g>
            ) : (
              <g key={`d-${s.id}`}>
                <line x1={-margin * 0.32} y1={H - center} x2={W} y2={H - center} strokeDasharray={`${fs / 3} ${fs / 4}`} opacity={0.4} />
                <text x={-margin * 0.3} y={H - center - fs * 0.3} fontSize={fs * 0.78} textAnchor="middle" stroke="none">
                  {Math.round(center)}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

/** Символ открывания: вершина «галки» указывает на ось поворота. */
function OpeningSymbol({
  contour,
  H,
  stroke,
  width,
}: {
  contour: CalcResult['contours'][number]
  H: number
  stroke: string
  width: number
}) {
  const l = contour.light
  const x1 = l.x
  const x2 = l.x + l.w
  const yTop = H - (l.y + l.h)
  const yBottom = H - l.y
  const dash = `${l.w / 26} ${l.w / 40}`
  const lines: [number, number, number, number][] = []

  if (contour.opening === 'turn' || contour.opening === 'turnTilt') {
    // Петли со стороны, противоположной ручке.
    const hingeLeft = contour.handle === 'right'
    const apexX = hingeLeft ? x1 : x2
    const farX = hingeLeft ? x2 : x1
    lines.push([farX, yTop, apexX, (yTop + yBottom) / 2], [farX, yBottom, apexX, (yTop + yBottom) / 2])
  }
  if (contour.opening === 'tilt' || contour.opening === 'turnTilt') {
    lines.push([x1, yTop, (x1 + x2) / 2, yBottom], [x2, yTop, (x1 + x2) / 2, yBottom])
  }

  return (
    <g stroke={stroke} strokeWidth={width} strokeDasharray={dash} fill="none">
      {lines.map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} />
      ))}
    </g>
  )
}

function Handle({ contour, H }: { contour: CalcResult['contours'][number]; H: number }) {
  if (contour.opening === 'fix') return null
  const l = contour.light
  const w = Math.max(14, l.w / 26)
  const h = w * 3.4
  const x = contour.handle === 'right' ? l.x + l.w - w * 0.4 : l.x - w * 0.6
  const y = H - (l.y + l.h / 2) - h / 2
  return <rect x={x} y={y} width={w} height={h} rx={w / 3} fill="#7d8b98" />
}

function DimH({ y, x1, x2, fs, label }: { y: number; x1: number; x2: number; fs: number; label: string }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - fs * 0.45} x2={x1} y2={y + fs * 0.45} />
      <line x1={x2} y1={y - fs * 0.45} x2={x2} y2={y + fs * 0.45} />
      <text x={(x1 + x2) / 2} y={y - fs * 0.45} fontSize={fs} textAnchor="middle" stroke="none">
        {label}
      </text>
    </g>
  )
}

function DimV({ x, y1, y2, fs, label }: { x: number; y1: number; y2: number; fs: number; label: string }) {
  const mid = (y1 + y2) / 2
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x - fs * 0.45} y1={y1} x2={x + fs * 0.45} y2={y1} />
      <line x1={x - fs * 0.45} y1={y2} x2={x + fs * 0.45} y2={y2} />
      <text x={x - fs * 0.45} y={mid} fontSize={fs} textAnchor="middle" stroke="none" transform={`rotate(-90 ${x - fs * 0.45} ${mid})`}>
        {label}
      </text>
    </g>
  )
}
