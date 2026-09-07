/**
 * Панель параметров: уровень изделия и уровень выделенного поля.
 * Списки берутся из настроек системы — недопустимые варианты не показываются.
 */
import { useState } from 'react'
import type { CalcResult, FieldFill, ProductInput } from '../core/types'
import { useCatalog } from '../store/catalog'
import { findNode, parentSplit, removeSplit, setFill, splitField } from '../core/scene'
import { HardwareDialog } from './HardwareDialog'

interface Props {
  item: ProductInput
  calc: CalcResult
  selectedId: string | null
  onChange: (next: ProductInput) => void
  onSelect: (id: string | null) => void
}

export function PropertiesPanel({ item, calc, selectedId, onChange, onSelect }: Props) {
  const { catalog } = useCatalog()
  const [hardwareOpen, setHardwareOpen] = useState(false)

  const system = catalog.systems.find((s) => s.id === item.systemId)!
  const glazings = catalog.glazings.filter((g) => system.glazingIds.includes(g.id))
  const productParams = catalog.params.filter(
    (p) => system.paramIds.includes(p.id) && p.level === 'product' && !p.hidden,
  )
  const sashParamDefs = catalog.params.filter(
    (p) => system.paramIds.includes(p.id) && p.level === 'sash' && !p.hidden,
  )

  const node = selectedId ? findNode(item.root, selectedId) : null
  const field = node && node.kind === 'field' ? node : null
  // Отдельная константа: сужение типа внутри обработчиков-замыканий не сохраняется.
  const sashFill = field && field.fill.type === 'sash' ? field.fill : null
  const split = selectedId ? parentSplit(item.root, selectedId) : null
  const contour = calc.contours.find((c) => c.fieldId === selectedId)
  const glazing = calc.glazings.find((g) => g.fieldId === selectedId)

  const patch = (p: Partial<ProductInput>) => onChange({ ...item, ...p })

  const changeSystem = (systemId: string) => {
    const next = catalog.systems.find((s) => s.id === systemId)!
    // Заполнения и фурнитура принадлежат системе: при смене приводим к допустимым.
    const fixFill = (fill: FieldFill): FieldFill => {
      const glazingId = !fill.glazingId || next.glazingIds.includes(fill.glazingId) ? fill.glazingId : next.glazingIds[0]
      if (fill.type === 'glass') return { type: 'glass', glazingId }
      const variant = next.hardwareVariantIds.includes(fill.hardwareVariantId)
        ? fill.hardwareVariantId
        : (catalog.hardware.find((h) => next.hardwareVariantIds.includes(h.id) && h.opening === fill.opening)?.id ??
          next.hardwareVariantIds[0] ??
          '')
      return { ...fill, glazingId, hardwareVariantId: variant }
    }
    const walk = (n: ProductInput['root']): ProductInput['root'] =>
      n.kind === 'field' ? { ...n, fill: fixFill(n.fill) } : { ...n, children: [walk(n.children[0]), walk(n.children[1])] }
    onChange({ ...item, systemId, root: walk(item.root) })
  }

  const setFieldFill = (fill: FieldFill) => {
    if (!selectedId) return
    onChange({ ...item, root: setFill(item.root, selectedId, fill) })
  }

  return (
    <div className="panel">
      <section>
        <h3>Изделие</h3>
        <label>
          Профильная система
          <select value={item.systemId} onChange={(e) => changeSystem(e.target.value)}>
            {catalog.systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Цвет
          <select value={item.colorId} onChange={(e) => patch({ colorId: e.target.value })}>
            {catalog.colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <label>
            Ширина, мм
            <input
              type="number"
              value={item.width}
              min={300}
              max={4000}
              onChange={(e) => patch({ width: clampInt(e.target.value, 300, 4000, item.width) })}
            />
          </label>
          <label>
            Высота, мм
            <input
              type="number"
              value={item.height}
              min={300}
              max={4000}
              onChange={(e) => patch({ height: clampInt(e.target.value, 300, 4000, item.height) })}
            />
          </label>
          <label>
            Кол-во
            <input
              type="number"
              value={item.qty}
              min={1}
              max={999}
              onChange={(e) => patch({ qty: clampInt(e.target.value, 1, 999, item.qty) })}
            />
          </label>
        </div>
        {productParams.map((p) => (
          <label key={p.id}>
            {p.name}
            <select
              value={item.params[p.id] ?? p.defaultValue}
              onChange={(e) => patch({ params: { ...item.params, [p.id]: e.target.value } })}
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
          </label>
        ))}
      </section>

      <section>
        <h3>Поле {field ? '' : '— не выбрано'}</h3>
        {!field && <p className="hint">Кликните по полю на чертеже, чтобы вставить створку или задать заполнение.</p>}
        {field && (
          <>
            <div className="btn-row">
              {sashFill ? (
                <>
                  <button className="primary" onClick={() => setHardwareOpen(true)}>
                    Фурнитура…
                  </button>
                  <button
                    className="danger"
                    onClick={() => setFieldFill({ type: 'glass', glazingId: sashFill.glazingId })}
                  >
                    Убрать створку
                  </button>
                </>
              ) : (
                <button className="primary" onClick={() => setHardwareOpen(true)}>
                  Вставить створку…
                </button>
              )}
            </div>

            <div className="btn-row">
              <button onClick={() => onChange({ ...item, root: splitField(item.root, field.id, 'v') })}>
                Импост вертикальный
              </button>
              <button onClick={() => onChange({ ...item, root: splitField(item.root, field.id, 'h') })}>
                Импост горизонтальный
              </button>
            </div>
            {split && (
              <div className="btn-row">
                <button
                  className="danger"
                  onClick={() => {
                    onChange({ ...item, root: removeSplit(item.root, split.id) })
                    onSelect(null)
                  }}
                >
                  Удалить импост
                </button>
              </div>
            )}

            <label>
              Заполнение
              <select
                value={field.fill.glazingId}
                onChange={(e) => setFieldFill({ ...field.fill, glazingId: e.target.value })}
              >
                <option value="">— без заполнения —</option>
                {glazings.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>

            {sashFill && (
              <>
                <label>
                  Сторона ручки
                  <select
                    value={sashFill.handle}
                    onChange={(e) => setFieldFill({ ...sashFill, handle: e.target.value as 'left' | 'right' })}
                  >
                    <option value="right">Справа (петли слева)</option>
                    <option value="left">Слева (петли справа)</option>
                  </select>
                </label>
                {sashParamDefs.map((p) => (
                  <label key={p.id}>
                    {p.name}
                    <select
                      value={sashFill.params?.[p.id] ?? p.defaultValue}
                      onChange={(e) =>
                        setFieldFill({ ...sashFill, params: { ...(sashFill.params ?? {}), [p.id]: e.target.value } })
                      }
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
                  </label>
                ))}
              </>
            )}

            {contour?.falz && (
              <dl className="facts">
                <div>
                  <dt>Створка</dt>
                  <dd>
                    {Math.round(contour.rect.w)} × {Math.round(contour.rect.h)} мм
                  </dd>
                </div>
                <div>
                  <dt>Фальц (ФШ×ФВ)</dt>
                  <dd>
                    {contour.falz.w} × {contour.falz.h} мм
                  </dd>
                </div>
                <div>
                  <dt>Масса створки</dt>
                  <dd>{(contour.massKg ?? 0).toFixed(1)} кг</dd>
                </div>
                <div>
                  <dt>Фурнитура</dt>
                  <dd>{catalog.hardware.find((h) => h.id === contour.hardwareVariantId)?.name ?? '—'}</dd>
                </div>
              </dl>
            )}
            <dl className="facts">
              <div>
                <dt>Стеклопакет</dt>
                <dd>{glazing ? `${glazing.size.w} × ${glazing.size.h} мм` : 'без заполнения'}</dd>
              </div>
              {glazing && (
                <div>
                  <dt>Площадь / масса</dt>
                  <dd>
                    {glazing.areaM2.toFixed(3)} м² / {glazing.massKg.toFixed(1)} кг
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}
      </section>

      {hardwareOpen && field && (
        <HardwareDialog
          item={item}
          fieldId={field.id}
          catalog={catalog}
          current={sashFill}
          onCancel={() => setHardwareOpen(false)}
          onApply={(fill) => {
            setFieldFill(fill)
            setHardwareOpen(false)
          }}
        />
      )}
    </div>
  )
}

function clampInt(raw: string, lo: number, hi: number, fallback: number) {
  const value = Number.parseInt(raw, 10)
  if (Number.isNaN(value)) return fallback
  return Math.min(hi, Math.max(lo, value))
}
