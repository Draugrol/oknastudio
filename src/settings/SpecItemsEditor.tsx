/**
 * Редактор «Спецификации» — общий для профиля, заполнения и изделия.
 * Колонки повторяют IT Окна: Артикул, Цвет, Кол, Вид расчёта, Размер, Коэфф., Шаг, Тэг.
 */
import { useState } from 'react'
import type { CalcBase, Catalog, MaterialKind, SpecItem } from '../core/types'
import { CheckCell, NumCell, RowToolbar, SelectCell, TextCell } from './grid'
import { ConditionsEditor, conditionsText } from './ConditionsEditor'
import { newId } from '../store/catalog'

export const BASE_OPTIONS: { value: CalcBase; label: string }[] = [
  { value: 'length', label: 'По длине' },
  { value: 'total', label: 'Всего' },
  { value: 'width', label: 'Ширина' },
  { value: 'height', label: 'Высота' },
  { value: 'perimeter', label: 'Периметр' },
  { value: 'area', label: 'Площадь' },
]

const COLOR_OPTIONS = [
  { value: 'asBase', label: 'По цвету изделия' },
  { value: 'none', label: 'Без цвета' },
]

/** Что даёт строка: размерность берётся из типа материала. */
const KIND_RESULT: Record<MaterialKind, string> = {
  profile: 'длина, м',
  sheet: 'лист, м²',
  piece: 'штуки',
  work: 'работа',
}

export function newSpecItem(materialId: string): SpecItem {
  return {
    id: newId('SI'),
    enabled: true,
    materialId,
    colorRule: 'asBase',
    count: 1,
    base: 'length',
    size: 0,
    coef: 1,
    step: 0,
    conditions: [],
  }
}

export function SpecItemsEditor({
  items,
  catalog,
  onChange,
  title,
}: {
  items: SpecItem[]
  catalog: Catalog
  onChange: (mutator: (list: SpecItem[]) => void) => void
  title?: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const materialOptions = catalog.materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))
  const selectedItem = items.find((i) => i.id === selected) ?? null

  const patch = (id: string, p: Partial<SpecItem>) =>
    onChange((list) => {
      const found = list.find((i) => i.id === id)
      if (found) Object.assign(found, p)
    })

  return (
    <div className="sub-grid">
      <RowToolbar
        title={title ?? 'Спецификация'}
        hasSelection={!!selected}
        onAdd={() =>
          onChange((list) => {
            const item = newSpecItem(catalog.materials[0]?.id ?? '')
            list.push(item)
          })
        }
        onCopy={() =>
          onChange((list) => {
            const source = list.find((i) => i.id === selected)
            if (source) list.push({ ...structuredClone(source), id: newId('SI') })
          })
        }
        onDelete={() =>
          onChange((list) => {
            const index = list.findIndex((i) => i.id === selected)
            if (index >= 0) list.splice(index, 1)
          })
        }
      />
      <p className="formula">
        Размер детали = Округл((База + Размер) × Коэфф., Шаг). Кол — количество на единицу базы.
        Длинновой / листовой / штучный определяется типом материала.
      </p>
      <table className="grid edit">
        <thead>
          <tr>
            <th className="w-check">Исп.</th>
            <th>Артикул</th>
            <th className="w-color">Цвет</th>
            <th className="w-num">Кол</th>
            <th className="w-base">Вид расчёта</th>
            <th className="w-num">Размер</th>
            <th className="w-num">Коэфф.</th>
            <th className="w-num">Шаг</th>
            <th className="w-dim">Считается в</th>
            <th className="w-params">Параметры</th>
            <th className="w-tag">Тэг</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={item.id === selected ? 'selected' : undefined}
              onClick={() => setSelected(item.id)} onFocusCapture={() => setSelected(item.id)}
            >
              <td><CheckCell value={item.enabled} onChange={(v) => patch(item.id, { enabled: v })} /></td>
              <td>
                <SelectCell
                  value={item.materialId}
                  options={materialOptions}
                  onChange={(v) => patch(item.id, { materialId: v })}
                />
              </td>
              <td>
                <SelectCell
                  value={item.colorRule}
                  options={COLOR_OPTIONS}
                  onChange={(v) => patch(item.id, { colorRule: v as SpecItem['colorRule'] })}
                />
              </td>
              <td><NumCell value={item.count} step={0.001} onChange={(v) => patch(item.id, { count: v })} /></td>
              <td>
                <SelectCell
                  value={item.base}
                  options={BASE_OPTIONS}
                  onChange={(v) => patch(item.id, { base: v as CalcBase })}
                />
              </td>
              <td><NumCell value={item.size} onChange={(v) => patch(item.id, { size: v })} /></td>
              <td><NumCell value={item.coef} step={0.001} onChange={(v) => patch(item.id, { coef: v })} /></td>
              <td><NumCell value={item.step} onChange={(v) => patch(item.id, { step: v })} /></td>
              <td className="muted">
                {KIND_RESULT[catalog.materials.find((m) => m.id === item.materialId)?.kind ?? 'piece']}
              </td>
              <td className="muted cond-text">{conditionsText(item.conditions, catalog) || '—'}</td>
              <td><TextCell value={item.tag ?? ''} onChange={(v) => patch(item.id, { tag: v })} /></td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={11} className="muted center">
                Строк нет
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {selectedItem && (
        <ConditionsEditor
          title={`Параметры строки «${catalog.materials.find((m) => m.id === selectedItem.materialId)?.name ?? ''}»`}
          conditions={selectedItem.conditions ?? []}
          catalog={catalog}
          onChange={(fn) =>
            onChange((list) => {
              const target = list.find((i) => i.id === selectedItem.id)
              if (!target) return
              target.conditions = target.conditions ?? []
              fn(target.conditions)
            })
          }
        />
      )}
    </div>
  )
}
