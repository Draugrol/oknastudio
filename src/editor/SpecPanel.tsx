/**
 * Спецификация и цена изделия. Группировка — по виду материала,
 * как в производственных отчётах: профиль, стекло, штучное, работы.
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
  const [open, setOpen] = useState(true)
  const money = (v: number) => `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${catalog.currency.symbol}`

  return (
    <div className="panel spec">
      <section>
        <h3>Итоги</h3>
        <dl className="facts">
          <div>
            <dt>Площадь изделия</dt>
            <dd>{calc.areaM2.toFixed(3)} м²</dd>
          </div>
          <div>
            <dt>Периметр</dt>
            <dd>{calc.perimeter} мм</dd>
          </div>
          <div>
            <dt>Масса</dt>
            <dd>{calc.massKg.toFixed(1)} кг</dd>
          </div>
          <div>
            <dt>Цена за изделие</dt>
            <dd className="strong">{money(calc.price)}</dd>
          </div>
          <div>
            <dt>Сумма ({calc.input.qty} шт)</dt>
            <dd className="strong">{money(calc.total)}</dd>
          </div>
        </dl>
      </section>

      {calc.issues.length > 0 && (
        <section className="issues">
          <h3>Замечания расчёта</h3>
          <ul>
            {calc.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>
          Спецификация
          <button className="link" onClick={() => setOpen((v) => !v)}>
            {open ? 'свернуть' : 'развернуть'}
          </button>
        </h3>
        {open &&
          ORDER.map((kind) => {
            const lines = calc.spec.filter((l) => l.kind === kind)
            if (!lines.length) return null
            const sum = lines.reduce((acc, l) => acc + l.sum, 0)
            return (
              <table key={kind} className="grid">
                <colgroup>
                  <col />
                  <col style={{ width: 64 }} />
                  <col style={{ width: 48 }} />
                  <col style={{ width: 74 }} />
                  <col style={{ width: 86 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={5}>{GROUP_TITLES[kind]}</th>
                  </tr>
                  <tr>
                    <th>Наименование</th>
                    <th className="num">Размер, мм</th>
                    <th className="num">Кол-во</th>
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
            )
          })}
      </section>
    </div>
  )
}
