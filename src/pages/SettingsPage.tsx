/**
 * Справочники: редактируемые данные, из которых ядро выводит расчёт.
 * Верхние разделы повторяют ленту IT Окна: Цвета · Материалы · Заполнения ·
 * Фурнитура · Профили (профильные системы с деревом и вкладками).
 */
import { useRef, useState } from 'react'
import type { Catalog, MaterialKind, OpeningType, Param } from '../core/types'
import { useCatalog, newId } from '../store/catalog'
import { CheckCell, NumCell, RowToolbar, SelectCell, TextCell } from '../settings/grid'
import { ConditionsEditor, conditionsText } from '../settings/ConditionsEditor'
import { SystemEditor } from '../settings/SystemEditor'

const SECTIONS = ['Профили', 'Параметры', 'Материалы', 'Цвета', 'Заполнения', 'Фурнитура'] as const
type Section = (typeof SECTIONS)[number]

const KIND_OPTIONS: { value: MaterialKind; label: string }[] = [
  { value: 'profile', label: 'Длинновой' },
  { value: 'sheet', label: 'Листовой' },
  { value: 'piece', label: 'Штучный' },
  { value: 'work', label: 'Работа' },
]

const OPENING_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'turn', label: 'Поворотное' },
  { value: 'turnTilt', label: 'Поворотно-откидное' },
  { value: 'tilt', label: 'Откидное' },
  { value: 'fix', label: 'Глухое' },
]

export function SettingsPage() {
  const { catalog, update, replace, reset } = useCatalog()
  const [section, setSection] = useState<Section>('Профили')
  const [systemId, setSystemId] = useState<string>(catalog.systems[0]?.id ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  const system = catalog.systems.find((s) => s.id === systemId) ?? catalog.systems[0]

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `oknastudio-catalog-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Catalog
      if (!parsed?.systems?.length || !parsed?.materials?.length) throw new Error('нет систем или материалов')
      replace(parsed)
      setSystemId(parsed.systems[0].id)
    } catch (e) {
      alert(`Не удалось загрузить справочник: ${(e as Error).message}`)
    }
  }

  return (
    <div className="page settings">
      <header className="page-head">
        <h1>Справочники</h1>
        <div className="tabs">
          {SECTIONS.map((s) => (
            <button key={s} className={s === section ? 'tab active' : 'tab'} onClick={() => setSection(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <button onClick={exportJson}>Экспорт JSON</button>
          <button onClick={() => fileRef.current?.click()}>Импорт JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
          <button
            className="danger"
            onClick={() => {
              if (confirm('Вернуть все справочники к заводским значениям? Правки будут потеряны.')) {
                reset()
                setSystemId('')
              }
            }}
          >
            Сбросить к заводским
          </button>
        </div>
      </header>

      <p className="hint banner">
        Изменения сохраняются сразу и тут же пересчитывают все изделия в заказах.
        Стартовые цифры геометрии и цен требуют подтверждения технолога по узлам системы.
      </p>

      {section === 'Профили' && (
        <div className="systems">
          <aside className="tree">
            <RowToolbar
              title="Системы"
              hasSelection={!!system}
              onAdd={() =>
                update((draft) => {
                  const id = newId('SYS')
                  draft.systems.push({
                    id,
                    name: 'Новая система',
                    group: 'Без группы',
                    enabled: true,
                    buildFrom: 'inside',
                    paramIds: draft.params.map((p) => p.id),
                    contours: [],
                    profiles: [],
                    adjacencies: [],
                    joints: [],
                    fillings: [],
                    glazingIds: draft.glazings.map((g) => g.id),
                    hardwareVariantIds: draft.hardware.map((h) => h.id),
                    spec: [],
                  })
                  setSystemId(id)
                })
              }
              onCopy={() =>
                update((draft) => {
                  const src = draft.systems.find((s) => s.id === systemId)
                  if (!src) return
                  const copy = structuredClone(src)
                  copy.id = newId('SYS')
                  copy.name = `${src.name} (копия)`
                  draft.systems.push(copy)
                  setSystemId(copy.id)
                })
              }
              onDelete={() =>
                update((draft) => {
                  draft.systems = draft.systems.filter((s) => s.id !== systemId)
                  setSystemId(draft.systems[0]?.id ?? '')
                })
              }
            />
            {groupBy(catalog.systems, (s) => s.group).map(([group, list]) => (
              <div key={group} className="tree-group">
                <div className="tree-group-title">{group}</div>
                {list.map((s) => (
                  <button
                    key={s.id}
                    className={s.id === system?.id ? 'tree-item active' : 'tree-item'}
                    onClick={() => setSystemId(s.id)}
                  >
                    {s.name}
                    {!s.enabled && <span className="muted"> (выкл.)</span>}
                  </button>
                ))}
              </div>
            ))}
          </aside>
          <div className="sys-pane">
            {system ? (
              <SystemEditor system={system} catalog={catalog} update={update} />
            ) : (
              <p className="muted">Систем нет. Добавьте первую.</p>
            )}
          </div>
        </div>
      )}

      {section === 'Параметры' && <ParamsEditor catalog={catalog} update={update} />}
      {section === 'Материалы' && <MaterialsEditor catalog={catalog} update={update} />}
      {section === 'Цвета' && <ColorsEditor catalog={catalog} update={update} />}
      {section === 'Заполнения' && <GlazingsEditor catalog={catalog} update={update} />}
      {section === 'Фурнитура' && <HardwareEditor catalog={catalog} update={update} />}
    </div>
  )
}

type Update = (mutator: (draft: Catalog) => void) => void

/* ───────────────────────────── Параметры ───────────────────────────── */

function ParamsEditor({ catalog, update }: { catalog: Catalog; update: Update }) {
  const [selected, setSelected] = useState<string>(catalog.params[0]?.id ?? '')
  const param = catalog.params.find((p) => p.id === selected) ?? catalog.params[0]

  const usage = (id: string) => {
    const inSpec = (list: { conditions?: { paramId: string }[] }[]) =>
      list.some((i) => i.conditions?.some((c) => c.paramId === id))
    return (
      catalog.systems.some(
        (sys) =>
          inSpec(sys.spec) ||
          sys.profiles.some((pr) => inSpec(pr.spec)) ||
          sys.fillings.some((f) => inSpec(f.spec)),
      ) || catalog.hardware.some((h) => h.ranges.some((r) => inSpec(r.items)))
    )
  }

  return (
    <section>
      <RowToolbar
        title="Параметры"
        hasSelection={!!param}
        onAdd={() =>
          update((draft) => {
            const id = newId('PAR')
            draft.params.push({
              id,
              name: 'Новый параметр',
              hidden: false,
              level: 'sash',
              defaultValue: 'Значение 1',
              values: [{ id: newId('PV'), value: 'Значение 1', order: 1 }],
            })
            draft.systems.forEach((sys) => sys.paramIds.push(id))
            setSelected(id)
          })
        }
        onCopy={() =>
          update((draft) => {
            const src = draft.params.find((x) => x.id === param?.id)
            if (!src) return
            const copy = structuredClone(src)
            copy.id = newId('PAR')
            copy.name = `${src.name} (копия)`
            copy.values = copy.values.map((v) => ({ ...v, id: newId('PV') }))
            draft.params.push(copy)
            setSelected(copy.id)
          })
        }
        onDelete={() => {
          if (param && usage(param.id)) {
            alert('Параметр используется в условиях спецификации или фурнитуры — сначала уберите ссылки на него.')
            return
          }
          update((draft) => {
            draft.params = draft.params.filter((x) => x.id !== param?.id)
            draft.systems.forEach((sys) => (sys.paramIds = sys.paramIds.filter((x) => x !== param?.id)))
            setSelected(draft.params[0]?.id ?? '')
          })
        }}
      />
      <table className="grid edit">
        <thead>
          <tr>
            <th>Наименование</th>
            <th className="w-base">Уровень</th>
            <th className="w-check">Скрытый</th>
            <th className="w-base">По умолчанию</th>
            <th className="w-num">Значений</th>
          </tr>
        </thead>
        <tbody>
          {catalog.params.map((row) => {
            const set = (patch: Partial<Param>) =>
              update((draft) => Object.assign(draft.params.find((x) => x.id === row.id)!, patch))
            return (
              <tr key={row.id} className={row.id === param?.id ? 'selected' : undefined} onClick={() => setSelected(row.id)} onFocusCapture={() => setSelected(row.id)}>
                <td><TextCell value={row.name} onChange={(v) => set({ name: v })} /></td>
                <td>
                  <SelectCell
                    value={row.level}
                    options={[
                      { value: 'sash', label: 'Створка' },
                      { value: 'product', label: 'Изделие' },
                    ]}
                    onChange={(v) => set({ level: v as Param['level'] })}
                  />
                </td>
                <td><CheckCell value={row.hidden} onChange={(v) => set({ hidden: v })} /></td>
                <td>
                  <SelectCell
                    value={row.defaultValue}
                    options={row.values.map((v) => ({ value: v.value, label: v.value }))}
                    onChange={(v) => set({ defaultValue: v })}
                  />
                </td>
                <td className="num muted">{row.values.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {param && (
        <div className="sub-grid">
          <RowToolbar
            title={`Значения параметра «${param.name}»`}
            onAdd={() =>
              update((draft) => {
                const target = draft.params.find((x) => x.id === param.id)!
                target.values.push({ id: newId('PV'), value: `Значение ${target.values.length + 1}`, order: target.values.length + 1 })
              })
            }
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-num">Порядок</th>
                <th>Значение</th>
                <th className="w-check" />
              </tr>
            </thead>
            <tbody>
              {param.values
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((v) => (
                  <tr key={v.id}>
                    <td>
                      <NumCell
                        value={v.order}
                        onChange={(n) =>
                          update((draft) => void (draft.params.find((x) => x.id === param.id)!.values.find((y) => y.id === v.id)!.order = n))
                        }
                      />
                    </td>
                    <td>
                      <TextCell
                        value={v.value}
                        onChange={(n) =>
                          update((draft) => {
                            const target = draft.params.find((x) => x.id === param.id)!
                            const old = target.values.find((y) => y.id === v.id)!.value
                            target.values.find((y) => y.id === v.id)!.value = n
                            if (target.defaultValue === old) target.defaultValue = n
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="link danger"
                        onClick={() =>
                          update((draft) => {
                            const target = draft.params.find((x) => x.id === param.id)!
                            target.values = target.values.filter((y) => y.id !== v.id)
                          })
                        }
                      >
                        удалить
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">
        Параметры задаются в конструкторе (у изделия или у створки), а строки спецификации и
        комплектов фурнитуры отбираются условиями вида [Цвет ручки = Белый].
      </p>
    </section>
  )
}

/* ───────────────────────────── Материалы ───────────────────────────── */

function MaterialsEditor({ catalog, update }: { catalog: Catalog; update: Update }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [group, setGroup] = useState('')
  const groups = [...new Set(catalog.materials.map((m) => m.group))]
  const rows = catalog.materials.filter((m) => (group ? m.group === group : true))

  const usage = (id: string) =>
    catalog.systems.some(
      (s) =>
        s.profiles.some((p) => p.materialId === id || p.spec.some((i) => i.materialId === id)) ||
        s.fillings.some((f) => f.spec.some((i) => i.materialId === id)) ||
        s.spec.some((i) => i.materialId === id),
    ) ||
    catalog.glazings.some((g) => g.elements.some((e) => e.materialId === id)) ||
    catalog.hardware.some((h) => h.ranges.some((r) => r.items.some((i) => i.materialId === id)))

  return (
    <section>
      <RowToolbar
        title="Материалы"
        hasSelection={!!selected}
        extra={
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Все группы</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        }
        onAdd={() =>
          update((draft) =>
            draft.materials.push({
              id: newId('M'),
              code: '',
              name: 'Новый материал',
              kind: 'profile',
              unit: 'м',
              price: 0,
              group: group || 'Без группы',
              colored: false,
              geometry: { faceWidth: 0, depth: 0, massPerMeter: 0 },
            }),
          )
        }
        onCopy={() =>
          update((draft) => {
            const src = draft.materials.find((m) => m.id === selected)
            if (src) draft.materials.push({ ...structuredClone(src), id: newId('M'), name: `${src.name} (копия)` })
          })
        }
        onDelete={() => {
          if (selected && usage(selected)) {
            alert('Материал используется в системах, заполнениях или фурнитуре — сначала уберите ссылки на него.')
            return
          }
          update((draft) => void (draft.materials = draft.materials.filter((m) => m.id !== selected)))
        }}
      />
      <table className="grid edit wide">
        <thead>
          <tr>
            <th className="w-code">Артикул</th>
            <th>Наименование</th>
            <th className="w-base">Группа</th>
            <th className="w-base">Тип</th>
            <th className="w-unit">Ед.</th>
            <th className="w-num">Цена</th>
            <th className="w-check">Цвет</th>
            <th className="w-num">Ширина в плане</th>
            <th className="w-num">Глубина</th>
            <th className="w-num">кг/м</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const set = (patch: Partial<typeof m>) =>
              update((draft) => Object.assign(draft.materials.find((x) => x.id === m.id)!, patch))
            const setGeom = (patch: Partial<NonNullable<typeof m.geometry>>) =>
              update((draft) => {
                const target = draft.materials.find((x) => x.id === m.id)!
                target.geometry = { faceWidth: 0, depth: 0, massPerMeter: 0, ...target.geometry, ...patch }
              })
            return (
              <tr key={m.id} className={m.id === selected ? 'selected' : undefined} onClick={() => setSelected(m.id)} onFocusCapture={() => setSelected(m.id)}>
                <td><TextCell value={m.code} onChange={(v) => set({ code: v })} /></td>
                <td><TextCell value={m.name} onChange={(v) => set({ name: v })} /></td>
                <td><TextCell value={m.group} onChange={(v) => set({ group: v })} /></td>
                <td><SelectCell value={m.kind} options={KIND_OPTIONS} onChange={(v) => set({ kind: v as MaterialKind })} /></td>
                <td><TextCell value={m.unit} onChange={(v) => set({ unit: v })} /></td>
                <td><NumCell value={m.price} step={0.01} onChange={(v) => set({ price: v })} /></td>
                <td><CheckCell value={!!m.colored} onChange={(v) => set({ colored: v })} /></td>
                <td><NumCell value={m.geometry?.faceWidth ?? 0} step={0.1} onChange={(v) => setGeom({ faceWidth: v })} /></td>
                <td><NumCell value={m.geometry?.depth ?? 0} step={0.1} onChange={(v) => setGeom({ depth: v })} /></td>
                <td><NumCell value={m.geometry?.massPerMeter ?? 0} step={0.01} onChange={(v) => setGeom({ massPerMeter: v })} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="hint">
        Ширина в плане — расстояние от наружного края профиля до светового проёма; наплав и фальц задаются
        в системе («Прилегания» и «Заполнения»), а не у материала.
      </p>
    </section>
  )
}

/* ─────────────────────────────── Цвета ─────────────────────────────── */

function ColorsEditor({ catalog, update }: { catalog: Catalog; update: Update }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <section>
      <RowToolbar
        title="Цвета"
        hasSelection={!!selected}
        onAdd={() =>
          update((draft) =>
            draft.colors.push({
              id: newId('COL'),
              name: 'Новый цвет',
              markup: 1,
              render: { outer: '#e8ecf0', inner: '#e8ecf0', edge: '#9aa6b2' },
            }),
          )
        }
        onCopy={() =>
          update((draft) => {
            const src = draft.colors.find((c) => c.id === selected)
            if (src) draft.colors.push({ ...structuredClone(src), id: newId('COL'), name: `${src.name} (копия)` })
          })
        }
        onDelete={() => {
          if (catalog.colors.length <= 1) {
            alert('Должен остаться хотя бы один цвет.')
            return
          }
          update((draft) => void (draft.colors = draft.colors.filter((c) => c.id !== selected)))
        }}
      />
      <table className="grid edit">
        <thead>
          <tr>
            <th>Наименование</th>
            <th className="w-num">Коэффициент цены</th>
            <th className="w-color">Снаружи</th>
            <th className="w-color">Изнутри</th>
            <th className="w-color">Кромка</th>
          </tr>
        </thead>
        <tbody>
          {catalog.colors.map((c) => {
            const set = (patch: Partial<typeof c>) =>
              update((draft) => Object.assign(draft.colors.find((x) => x.id === c.id)!, patch))
            const setRender = (patch: Partial<typeof c.render>) =>
              update((draft) => Object.assign(draft.colors.find((x) => x.id === c.id)!.render, patch))
            return (
              <tr key={c.id} className={c.id === selected ? 'selected' : undefined} onClick={() => setSelected(c.id)} onFocusCapture={() => setSelected(c.id)}>
                <td><TextCell value={c.name} onChange={(v) => set({ name: v })} /></td>
                <td><NumCell value={c.markup} step={0.01} min={0} onChange={(v) => set({ markup: v })} /></td>
                <td><input className="cell color" type="color" value={c.render.outer} onChange={(e) => setRender({ outer: e.target.value })} /></td>
                <td><input className="cell color" type="color" value={c.render.inner} onChange={(e) => setRender({ inner: e.target.value })} /></td>
                <td><input className="cell color" type="color" value={c.render.edge} onChange={(e) => setRender({ edge: e.target.value })} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="hint">Коэффициент умножает цену материалов, отмеченных признаком «Цвет».</p>
    </section>
  )
}

/* ──────────────────────────── Заполнения ──────────────────────────── */

function GlazingsEditor({ catalog, update }: { catalog: Catalog; update: Update }) {
  const [selected, setSelected] = useState<string>(catalog.glazings[0]?.id ?? '')
  const glazing = catalog.glazings.find((g) => g.id === selected) ?? catalog.glazings[0]
  const materialOptions = catalog.materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))

  return (
    <section>
      <RowToolbar
        title="Стеклопакеты"
        hasSelection={!!glazing}
        onAdd={() =>
          update((draft) => {
            const id = newId('GL')
            draft.glazings.push({
              id,
              name: 'Новый стеклопакет',
              elements: [],
              applicability: { minW: 200, maxW: 2000, minH: 200, maxH: 2500, maxArea: 4 },
            })
            setSelected(id)
          })
        }
        onCopy={() =>
          update((draft) => {
            const src = draft.glazings.find((g) => g.id === glazing?.id)
            if (!src) return
            const copy = structuredClone(src)
            copy.id = newId('GL')
            copy.name = `${src.name} (копия)`
            copy.elements = copy.elements.map((e) => ({ ...e, id: newId('GE') }))
            draft.glazings.push(copy)
            setSelected(copy.id)
          })
        }
        onDelete={() =>
          update((draft) => {
            draft.glazings = draft.glazings.filter((g) => g.id !== glazing?.id)
            draft.systems.forEach((s) => (s.glazingIds = s.glazingIds.filter((x) => x !== glazing?.id)))
            setSelected(draft.glazings[0]?.id ?? '')
          })
        }
      />
      <table className="grid edit">
        <thead>
          <tr>
            <th>Наименование</th>
            <th className="w-num">Толщина</th>
            <th className="w-num">Ш min</th>
            <th className="w-num">Ш max</th>
            <th className="w-num">В min</th>
            <th className="w-num">В max</th>
            <th className="w-num">S max, м²</th>
          </tr>
        </thead>
        <tbody>
          {catalog.glazings.map((g) => {
            const set = (patch: Partial<typeof g.applicability>) =>
              update((draft) => Object.assign(draft.glazings.find((x) => x.id === g.id)!.applicability, patch))
            return (
              <tr key={g.id} className={g.id === glazing?.id ? 'selected' : undefined} onClick={() => setSelected(g.id)} onFocusCapture={() => setSelected(g.id)}>
                <td>
                  <TextCell
                    value={g.name}
                    onChange={(v) => update((draft) => void (draft.glazings.find((x) => x.id === g.id)!.name = v))}
                  />
                </td>
                <td className="num muted">{g.elements.reduce((a, e) => a + e.thickness, 0)} мм</td>
                <td><NumCell value={g.applicability.minW} onChange={(v) => set({ minW: v })} /></td>
                <td><NumCell value={g.applicability.maxW} onChange={(v) => set({ maxW: v })} /></td>
                <td><NumCell value={g.applicability.minH} onChange={(v) => set({ minH: v })} /></td>
                <td><NumCell value={g.applicability.maxH} onChange={(v) => set({ maxH: v })} /></td>
                <td><NumCell value={g.applicability.maxArea} step={0.1} onChange={(v) => set({ maxArea: v })} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {glazing && (
        <div className="sub-grid">
          <RowToolbar
            title={`Состав «${glazing.name}»`}
            hasSelection
            onAdd={() =>
              update((draft) =>
                draft.glazings
                  .find((g) => g.id === glazing.id)!
                  .elements.push({
                    id: newId('GE'),
                    name: 'Стекло 4 мм',
                    thickness: 4,
                    mass: 10,
                    materialId: materialOptions[0]?.value ?? '',
                    by: 'area',
                  }),
              )
            }
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Материал</th>
                <th className="w-num">Толщина</th>
                <th className="w-num">Масса</th>
                <th className="w-base">Считать по</th>
                <th className="w-check" />
              </tr>
            </thead>
            <tbody>
              {glazing.elements.map((el) => {
                const set = (patch: Partial<typeof el>) =>
                  update((draft) =>
                    Object.assign(
                      draft.glazings.find((g) => g.id === glazing.id)!.elements.find((x) => x.id === el.id)!,
                      patch,
                    ),
                  )
                return (
                  <tr key={el.id}>
                    <td><TextCell value={el.name} onChange={(v) => set({ name: v })} /></td>
                    <td><SelectCell value={el.materialId} options={materialOptions} onChange={(v) => set({ materialId: v })} /></td>
                    <td><NumCell value={el.thickness} step={0.1} onChange={(v) => set({ thickness: v })} /></td>
                    <td><NumCell value={el.mass} step={0.01} onChange={(v) => set({ mass: v })} /></td>
                    <td>
                      <SelectCell
                        value={el.by}
                        options={[
                          { value: 'area', label: 'Площади (кг/м²)' },
                          { value: 'perimeter', label: 'Периметру (кг/м)' },
                        ]}
                        onChange={(v) => set({ by: v as 'area' | 'perimeter' })}
                      />
                    </td>
                    <td>
                      <button
                        className="link danger"
                        onClick={() =>
                          update((draft) => {
                            const target = draft.glazings.find((g) => g.id === glazing.id)!
                            target.elements = target.elements.filter((x) => x.id !== el.id)
                          })
                        }
                      >
                        удалить
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ───────────────────────────── Фурнитура ───────────────────────────── */

function HardwareEditor({ catalog, update }: { catalog: Catalog; update: Update }) {
  const [variantId, setVariantId] = useState<string>(catalog.hardware[0]?.id ?? '')
  const [rangeId, setRangeId] = useState<string>(catalog.hardware[0]?.ranges[0]?.id ?? '')
  const [itemId, setItemId] = useState<string>('')
  const variant = catalog.hardware.find((h) => h.id === variantId) ?? catalog.hardware[0]
  const range = variant?.ranges.find((r) => r.id === rangeId) ?? variant?.ranges[0]
  const item = range?.items.find((i) => i.id === itemId) ?? null
  const materialOptions = catalog.materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))

  const mutateVariant = (fn: (v: NonNullable<typeof variant>) => void) =>
    update((draft) => {
      const found = draft.hardware.find((h) => h.id === variant?.id)
      if (found) fn(found)
    })

  return (
    <section>
      <RowToolbar
        title="Варианты комплектации"
        hasSelection={!!variant}
        onAdd={() =>
          update((draft) => {
            const id = newId('HW')
            draft.hardware.push({
              id,
              brand: '',
              name: 'Новый вариант',
              opening: 'turn',
              maxSashMass: 80,
              maxFw: 900,
              maxFh: 1800,
              ranges: [],
            })
            setVariantId(id)
          })
        }
        onCopy={() =>
          update((draft) => {
            const src = draft.hardware.find((h) => h.id === variant?.id)
            if (!src) return
            const copy = structuredClone(src)
            copy.id = newId('HW')
            copy.name = `${src.name} (копия)`
            copy.ranges = copy.ranges.map((r) => ({ ...r, id: newId('HR'), items: r.items.map((i) => ({ ...i, id: newId('HI') })) }))
            draft.hardware.push(copy)
            setVariantId(copy.id)
          })
        }
        onDelete={() =>
          update((draft) => {
            draft.hardware = draft.hardware.filter((h) => h.id !== variant?.id)
            draft.systems.forEach(
              (s) => (s.hardwareVariantIds = s.hardwareVariantIds.filter((x) => x !== variant?.id)),
            )
            setVariantId(draft.hardware[0]?.id ?? '')
          })
        }
      />
      <table className="grid edit">
        <thead>
          <tr>
            <th className="w-code">Фурнитура</th>
            <th>Комплектация</th>
            <th className="w-base">Открывание</th>
            <th className="w-num">Макс. ФШ</th>
            <th className="w-num">Макс. ФВ</th>
            <th className="w-num">Макс. масса, кг</th>
            <th className="w-num">Диапазонов</th>
          </tr>
        </thead>
        <tbody>
          {catalog.hardware.map((h) => {
            const set = (patch: Partial<typeof h>) =>
              update((draft) => Object.assign(draft.hardware.find((x) => x.id === h.id)!, patch))
            return (
              <tr key={h.id} className={h.id === variant?.id ? 'selected' : undefined} onClick={() => setVariantId(h.id)} onFocusCapture={() => setVariantId(h.id)}>
                <td><TextCell value={h.brand} placeholder="MACO" onChange={(v) => set({ brand: v })} /></td>
                <td><TextCell value={h.name} onChange={(v) => set({ name: v })} /></td>
                <td><SelectCell value={h.opening} options={OPENING_OPTIONS} onChange={(v) => set({ opening: v as OpeningType })} /></td>
                <td><NumCell value={h.maxFw} onChange={(v) => set({ maxFw: v })} /></td>
                <td><NumCell value={h.maxFh} onChange={(v) => set({ maxFh: v })} /></td>
                <td><NumCell value={h.maxSashMass} onChange={(v) => set({ maxSashMass: v })} /></td>
                <td className="num muted">{h.ranges.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {variant && (
        <div className="sub-grid">
          <RowToolbar
            title={`Диапазоны фальца «${variant.name}»`}
            hasSelection={!!range}
            onAdd={() =>
              mutateVariant((v) => {
                const id = newId('HR')
                v.ranges.push({ id, fw: [300, 900], fh: [400, 1200], items: [] })
                setRangeId(id)
              })
            }
            onCopy={() =>
              mutateVariant((v) => {
                const src = v.ranges.find((r) => r.id === range?.id)
                if (!src) return
                const copy = structuredClone(src)
                copy.id = newId('HR')
                copy.items = copy.items.map((i) => ({ ...i, id: newId('HI') }))
                v.ranges.push(copy)
                setRangeId(copy.id)
              })
            }
            onDelete={() =>
              mutateVariant((v) => {
                v.ranges = v.ranges.filter((r) => r.id !== range?.id)
                setRangeId(v.ranges[0]?.id ?? '')
              })
            }
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-num">ФШ от</th>
                <th className="w-num">ФШ до</th>
                <th className="w-num">ФВ от</th>
                <th className="w-num">ФВ до</th>
                <th>Состав</th>
              </tr>
            </thead>
            <tbody>
              {variant.ranges.map((r) => {
                const setRange = (patch: { fw?: [number, number]; fh?: [number, number] }) =>
                  mutateVariant((v) => Object.assign(v.ranges.find((x) => x.id === r.id)!, patch))
                return (
                  <tr key={r.id} className={r.id === range?.id ? 'selected' : undefined} onClick={() => setRangeId(r.id)} onFocusCapture={() => setRangeId(r.id)}>
                    <td><NumCell value={r.fw[0]} onChange={(v) => setRange({ fw: [v, r.fw[1]] })} /></td>
                    <td><NumCell value={r.fw[1]} onChange={(v) => setRange({ fw: [r.fw[0], v] })} /></td>
                    <td><NumCell value={r.fh[0]} onChange={(v) => setRange({ fh: [v, r.fh[1]] })} /></td>
                    <td><NumCell value={r.fh[1]} onChange={(v) => setRange({ fh: [r.fh[0], v] })} /></td>
                    <td className="muted">
                      {r.items
                        .map((i) => `${catalog.materials.find((m) => m.id === i.materialId)?.name ?? i.materialId} ×${i.qty}`)
                        .join(', ') || '— пусто'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {range && (
            <>
              <RowToolbar
                title="Состав диапазона"
                onAdd={() =>
                  mutateVariant((v) =>
                    v.ranges
                      .find((r) => r.id === range.id)!
                      .items.push({ id: newId('HI'), materialId: materialOptions[0]?.value ?? '', qty: 1, conditions: [] }),
                  )
                }
              />
              <table className="grid edit">
                <thead>
                  <tr>
                    <th>Материал</th>
                    <th className="w-num">Кол-во</th>
                    <th className="w-params">Параметры</th>
                    <th className="w-check" />
                  </tr>
                </thead>
                <tbody>
                  {range.items.map((it) => (
                    <tr
                      key={it.id}
                      className={it.id === itemId ? 'selected' : undefined}
                      onClick={() => setItemId(it.id)} onFocusCapture={() => setItemId(it.id)}
                    >
                      <td>
                        <SelectCell
                          value={it.materialId}
                          options={materialOptions}
                          onChange={(v) =>
                            mutateVariant((variantDraft) => {
                              variantDraft.ranges.find((r) => r.id === range.id)!.items.find((x) => x.id === it.id)!.materialId = v
                            })
                          }
                        />
                      </td>
                      <td>
                        <NumCell
                          value={it.qty}
                          step={0.1}
                          onChange={(v) =>
                            mutateVariant((variantDraft) => {
                              variantDraft.ranges.find((r) => r.id === range.id)!.items.find((x) => x.id === it.id)!.qty = v
                            })
                          }
                        />
                      </td>
                      <td className="muted cond-text">{conditionsText(it.conditions, catalog) || '—'}</td>
                      <td>
                        <button
                          className="link danger"
                          onClick={() =>
                            mutateVariant((variantDraft) => {
                              const target = variantDraft.ranges.find((r) => r.id === range.id)!
                              target.items = target.items.filter((x) => x.id !== it.id)
                            })
                          }
                        >
                          удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {item && (
                <ConditionsEditor
                  title={`Параметры позиции «${catalog.materials.find((m) => m.id === item.materialId)?.name ?? ''}»`}
                  conditions={item.conditions ?? []}
                  catalog={catalog}
                  onChange={(fn) =>
                    mutateVariant((variantDraft) => {
                      const target = variantDraft.ranges.find((r) => r.id === range.id)!.items.find((x) => x.id === item.id)!
                      target.conditions = target.conditions ?? []
                      fn(target.conditions)
                    })
                  }
                />
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}

function groupBy<T>(list: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of list) {
    const k = key(item)
    map.set(k, [...(map.get(k) ?? []), item])
  }
  return [...map.entries()]
}
