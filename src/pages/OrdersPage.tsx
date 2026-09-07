/** Журнал заказов (план §8, этап 5). */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrders, ORDER_STATUSES } from '../store/orders'
import { calcOrder } from '../core/order'
import { useCatalog } from '../store/catalog'

export function OrdersPage() {
  const { orders, createOrder, removeOrder } = useOrders()
  const { catalog } = useCatalog()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      orders
        .filter((o) => (status ? o.status === status : true))
        .filter((o) =>
          query
            ? [o.number, o.client, o.address].join(' ').toLowerCase().includes(query.toLowerCase())
            : true,
        )
        .map((o) => ({ order: o, totals: calcOrder(o.items, catalog, o.discount) })),
    [orders, query, status, catalog],
  )

  const grandTotal = rows.reduce((acc, r) => acc + r.totals.total, 0)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Журнал заказов</h1>
        <div className="toolbar">
          <input placeholder="Поиск: номер, клиент, адрес" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Все статусы</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            className="primary"
            onClick={() => {
              const order = createOrder()
              navigate(`/orders/${order.id}`)
            }}
          >
            Новый заказ
          </button>
        </div>
      </header>

      <table className="grid wide">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Дата</th>
            <th>Клиент</th>
            <th>Адрес</th>
            <th>Статус</th>
            <th className="num">Изделий</th>
            <th className="num">Площадь, м²</th>
            <th className="num">Сумма</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ order, totals }) => (
            <tr key={order.id}>
              <td>
                <Link to={`/orders/${order.id}`}>{order.number}</Link>
              </td>
              <td>{order.date}</td>
              <td>{order.client || <span className="muted">не указан</span>}</td>
              <td className="muted">{order.address}</td>
              <td>
                <span className={`chip s-${ORDER_STATUSES.indexOf(order.status)}`}>{order.status}</span>
              </td>
              <td className="num">{totals.qty}</td>
              <td className="num">{totals.areaM2.toFixed(2)}</td>
              <td className="num strong">{totals.total.toLocaleString('ru-RU')} {catalog.currency.symbol}</td>
              <td className="num">
                <button className="link danger" onClick={() => removeOrder(order.id)}>
                  удалить
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={9} className="muted center">
                Заказов нет
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="total">
              <td colSpan={7}>Итого по журналу</td>
              <td className="num">{grandTotal.toLocaleString('ru-RU')} {catalog.currency.symbol}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
