/**
 * Панель инструментов над чертежом.
 *
 * Действия над выделенным полем живут здесь, а не списком кнопок в боковой
 * панели: в CAD инструмент должен быть рядом с тем, к чему применяется.
 */
import type { CalcResult, Catalog, ProductInput, SceneNode } from '../core/types'
import { findNode, parentSplit, removeSplit, setFill, splitField } from '../core/scene'

interface Props {
  item: ProductInput
  calc: CalcResult
  catalog: Catalog
  selectedId: string | null
  onChange: (next: ProductInput) => void
  onSelect: (id: string | null) => void
  onOpenHardware: () => void
}

export function StageBar({ item, calc, catalog, selectedId, onChange, onSelect, onOpenHardware }: Props) {
  const system = catalog.systems.find((s) => s.id === item.systemId)
  const glazings = catalog.glazings.filter((g) => system?.glazingIds.includes(g.id))

  const node: SceneNode | null = selectedId ? findNode(item.root, selectedId) : null
  const field = node && node.kind === 'field' ? node : null
  const isSash = field?.fill.type === 'sash'
  const split = selectedId ? parentSplit(item.root, selectedId) : null

  const patchRoot = (root: SceneNode) => onChange({ ...item, root })

  return (
    <div className="stage-bar">
      <div className="group">
        {isSash ? (
          <>
            <button className="primary" onClick={onOpenHardware}>
              Фурнитура…
            </button>
            <button
              onClick={() =>
                field &&
                patchRoot(setFill(item.root, field.id, { type: 'glass', glazingId: field.fill.glazingId }))
              }
            >
              Убрать створку
            </button>
          </>
        ) : (
          <button className="primary" disabled={!field} onClick={onOpenHardware}>
            Вставить створку…
          </button>
        )}
      </div>

      <div className="sep" />

      <div className="group">
        <button disabled={!field} onClick={() => field && patchRoot(splitField(item.root, field.id, 'v'))}>
          Импост ↕
        </button>
        <button disabled={!field} onClick={() => field && patchRoot(splitField(item.root, field.id, 'h'))}>
          Импост ↔
        </button>
        <button
          className="danger"
          disabled={!split}
          onClick={() => {
            if (!split) return
            patchRoot(removeSplit(item.root, split.id))
            onSelect(null)
          }}
        >
          Удалить импост
        </button>
      </div>

      <div className="sep" />

      <div className="group">
        <select
          value={field?.fill.glazingId ?? ''}
          disabled={!field}
          title="Заполнение выделенного поля"
          onChange={(e) => field && patchRoot(setFill(item.root, field.id, { ...field.fill, glazingId: e.target.value }))}
        >
          <option value="">— без заполнения —</option>
          {glazings.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className={calc.issues.length ? 'status warn' : 'status'}>
        {calc.issues.length
          ? `Замечаний: ${calc.issues.length}`
          : field
            ? 'Поле выделено'
            : 'Кликните поле на чертеже'}
      </div>
    </div>
  )
}
