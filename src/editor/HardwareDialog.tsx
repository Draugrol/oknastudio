/**
 * «Расчёт фурнитуры» — подбор комплектации при вставке створки.
 * Слева параметры створки по фальцу и список вариантов, справа — значения
 * параметров, на которые ссылаются условия строк комплекта.
 */
import { useMemo, useState } from 'react'
import type { Catalog, FieldFill, OpeningType, ProductInput } from '../core/types'
import { calcProduct } from '../core/calc'
import { setFill } from '../core/scene'
import { sashContourOf } from '../core/geometry'

const OPENING_TITLE: Record<OpeningType, string> = {
  turn: 'Поворотная',
  turnTilt: 'Поворотно-откидная',
  tilt: 'Откидная',
  fix: 'Глухая',
}

interface Props {
  item: ProductInput
  fieldId: string
  catalog: Catalog
  current: Extract<FieldFill, { type: 'sash' }> | null
  onCancel: () => void
  onApply: (fill: FieldFill) => void
}

export function HardwareDialog({ item, fieldId, catalog, current, onCancel, onApply }: Props) {
  const system = catalog.systems.find((s) => s.id === item.systemId)!
  const variants = catalog.hardware.filter((h) => system.hardwareVariantIds.includes(h.id))
  const glazings = catalog.glazings.filter((g) => system.glazingIds.includes(g.id))
  const sashParams = catalog.params.filter((p) => system.paramIds.includes(p.id) && p.level === 'sash' && !p.hidden)

  const [openingFilter, setOpeningFilter] = useState<OpeningType | 'all'>('all')
  const [variantId, setVariantId] = useState<string>(current?.hardwareVariantId ?? variants[0]?.id ?? '')
  const [handle, setHandle] = useState<'left' | 'right'>(current?.handle ?? 'right')
  const [glazingId, setGlazingId] = useState<string>(current?.glazingId ?? glazings[0]?.id ?? '')
  const [params, setParams] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    for (const p of catalog.params.filter((x) => x.level === 'sash')) base[p.id] = p.defaultValue
    return { ...base, ...(current?.params ?? {}) }
  })

  const variant = variants.find((v) => v.id === variantId) ?? variants[0]

  const buildFill = (id: string): FieldFill => ({
    type: 'sash',
    opening: variants.find((v) => v.id === id)?.opening ?? 'turn',
    handle,
    glazingId,
    hardwareVariantId: id,
    params,
  })

  /** Предпросчёт: фальц, масса и замечания берутся из настоящего расчёта. */
  const preview = useMemo(() => {
    if (!variant) return null
    const candidate: ProductInput = { ...item, root: setFill(item.root, fieldId, buildFill(variant.id)) }
    const calc = calcProduct(candidate, catalog)
    const contour = calc.contours.find((c) => c.fieldId === fieldId)
    return { calc, contour }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, fieldId, catalog, variantId, handle, glazingId, params])

  const falz = preview?.contour?.falz
  const sashMass = preview?.contour?.massKg ?? 0

  const fits = (id: string) => {
    const v = variants.find((x) => x.id === id)
    if (!v || !falz) return true
    if (falz.w > v.maxFw || falz.h > v.maxFh || sashMass > v.maxSashMass) return false
    return v.ranges.some((r) => falz.w >= r.fw[0] && falz.w <= r.fw[1] && falz.h >= r.fh[0] && falz.h <= r.fh[1])
  }

  const rows = variants.filter((v) => (openingFilter === 'all' ? true : v.opening === openingFilter))

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal hardware" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Расчёт фурнитуры</h2>
          <button className="link" onClick={onCancel}>
            ✕
          </button>
        </header>

        <div className="hw-head">
          <label>
            Система
            <input value={system.name} readOnly />
          </label>
          <label>
            Вариант контура
            <input value={sashContourOf(system)?.name ?? '— не задан —'} readOnly />
          </label>
          <label>
            Вид фурнитуры
            <select value={openingFilter} onChange={(e) => setOpeningFilter(e.target.value as OpeningType | 'all')}>
              <option value="all">Все</option>
              {[...new Set(variants.map((v) => v.opening))].map((o) => (
                <option key={o} value={o}>
                  {OPENING_TITLE[o]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ширина створки по фальцу, мм
            <input value={falz ? falz.w : '—'} readOnly />
          </label>
          <label>
            Высота створки по фальцу, мм
            <input value={falz ? falz.h : '—'} readOnly />
          </label>
          <label>
            Вес створки, кг
            <input value={sashMass.toFixed(1)} readOnly />
          </label>
          <label>
            Сторона ручки
            <select value={handle} onChange={(e) => setHandle(e.target.value as 'left' | 'right')}>
              <option value="right">Справа (петли слева)</option>
              <option value="left">Слева (петли справа)</option>
            </select>
          </label>
          <label>
            Заполнение
            <select value={glazingId} onChange={(e) => setGlazingId(e.target.value)}>
              <option value="">— без заполнения —</option>
              {glazings.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="hw-body">
          <div className="hw-list">
            <table className="grid">
              <thead>
                <tr>
                  <th className="w-pic">Рис.</th>
                  <th className="w-code">Фурнитура</th>
                  <th>Комплектация</th>
                  <th className="w-num">Предел ФШ×ФВ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr
                    key={v.id}
                    className={[v.id === variantId ? 'selected' : '', fits(v.id) ? '' : 'unfit'].join(' ').trim()}
                    onClick={() => setVariantId(v.id)}
                    onDoubleClick={() => onApply(buildFill(v.id))}
                  >
                    <td><OpeningIcon opening={v.opening} handle={handle} /></td>
                    <td className="muted">{v.brand}</td>
                    <td>{v.name}</td>
                    <td className="num muted">
                      {v.maxFw}×{v.maxFh}, {v.maxSashMass} кг
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="muted center">
                      В системе не отмечен ни один вариант фурнитуры
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="hw-params">
            <table className="grid">
              <thead>
                <tr>
                  <th>Параметр</th>
                  <th className="w-base">Значение</th>
                </tr>
              </thead>
              <tbody>
                {sashParams.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>
                      <select
                        className="cell"
                        value={params[p.id] ?? p.defaultValue}
                        onChange={(e) => setParams((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      >
                        {p.values
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((v) => (
                            <option key={v.id} value={v.value}>
                              {v.value}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!sashParams.length && (
                  <tr>
                    <td colSpan={2} className="muted center">
                      Параметров уровня створки нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {preview && preview.calc.issues.length > 0 && (
          <div className="hw-issues">
            {preview.calc.issues.slice(0, 3).map((issue, i) => (
              <div key={i}>{issue}</div>
            ))}
          </div>
        )}

        <footer>
          <span className="muted">
            {variant ? `${variant.brand} · ${variant.name}` : 'Вариант не выбран'}
            {variant && !fits(variant.id) && ' — не подходит по размеру или массе'}
          </span>
          <button onClick={onCancel}>Отмена</button>
          <button className="primary" disabled={!variant} onClick={() => variant && onApply(buildFill(variant.id))}>
            {current ? 'Применить' : 'Вставить створку'}
          </button>
        </footer>
      </div>
    </div>
  )
}

/** Пиктограмма открывания: вершина «галки» указывает на ось поворота. */
export function OpeningIcon({ opening, handle }: { opening: OpeningType; handle: 'left' | 'right' }) {
  const lines: [number, number, number, number][] = []
  if (opening === 'turn' || opening === 'turnTilt') {
    const hingeLeft = handle === 'right'
    const apexX = hingeLeft ? 2 : 42
    const farX = hingeLeft ? 42 : 2
    lines.push([farX, 2, apexX, 17], [farX, 32, apexX, 17])
  }
  if (opening === 'tilt' || opening === 'turnTilt') lines.push([2, 2, 22, 32], [42, 2, 22, 32])

  return (
    <svg className="op-icon" viewBox="0 0 44 34" width={44} height={34}>
      <rect x={1} y={1} width={42} height={32} fill="#fff" stroke="#8b98a5" />
      {lines.map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#4b5b6b" strokeWidth={1} />
      ))}
    </svg>
  )
}
