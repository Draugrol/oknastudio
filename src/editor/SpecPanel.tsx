/**
 * Правая панель: итоги изделия и спецификация.
 * По умолчанию открыты итоги — менеджеру нужны цифры, а не 30 строк материалов.
 */
import { useState } from 'react'
import type { CalcResult, MaterialKind } from '../core/types'
import { useCatalog } from '../store/catalog'

const GROUP_TITLES: Record<MaterialKind, string> = {
  profile: 'Длинновые материалы',
  sheet: 'Листовые материалы',
  piece: 'Штучные материалы',
  work: 'Работы',
}
const ORDER: MaterialKind[] = ['profile', 'sheet', 'piece', 'work']

export function SpecPanel({ calc }: { calc: CalcResult }) {
  const { catalog } = useCatalog()
  const [tab, setTab] = useState<'totals' | 'spec'>('totals')
  const money = (v: number) =>
    `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${catalog.currency.symbol}`

  return (
    <div className="panel spec">
      <div className="right-tabs">
        <div className="tabs">
          <button className={tab === 'totals' ? 'tab active' : 'tab'} onClick={() => setTab('totals')}>
            Итоги
          </button>
          <button className={tab === 'spec' ? 'tab active' : 'tab'} onClick={() => setTab('spec')}>
            Спецификация · {calc.spec.length}
          </button>
        </div>
      </div>

      {tab === 'totals' && (
        <>
          <div className="metrics">
            <div className="metric accent">
              <div className="k">Цена за изделие</div>
              <div className="v">{money(calc.price)}</div>
            </div>
            {calc.input.qty > 1 && (
              <div className="metric">
                <div className="k">Сумма · {calc.input.qty} шт</div>
                <div className="v">{money(calc.total)}</div>
              </div>
            )}
            <div className="metric">
              <div className="k">Площадь</div>
              <div className="v">{calc.areaM2.toFixed(3)} м²</div>
            </div>
            <div className="metric">
              <div className="k">Масса</div>
              <div className="v">{calc.massKg.toFixed(1)} кг</div>
            </div>
            <div className="metric">
              <div className="k">Периметр</div>
              <div className="v">{calc.perimeter} мм</div>
            </div>
            <div className="metric">
              <div className="k">Створок / СП</div>
              <div className="v">
                {calc.contours.filter((c) => c.kind === 'sash').length} / {calc.glazings.length}
              </div>
            </div>
          </div>

          {calc.issues.length > 0 && (
            <div style={{ padding: '0 16px 16px' }}>
              <div className="issues">
                <h3>Замечания расчёта</h3>
                <ul>
                  {calc.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'spec' && (
        <div className="spec-body">
          {ORDER.map((kind) => {
            const lines = calc.spec.filter((l) => l.kind === kind)
            if (!lines.length) return null
            const sum = lines.reduce((acc, l) => acc + l.sum, 0)
            return (
              <div key={kind}>
                <div className="spec-group-title">{GROUP_TITLES[kind]}</div>
                <table className="grid">
                  <colgroup>
                    <col />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 48 }} />
                    <col style={{ width: 74 }} />
                    <col style={{ width: 86 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Наименование</th>
                      <th className="num">Размер</th>
                      <th className="num">Кол</th>
                      <th className="num">Итого</th>
                      <th className="num">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={`${line.materialId}-${i}`}>
                        <td>{line.name}</td>
                        <td className="num">
                          {line.length ? (line.width ? `${line.length}×${line.width}` : line.length) : '—'}
                        </td>
                        <td className="num">{line.qty}</td>
                        <td className="num">
                          {line.amount.toFixed(3)} {line.unit}
                        </td>
                        <td className="num">{money(line.sum)}</td>
                      </tr>
                    ))}
                    <tr className="total">
                      <td colSpan={4}>Итого по группе</td>
                      <td className="num">{money(sum)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
