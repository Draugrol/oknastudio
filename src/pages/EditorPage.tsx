/** CAD-редактор изделия: чертёж, параметры, живая спецификация. */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrders } from '../store/orders'
import { calcProduct } from '../core/calc'
import { catalog } from '../catalog'
import { Drawing } from '../editor/Drawing'
import { PropertiesPanel } from '../editor/PropertiesPanel'
import { SpecPanel } from '../editor/SpecPanel'
import { setRatio } from '../core/scene'
import type { ProductInput } from '../core/types'

export function EditorPage() {
  const { orderId = '', itemId = '' } = useParams()
  const { orders, updateItem } = useOrders()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const order = orders.find((o) => o.id === orderId)
  const item = order?.items.find((i) => i.id === itemId)

  const calc = useMemo(() => (item ? calcProduct(item, catalog) : null), [item])

  if (!order || !item || !calc) {
    return (
      <div className="page">
        <p>
          Изделие не найдено. <Link to="/">К журналу</Link>
        </p>
      </div>
    )
  }

  const change = (next: ProductInput) => updateItem(order.id, next)

  return (
    <div className="editor">
      <header className="page-head">
        <h1>
          <Link to={`/orders/${order.id}`}>Заказ № {order.number}</Link> · изделие{' '}
          {item.width}×{item.height}
        </h1>
        <div className="toolbar">
          <span className="muted">Кликните поле, чтобы выбрать. Импост можно перетащить мышью.</span>
        </div>
      </header>

      <div className="editor-body">
        <aside className="left">
          <PropertiesPanel
            item={item}
            calc={calc}
            selectedId={selectedId}
            onChange={change}
            onSelect={setSelectedId}
          />
        </aside>

        <main className="canvas" onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
          <Drawing
            input={item}
            calc={calc}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveSplit={(splitId, ratio) => change({ ...item, root: setRatio(item.root, splitId, ratio) })}
          />
        </main>

        <aside className="right">
          <SpecPanel calc={calc} />
        </aside>
      </div>
    </div>
  )
}
