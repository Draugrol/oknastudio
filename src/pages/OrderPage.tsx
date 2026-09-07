/** Карточка заказа: реквизиты, состав изделий с мини-чертежами, суммы. */
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOrders, ORDER_STATUSES, type OrderStatus } from '../store/orders'
import { calcOrder } from '../core/order'
import { catalog } from '../catalog'
import { Drawing } from '../editor/Drawing'
import { newProduct } from '../core/scene'

export function OrderPage() {
  const { orderId = '' } = useParams()
  const { orders, updateOrder, addItem, removeItem, duplicateItem } = useOrders()
  const navigate = useNavigate()
  const order = orders.find((o) => o.id === orderId)

  const totals = useMemo(
    () => (order ? calcOrder(order.items, catalog, order.discount) : null),
    [order],
  )

  if (!order || !totals) {
    return (
      <div className="page">
        <p>Заказ не найден. <Link to="/">К журналу</Link></p>
      </div>
    )
  }

  const money = (v: number) => `${v.toLocaleString('ru-RU')} ${catalog.currency.symbol}`

  return (
    <div className="page">
      <header className="page-head">
        <h1>
          Заказ № {order.number} <span className="muted">от {order.date}</span>
        </h1>
        <div className="toolbar">
          <button
            className="primary"
            onClick={() => {
              const item = addItem(order.id, newProduct())
              navigate(`/orders/${order.id}/items/${item.id}`)
            }}
          >
            Добавить изделие
          </button>
        </div>
      </header>

      <section className="card">
        <div className="form-grid">
          <label>
            Клиент
            <input value={order.client} onChange={(e) => updateOrder(order.id, { client: e.target.value })} />
          </label>
          <label>
            Адрес объекта
            <input value={order.address} onChange={(e) => updateOrder(order.id, { address: e.target.value })} />
          </label>
          <label>
            Менеджер
            <input value={order.manager} onChange={(e) => updateOrder(order.id, { manager: e.target.value })} />
          </label>
          <label>
            Статус
            <select
              value={order.status}
              onChange={(e) => updateOrder(order.id, { status: e.target.value as OrderStatus })}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Скидка, %
            <input
              type="number"
              min={0}
              max={60}
              value={order.discount}
              onChange={(e) => updateOrder(order.id, { discount: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="wide-field">
            Комментарий
            <input value={order.comment} onChange={(e) => updateOrder(order.id, { comment: e.target.value })} />
          </label>
        </div>
      </section>

      <div className="items">
        {order.items.map((item, index) => {
          const calc = totals.items[index]
          return (
            <article className="item-card" key={item.id}>
              <Link className="thumb" to={`/orders/${order.id}/items/${item.id}`}>
                <Drawing input={item} calc={calc} compact />
              </Link>
              <div className="item-body">
                <h3>
                  Поз. {index + 1}. {catalog.systems.find((s) => s.id === item.systemId)?.name}
                </h3>
                <p className="muted">
                  {item.width} × {item.height} мм · {item.qty} шт ·{' '}
                  {catalog.colors.find((c) => c.id === item.colorId)?.name}
                </p>
                <p className="muted">
                  Створок: {calc.contours.filter((c) => c.kind === 'sash').length} · СП:{' '}
                  {calc.glazings.length} · масса {calc.massKg.toFixed(1)} кг
                </p>
                {calc.issues.length > 0 && <p className="warn">{calc.issues[0]}</p>}
                <p className="price">{money(calc.total)}</p>
                <div className="btn-row">
                  <Link className="button" to={`/orders/${order.id}/items/${item.id}`}>
                    Редактор
                  </Link>
                  <button onClick={() => duplicateItem(order.id, item.id)}>Копия</button>
                  <button className="danger" onClick={() => removeItem(order.id, item.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            </article>
          )
        })}
        {!order.items.length && <p className="muted">В заказе пока нет изделий.</p>}
      </div>

      <section className="card totals">
        <dl className="facts">
          <div>
            <dt>Изделий</dt>
            <dd>{totals.qty}</dd>
          </div>
          <div>
            <dt>Площадь</dt>
            <dd>{totals.areaM2.toFixed(3)} м²</dd>
          </div>
          <div>
            <dt>Сумма без скидки</dt>
            <dd>{money(totals.subtotal)}</dd>
          </div>
          <div>
            <dt>Скидка</dt>
            <dd>{order.discount}%</dd>
          </div>
          <div>
            <dt>К оплате</dt>
            <dd className="strong">{money(totals.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
