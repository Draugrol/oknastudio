/**
 * Условия применимости строки — колонка «Параметры» в IT Окна.
 * Строка считается, если выполнены все условия: [Цвет ручки = Белый] и т. п.
 */
import type { Catalog, Condition } from '../core/types'
import { SelectCell } from './grid'

export function conditionsText(conditions: Condition[] | undefined, catalog: Catalog): string {
  if (!conditions?.length) return ''
  return conditions
    .map((c) => {
      const param = catalog.params.find((p) => p.id === c.paramId)
      return `[${param?.name ?? c.paramId} ${c.op} ${c.value}]`
    })
    .join(' ')
}

export function ConditionsEditor({
  conditions,
  catalog,
  onChange,
  title,
}: {
  conditions: Condition[]
  catalog: Catalog
  onChange: (mutator: (list: Condition[]) => void) => void
  title: string
}) {
  const paramOptions = catalog.params.map((p) => ({ value: p.id, label: p.name }))

  return (
    <div className="conditions">
      <div className="row-toolbar">
        <span className="rt-title">{title}</span>
        <button
          disabled={!catalog.params.length}
          onClick={() =>
            onChange((list) => {
              const param = catalog.params[0]
              list.push({ paramId: param.id, op: '=', value: param.values[0]?.value ?? param.defaultValue })
            })
          }
        >
          + Условие
        </button>
      </div>
      <table className="grid edit">
        <thead>
          <tr>
            <th>Параметр</th>
            <th className="w-op">Оператор</th>
            <th className="w-base">Значение</th>
            <th className="w-check" />
          </tr>
        </thead>
        <tbody>
          {conditions.map((c, index) => {
            const param = catalog.params.find((p) => p.id === c.paramId)
            const valueOptions = (param?.values ?? [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((v) => ({ value: v.value, label: v.value }))
            return (
              <tr key={index}>
                <td>
                  <SelectCell
                    value={c.paramId}
                    options={paramOptions}
                    onChange={(v) =>
                      onChange((list) => {
                        const next = catalog.params.find((p) => p.id === v)
                        list[index].paramId = v
                        list[index].value = next?.values[0]?.value ?? next?.defaultValue ?? ''
                      })
                    }
                  />
                </td>
                <td>
                  <SelectCell
                    value={c.op}
                    options={[
                      { value: '=', label: '=' },
                      { value: '<>', label: '<>' },
                    ]}
                    onChange={(v) => onChange((list) => void (list[index].op = v as Condition['op']))}
                  />
                </td>
                <td>
                  <SelectCell
                    value={c.value}
                    options={valueOptions}
                    onChange={(v) => onChange((list) => void (list[index].value = v))}
                  />
                </td>
                <td>
                  <button className="link danger" onClick={() => onChange((list) => void list.splice(index, 1))}>
                    удалить
                  </button>
                </td>
              </tr>
            )
          })}
          {!conditions.length && (
            <tr>
              <td colSpan={4} className="muted center">
                Условий нет — строка считается всегда
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
