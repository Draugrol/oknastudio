/**
 * Справочники — только просмотр на этом этапе.
 * Цель экрана: показать, что ядро расчёта не содержит констант системы,
 * все цифры видны и редактируемы через данные (план §10).
 */
import { useState } from 'react'
import { catalog } from '../catalog'

const TABS = ['Системы', 'Материалы', 'Цвета', 'Заполнения', 'Фурнитура', 'Правила спецификации'] as const

export function CatalogPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Системы')

  return (
    <div className="page">
      <header className="page-head">
        <h1>Справочники</h1>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'Системы' && (
        <table className="grid wide">
          <thead>
            <tr>
              <th>Система</th>
              <th>Построение</th>
              <th>Профили по ролям</th>
              <th>Заполнения</th>
              <th>Фурнитура</th>
              <th className="num">Смещение импоста, мм</th>
            </tr>
          </thead>
          <tbody>
            {catalog.systems.map((s) => (
              <tr key={s.id}>
                <td className="strong">{s.name}</td>
                <td>{s.buildFrom === 'inside' ? 'изнутри' : 'снаружи'}</td>
                <td className="muted">
                  {Object.entries(s.profiles)
                    .filter(([, v]) => v)
                    .map(([role, id]) => `${role}: ${catalog.materials.find((m) => m.id === id)?.code}`)
                    .join(', ')}
                </td>
                <td className="muted">
                  {s.glazingIds.map((id) => catalog.glazings.find((g) => g.id === id)?.name).join('; ')}
                </td>
                <td className="muted">
                  {s.hardwareVariantIds.map((id) => catalog.hardware.find((h) => h.id === id)?.name).join('; ')}
                </td>
                <td className="num">{s.joints.impost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Материалы' && (
        <table className="grid wide">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Наименование</th>
              <th>Группа</th>
              <th>Тип</th>
              <th className="num">Ширина в плане</th>
              <th className="num">Наплав</th>
              <th className="num">Фальц</th>
              <th className="num">Глубина</th>
              <th className="num">кг/м</th>
              <th className="num">Цена</th>
            </tr>
          </thead>
          <tbody>
            {catalog.materials.map((m) => (
              <tr key={m.id}>
                <td className="muted">{m.code}</td>
                <td>{m.name}</td>
                <td className="muted">{m.group}</td>
                <td className="muted">{kindTitle(m.kind)}</td>
                <td className="num">{m.geometry?.faceWidth ?? '—'}</td>
                <td className="num">{m.geometry?.overlap ?? '—'}</td>
                <td className="num">{m.geometry?.falz ?? '—'}</td>
                <td className="num">{m.geometry?.depth ?? '—'}</td>
                <td className="num">{m.geometry?.massPerMeter ?? '—'}</td>
                <td className="num">
                  {m.price} {catalog.currency.symbol}/{m.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Цвета' && (
        <table className="grid">
          <thead>
            <tr>
              <th>Цвет</th>
              <th className="num">Коэффициент цены</th>
              <th>Отрисовка</th>
            </tr>
          </thead>
          <tbody>
            {catalog.colors.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="num">{c.markup.toFixed(2)}</td>
                <td>
                  <span className="swatch" style={{ background: c.render.outer, borderColor: c.render.edge }} />
                  <span className="swatch" style={{ background: c.render.inner, borderColor: c.render.edge }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Заполнения' && (
        <table className="grid wide">
          <thead>
            <tr>
              <th>Заполнение</th>
              <th>Состав</th>
              <th className="num">Толщина, мм</th>
              <th>Применимость (на вычисленном размере СП)</th>
            </tr>
          </thead>
          <tbody>
            {catalog.glazings.map((g) => (
              <tr key={g.id}>
                <td className="strong">{g.name}</td>
                <td className="muted">{g.elements.map((e) => e.name).join(' / ')}</td>
                <td className="num">{g.elements.reduce((a, e) => a + e.thickness, 0)}</td>
                <td className="muted">
                  Ш {g.applicability.minW}–{g.applicability.maxW}, В {g.applicability.minH}–
                  {g.applicability.maxH}, S ≤ {g.applicability.maxArea} м²
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Фурнитура' && (
        <table className="grid wide">
          <thead>
            <tr>
              <th>Вариант</th>
              <th>Открывание</th>
              <th className="num">Макс. фальц</th>
              <th className="num">Макс. масса</th>
              <th>Диапазоны комплектации (ФШ × ФВ → состав)</th>
            </tr>
          </thead>
          <tbody>
            {catalog.hardware.map((h) => (
              <tr key={h.id}>
                <td className="strong">{h.name}</td>
                <td>{openingTitle(h.opening)}</td>
                <td className="num">
                  {h.maxFw}×{h.maxFh}
                </td>
                <td className="num">{h.maxSashMass} кг</td>
                <td className="muted">
                  {h.ranges.map((r, i) => (
                    <div key={i}>
                      {r.fw[0]}–{r.fw[1]} × {r.fh[0]}–{r.fh[1]}:{' '}
                      {r.items
                        .map((it) => `${catalog.materials.find((m) => m.id === it.materialId)?.name} ×${it.qty}`)
                        .join(', ')}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Правила спецификации' && (
        <table className="grid wide">
          <thead>
            <tr>
              <th>Правило</th>
              <th>Источник</th>
              <th>Материал</th>
              <th>База расчёта</th>
              <th>Размерность</th>
              <th className="num">Коэф.</th>
              <th className="num">Добавка</th>
              <th className="num">Шаг</th>
              <th className="num">Кол.</th>
            </tr>
          </thead>
          <tbody>
            {catalog.rules.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td className="muted">
                  {sourceTitle(r.source)}
                  {r.role ? ` / ${r.role}` : ''}
                </td>
                <td className="muted">{catalog.materials.find((m) => m.id === r.materialId)?.name}</td>
                <td>{baseTitle(r.base)}</td>
                <td>{r.dim}</td>
                <td className="num">{r.coef}</td>
                <td className="num">{r.addition}</td>
                <td className="num">{r.step}</td>
                <td className="num">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const kindTitle = (k: string) =>
  ({ profile: 'длинновой', sheet: 'листовой', piece: 'штучный', work: 'работа' })[k] ?? k
const openingTitle = (o: string) =>
  ({ turn: 'поворотное', turnTilt: 'поворотно-откидное', tilt: 'откидное', fix: 'глухое' })[o] ?? o
const sourceTitle = (s: string) =>
  ({ element: 'элемент', glazing: 'заполнение', sash: 'створка', product: 'изделие', joint: 'соединение' })[s] ?? s
const baseTitle = (b: string) =>
  ({ total: 'Всего', width: 'Ширина', height: 'Высота', perimeter: 'Периметр', area: 'Площадь' })[b] ?? b
