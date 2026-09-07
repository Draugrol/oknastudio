/**
 * Настройки профильной системы — структура вкладок как в IT Окна:
 * Общие · Параметры · Контура · Профили · Прилегания · Соединения · Заполнения · Фурнитура.
 */
import { useState } from 'react'
import type { Catalog, ProfileRole, ProfileSystem, SpecItem } from '../core/types'
import { CheckCell, NumCell, RowToolbar, SelectCell, TextCell } from './grid'
import { SpecItemsEditor, newSpecItem } from './SpecItemsEditor'
import { newId } from '../store/catalog'
import { roleTitle } from '../core/geometry'

const TABS = ['Общие', 'Параметры', 'Контура', 'Профили', 'Прилегания', 'Соединения', 'Заполнения', 'Фурнитура'] as const
type Tab = (typeof TABS)[number]

const ROLES: ProfileRole[] = ['frame', 'sash', 'impost', 'shtulp', 'bead', 'reinforcement', 'none']
const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: roleTitle(r) }))

export function SystemEditor({
  system,
  catalog,
  update,
}: {
  system: ProfileSystem
  catalog: Catalog
  update: (mutator: (draft: Catalog) => void) => void
}) {
  const [tab, setTab] = useState<Tab>('Общие')
  const [profileId, setProfileId] = useState<string | null>(system.profiles[0]?.id ?? null)
  const [fillingId, setFillingId] = useState<string | null>(system.fillings[0]?.id ?? null)
  const [selected, setSelected] = useState<Record<string, string | null>>({})

  const mutate = (fn: (s: ProfileSystem) => void) =>
    update((draft) => {
      const found = draft.systems.find((s) => s.id === system.id)
      if (found) fn(found)
    })

  const profileOptions = system.profiles.map((p) => ({ value: p.id, label: p.name }))
  const fillingOptions = system.fillings.map((f) => ({ value: f.id, label: f.name }))
  const materialOptions = catalog.materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))
  const pick = (key: string) => selected[key] ?? null
  const setPick = (key: string, id: string | null) => setSelected((s) => ({ ...s, [key]: id }))

  const profile = system.profiles.find((p) => p.id === profileId) ?? system.profiles[0]
  const filling = system.fillings.find((f) => f.id === fillingId) ?? system.fillings[0]

  return (
    <div className="sys-editor">
      <div className="tabs sub">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Общие' && (
        <section className="card">
          <div className="form-grid">
            <label>
              Наименование
              <input value={system.name} onChange={(e) => mutate((s) => void (s.name = e.target.value))} />
            </label>
            <label>
              Группа (папка в дереве)
              <input value={system.group} onChange={(e) => mutate((s) => void (s.group = e.target.value))} />
            </label>
            <label>
              Вид построения
              <select
                value={system.buildFrom}
                onChange={(e) => mutate((s) => void (s.buildFrom = e.target.value as ProfileSystem['buildFrom']))}
              >
                <option value="inside">Изнутри</option>
                <option value="outside">Снаружи</option>
              </select>
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={system.enabled}
                onChange={(e) => mutate((s) => void (s.enabled = e.target.checked))}
              />
              Система используется
            </label>
          </div>
          <SpecItemsEditor
            title="Спецификация изделия (сварка, сборка, упаковка)"
            items={system.spec}
            catalog={catalog}
            onChange={(fn) => mutate((s) => fn(s.spec))}
          />
        </section>
      )}

      {tab === 'Параметры' && (
        <section className="card">
          <h3>Параметры, применимые к системе</h3>
          <div className="check-list">
            {catalog.params.map((param) => (
              <label key={param.id} className="check-line">
                <input
                  type="checkbox"
                  checked={system.paramIds.includes(param.id)}
                  onChange={(e) =>
                    mutate((s) => {
                      s.paramIds = e.target.checked
                        ? [...s.paramIds, param.id]
                        : s.paramIds.filter((x) => x !== param.id)
                    })
                  }
                />
                {param.name}
                <span className="muted">
                  {' '}
                  — {param.level === 'sash' ? 'створка' : 'изделие'}, по умолчанию «{param.defaultValue}»
                  {param.hidden ? ', скрытый' : ''}
                </span>
              </label>
            ))}
            {!catalog.params.length && <p className="muted">Параметров нет — заведите их в разделе «Параметры».</p>}
          </div>
          <p className="hint">
            Сами параметры и их значения заводятся в разделе «Параметры»; здесь отмечается,
            какие из них доступны в этой системе. На параметры ссылаются условия строк
            спецификации и комплектов фурнитуры.
          </p>
        </section>
      )}

      {tab === 'Контура' && (
        <section>
          <RowToolbar
            title="Контура: профиль каждой стороны и разделители"
            hasSelection={!!pick('contour')}
            onAdd={() =>
              mutate((s) =>
                s.contours.push({
                  id: newId('CT'),
                  name: 'Новый контур',
                  enabled: true,
                  isFrame: false,
                  isSash: false,
                  bottom: s.profiles[0]?.id ?? '',
                  left: s.profiles[0]?.id ?? '',
                  top: s.profiles[0]?.id ?? '',
                  right: s.profiles[0]?.id ?? '',
                  dividerH: s.profiles[0]?.id ?? '',
                  dividerV: s.profiles[0]?.id ?? '',
                  fillingId: s.fillings[0]?.id ?? '',
                }),
              )
            }
            onCopy={() =>
              mutate((s) => {
                const src = s.contours.find((c) => c.id === pick('contour'))
                if (src) s.contours.push({ ...structuredClone(src), id: newId('CT'), name: `${src.name} (копия)` })
              })
            }
            onDelete={() => mutate((s) => void (s.contours = s.contours.filter((c) => c.id !== pick('contour'))))}
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-check">Исп.</th>
                <th>Наименование</th>
                <th className="w-check">Рама</th>
                <th className="w-check">Створка</th>
                <th>Низ</th>
                <th>Лево</th>
                <th>Верх</th>
                <th>Право</th>
                <th>Разделитель ↕</th>
                <th>Разделитель ↔</th>
                <th>Заполнение</th>
              </tr>
            </thead>
            <tbody>
              {system.contours.map((c) => {
                const set = (p: Partial<typeof c>) =>
                  mutate((s) => Object.assign(s.contours.find((x) => x.id === c.id)!, p))
                return (
                  <tr key={c.id} className={c.id === pick('contour') ? 'selected' : undefined} onClick={() => setPick('contour', c.id)} onFocusCapture={() => setPick('contour', c.id)}>
                    <td><CheckCell value={c.enabled} onChange={(v) => set({ enabled: v })} /></td>
                    <td><TextCell value={c.name} onChange={(v) => set({ name: v })} /></td>
                    <td><CheckCell value={c.isFrame} onChange={(v) => set({ isFrame: v })} /></td>
                    <td><CheckCell value={c.isSash} onChange={(v) => set({ isSash: v })} /></td>
                    <td><SelectCell value={c.bottom} options={profileOptions} onChange={(v) => set({ bottom: v })} /></td>
                    <td><SelectCell value={c.left} options={profileOptions} onChange={(v) => set({ left: v })} /></td>
                    <td><SelectCell value={c.top} options={profileOptions} onChange={(v) => set({ top: v })} /></td>
                    <td><SelectCell value={c.right} options={profileOptions} onChange={(v) => set({ right: v })} /></td>
                    <td><SelectCell value={c.dividerV} options={profileOptions} onChange={(v) => set({ dividerV: v })} /></td>
                    <td><SelectCell value={c.dividerH} options={profileOptions} onChange={(v) => set({ dividerH: v })} /></td>
                    <td><SelectCell value={c.fillingId} options={fillingOptions} onChange={(v) => set({ fillingId: v })} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="hint">
            «Разделитель ↕» — вертикальный импост (делит поле по ширине), «Разделитель ↔» — горизонтальный.
          </p>
        </section>
      )}

      {tab === 'Профили' && (
        <section>
          <RowToolbar
            title="Профили системы"
            hasSelection={!!profileId}
            onAdd={() =>
              mutate((s) => {
                const id = newId('SP')
                s.profiles.push({
                  id,
                  name: 'Новый профиль',
                  enabled: true,
                  role: 'frame',
                  materialId: catalog.materials[0]?.id ?? '',
                  spec: [newSpecItem(catalog.materials[0]?.id ?? '')],
                })
                setProfileId(id)
              })
            }
            onCopy={() =>
              mutate((s) => {
                const src = s.profiles.find((p) => p.id === profileId)
                if (!src) return
                const copy = structuredClone(src)
                copy.id = newId('SP')
                copy.name = `${src.name} (копия)`
                copy.spec = copy.spec.map((i: SpecItem) => ({ ...i, id: newId('SI') }))
                s.profiles.push(copy)
                setProfileId(copy.id)
              })
            }
            onDelete={() =>
              mutate((s) => {
                s.profiles = s.profiles.filter((p) => p.id !== profileId)
                setProfileId(s.profiles[0]?.id ?? null)
              })
            }
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-check">Исп.</th>
                <th>Наименование</th>
                <th className="w-base">Роль в контуре</th>
                <th>Материал</th>
                <th className="w-num">Ширина в плане</th>
                <th className="w-num">Строк спец.</th>
              </tr>
            </thead>
            <tbody>
              {system.profiles.map((p) => {
                const set = (patch: Partial<typeof p>) =>
                  mutate((s) => Object.assign(s.profiles.find((x) => x.id === p.id)!, patch))
                const geom = catalog.materials.find((m) => m.id === p.materialId)?.geometry
                return (
                  <tr key={p.id} className={p.id === profileId ? 'selected' : undefined} onClick={() => setProfileId(p.id)} onFocusCapture={() => setProfileId(p.id)}>
                    <td><CheckCell value={p.enabled} onChange={(v) => set({ enabled: v })} /></td>
                    <td><TextCell value={p.name} onChange={(v) => set({ name: v })} /></td>
                    <td><SelectCell value={p.role} options={ROLE_OPTIONS} onChange={(v) => set({ role: v as ProfileRole })} /></td>
                    <td><SelectCell value={p.materialId} options={materialOptions} onChange={(v) => set({ materialId: v })} /></td>
                    <td className="num muted">{geom ? `${geom.faceWidth} мм` : '— нет геометрии'}</td>
                    <td className="num muted">{p.spec.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {profile && (
            <SpecItemsEditor
              title={`Спецификация профиля «${profile.name}»`}
              items={profile.spec}
              catalog={catalog}
              onChange={(fn) => mutate((s) => fn(s.profiles.find((p) => p.id === profile.id)!.spec))}
            />
          )}
        </section>
      )}

      {tab === 'Прилегания' && (
        <section>
          <RowToolbar
            title="Прилегания: посадка створки на родительский профиль"
            hasSelection={!!pick('adj')}
            onAdd={() =>
              mutate((s) => s.adjacencies.push({ id: newId('ADJ'), name: 'Створка / профиль', enabled: true, parent: 'frame', dW: 0, dH: 0 }))
            }
            onCopy={() =>
              mutate((s) => {
                const src = s.adjacencies.find((a) => a.id === pick('adj'))
                if (src) s.adjacencies.push({ ...structuredClone(src), id: newId('ADJ') })
              })
            }
            onDelete={() => mutate((s) => void (s.adjacencies = s.adjacencies.filter((a) => a.id !== pick('adj'))))}
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-check">Исп.</th>
                <th>Наименование</th>
                <th className="w-base">Родительский профиль</th>
                <th className="w-num">dW</th>
                <th className="w-num">dH</th>
              </tr>
            </thead>
            <tbody>
              {system.adjacencies.map((a) => {
                const set = (patch: Partial<typeof a>) =>
                  mutate((s) => Object.assign(s.adjacencies.find((x) => x.id === a.id)!, patch))
                return (
                  <tr key={a.id} className={a.id === pick('adj') ? 'selected' : undefined} onClick={() => setPick('adj', a.id)} onFocusCapture={() => setPick('adj', a.id)}>
                    <td><CheckCell value={a.enabled} onChange={(v) => set({ enabled: v })} /></td>
                    <td><TextCell value={a.name} onChange={(v) => set({ name: v })} /></td>
                    <td><SelectCell value={a.parent} options={ROLE_OPTIONS} onChange={(v) => set({ parent: v as ProfileRole })} /></td>
                    <td><NumCell value={a.dW} onChange={(v) => set({ dW: v })} /></td>
                    <td><NumCell value={a.dH} onChange={(v) => set({ dH: v })} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="hint">
            dW / dH — суммарная добавка к ширине и высоте створки относительно светового проёма родителя
            (двойной наплав). Знак и семантику нужно сверить с эталонным расчётом до запуска в производство.
          </p>
        </section>
      )}

      {tab === 'Соединения' && (
        <section>
          <RowToolbar
            title="Соединения: добавка к длине детали"
            hasSelection={!!pick('joint')}
            onAdd={() =>
              mutate((s) => s.joints.push({ id: newId('J'), name: 'Новое соединение', enabled: true, kind: 'corner', role: 'frame', size: 0 }))
            }
            onCopy={() =>
              mutate((s) => {
                const src = s.joints.find((j) => j.id === pick('joint'))
                if (src) s.joints.push({ ...structuredClone(src), id: newId('J') })
              })
            }
            onDelete={() => mutate((s) => void (s.joints = s.joints.filter((j) => j.id !== pick('joint'))))}
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-check">Исп.</th>
                <th>Наименование</th>
                <th className="w-base">Вид</th>
                <th className="w-base">Роль профиля</th>
                <th className="w-num">Размер, мм</th>
              </tr>
            </thead>
            <tbody>
              {system.joints.map((j) => {
                const set = (patch: Partial<typeof j>) =>
                  mutate((s) => Object.assign(s.joints.find((x) => x.id === j.id)!, patch))
                return (
                  <tr key={j.id} className={j.id === pick('joint') ? 'selected' : undefined} onClick={() => setPick('joint', j.id)} onFocusCapture={() => setPick('joint', j.id)}>
                    <td><CheckCell value={j.enabled} onChange={(v) => set({ enabled: v })} /></td>
                    <td><TextCell value={j.name} onChange={(v) => set({ name: v })} /></td>
                    <td>
                      <SelectCell
                        value={j.kind}
                        options={[
                          { value: 'corner', label: 'Угол контура' },
                          { value: 'impostT', label: 'Импост — Т' },
                        ]}
                        onChange={(v) => set({ kind: v as 'corner' | 'impostT' })}
                      />
                    </td>
                    <td><SelectCell value={j.role} options={ROLE_OPTIONS} onChange={(v) => set({ role: v as ProfileRole })} /></td>
                    <td><NumCell value={j.size} onChange={(v) => set({ size: v })} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="hint">Размер — добавка к длине детали с каждой стороны: у сварного угла 0, у импоста — заход в фальц.</p>
        </section>
      )}

      {tab === 'Заполнения' && (
        <section>
          <RowToolbar
            title="Заполнения системы: посадка стеклопакета в контур"
            hasSelection={!!fillingId}
            onAdd={() =>
              mutate((s) => {
                const id = newId('FL')
                s.fillings.push({ id, name: 'Новое заполнение', enabled: true, target: 'frame', dW: 0, dH: 0, spec: [] })
                setFillingId(id)
              })
            }
            onCopy={() =>
              mutate((s) => {
                const src = s.fillings.find((f) => f.id === fillingId)
                if (!src) return
                const copy = structuredClone(src)
                copy.id = newId('FL')
                copy.name = `${src.name} (копия)`
                copy.spec = copy.spec.map((i: SpecItem) => ({ ...i, id: newId('SI') }))
                s.fillings.push(copy)
                setFillingId(copy.id)
              })
            }
            onDelete={() =>
              mutate((s) => {
                s.fillings = s.fillings.filter((f) => f.id !== fillingId)
                setFillingId(s.fillings[0]?.id ?? null)
              })
            }
          />
          <table className="grid edit">
            <thead>
              <tr>
                <th className="w-check">Исп.</th>
                <th>Наименование</th>
                <th className="w-base">Контур</th>
                <th className="w-num">dW</th>
                <th className="w-num">dH</th>
                <th className="w-num">Строк спец.</th>
              </tr>
            </thead>
            <tbody>
              {system.fillings.map((f) => {
                const set = (patch: Partial<typeof f>) =>
                  mutate((s) => Object.assign(s.fillings.find((x) => x.id === f.id)!, patch))
                return (
                  <tr key={f.id} className={f.id === fillingId ? 'selected' : undefined} onClick={() => setFillingId(f.id)} onFocusCapture={() => setFillingId(f.id)}>
                    <td><CheckCell value={f.enabled} onChange={(v) => set({ enabled: v })} /></td>
                    <td><TextCell value={f.name} onChange={(v) => set({ name: v })} /></td>
                    <td>
                      <SelectCell
                        value={f.target}
                        options={[
                          { value: 'frame', label: 'Рама (глухое)' },
                          { value: 'sash', label: 'Створка' },
                        ]}
                        onChange={(v) => set({ target: v as 'frame' | 'sash' })}
                      />
                    </td>
                    <td><NumCell value={f.dW} onChange={(v) => set({ dW: v })} /></td>
                    <td><NumCell value={f.dH} onChange={(v) => set({ dH: v })} /></td>
                    <td className="num muted">{f.spec.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filling && (
            <SpecItemsEditor
              title={`Спецификация заполнения «${filling.name}» (штапик, уплотнение, работы)`}
              items={filling.spec}
              catalog={catalog}
              onChange={(fn) => mutate((s) => fn(s.fillings.find((f) => f.id === filling.id)!.spec))}
            />
          )}
          <div className="card">
            <h3>Допустимые стеклопакеты</h3>
            <div className="check-list">
              {catalog.glazings.map((g) => (
                <label key={g.id} className="check-line">
                  <input
                    type="checkbox"
                    checked={system.glazingIds.includes(g.id)}
                    onChange={(e) =>
                      mutate((s) => {
                        s.glazingIds = e.target.checked
                          ? [...s.glazingIds, g.id]
                          : s.glazingIds.filter((x) => x !== g.id)
                      })
                    }
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'Фурнитура' && (
        <section className="card">
          <h3>Допустимые варианты комплектации</h3>
          <div className="check-list">
            {catalog.hardware.map((h) => (
              <label key={h.id} className="check-line">
                <input
                  type="checkbox"
                  checked={system.hardwareVariantIds.includes(h.id)}
                  onChange={(e) =>
                    mutate((s) => {
                      s.hardwareVariantIds = e.target.checked
                        ? [...s.hardwareVariantIds, h.id]
                        : s.hardwareVariantIds.filter((x) => x !== h.id)
                    })
                  }
                />
                {h.name} <span className="muted">— фальц до {h.maxFw}×{h.maxFh} мм</span>
              </label>
            ))}
          </div>
          <p className="hint">Сами варианты (диапазоны фальца и состав) правятся в справочнике «Фурнитура».</p>
        </section>
      )}
    </div>
  )
}
