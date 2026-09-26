/** CAD-редактор изделия: инструменты, чертёж, свойства и живая спецификация. */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrders } from '../store/orders'
import { useCatalog } from '../store/catalog'
import { calcProduct } from '../core/calc'
import { Drawing } from '../editor/Drawing'
import { StageBar } from '../editor/StageBar'
import { PropertiesPanel } from '../editor/PropertiesPanel'
import { SpecPanel } from '../editor/SpecPanel'
import { HardwareDialog } from '../editor/HardwareDialog'
import { findNode, setFill, setRatio } from '../core/scene'
import type { ProductInput } from '../core/types'

export function EditorPage() {
  const { orderId = '', itemId = '' } = useParams()
  const { orders, updateItem } = useOrders()
  const { catalog } = useCatalog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hardwareOpen, setHardwareOpen] = useState(false)

  const order = orders.find((o) => o.id === orderId)
  const item = order?.items.find((i) => i.id === itemId)
  const index = order?.items.findIndex((i) => i.id === itemId) ?? -1

  const calc = useMemo(() => (item ? calcProduct(item, catalog) : null), [item, catalog])

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
  const node = selectedId ? findNode(item.root, selectedId) : null
  const field = node && node.kind === 'field' ? node : null
  const sashFill = field && field.fill.type === 'sash' ? field.fill : null
  const money = (v: number) =>
    `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${catalog.currency.symbol}`

  return (
    <div className="editor">
      <header className="page-head">
        <div className="crumbs">
          <Link to="/">Журнал</Link>
          <span>/</span>
          <Link to={`/orders/${order.id}`}>Заказ № {order.number}</Link>
          <span>/</span>
          <strong style={{ color: 'var(--ink)' }}>
            Поз. {index + 1} · {item.width}×{item.height} мм
          </strong>
        </div>
        <div className="head-price">
          <span className="label">Сумма позиции</span>
          <span className="value">{money(calc.total)}</span>
        </div>
      </header>

      <div className="editor-body">
        <aside className="left">
          <PropertiesPanel item={item} calc={calc} selectedId={selectedId} onChange={change} />
        </aside>

        <div className="stage">
          <StageBar
            item={item}
            calc={calc}
            catalog={catalog}
            selectedId={selectedId}
            onChange={change}
            onSelect={setSelectedId}
            onOpenHardware={() => setHardwareOpen(true)}
          />
          <main className="canvas" onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
            <Drawing
              input={item}
              calc={calc}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveSplit={(splitId, ratio) => change({ ...item, root: setRatio(item.root, splitId, ratio) })}
            />
          </main>
        </div>

        <aside className="right">
          <SpecPanel calc={calc} />
        </aside>
      </div>

      {hardwareOpen && field && (
        <HardwareDialog
          item={item}
          fieldId={field.id}
          catalog={catalog}
          current={sashFill}
          onCancel={() => setHardwareOpen(false)}
          onApply={(fill) => {
            change({ ...item, root: setFill(item.root, field.id, fill) })
            setHardwareOpen(false)
          }}
        />
      )}
    </div>
  )
}
