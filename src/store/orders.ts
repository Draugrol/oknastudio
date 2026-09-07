/**
 * Журнал заказов. На этом этапе — локальное хранилище браузера;
 * интерфейс store намеренно повторяет будущий REST API (план §3),
 * чтобы замена persistence на сервер не задела компоненты.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ProductInput } from '../core/types'
import { newProduct, nextId } from '../core/scene'
import { getCatalog } from './catalog'

export const ORDER_STATUSES = [
  'Черновик',
  'Расчёт',
  'Согласование',
  'В производстве',
  'Готов',
  'Отгружен',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface Order {
  id: string
  number: string
  date: string
  client: string
  address: string
  manager: string
  status: OrderStatus
  discount: number
  comment: string
  items: ProductInput[]
}

const KEY = 'oknastudio.orders.v1'

function seed(): Order[] {
  const catalog = getCatalog()
  const system = catalog.systems[0]
  const glazingId = system?.glazingIds[0] ?? catalog.glazings[0]?.id ?? ''
  const hardware =
    catalog.hardware.find((h) => system?.hardwareVariantIds.includes(h.id) && h.opening === 'turnTilt') ??
    catalog.hardware[0]
  const product = newProduct(catalog, { width: 920, height: 1620 })
  const withSash: ProductInput = {
    ...product,
    root: {
      kind: 'field',
      id: product.root.id,
      fill: {
        type: 'sash',
        opening: 'turnTilt',
        handle: 'right',
        glazingId,
        hardwareVariantId: hardware?.id ?? '',
      },
    },
  }
  return [
    {
      id: nextId('O'),
      number: '2026-0001',
      date: new Date().toISOString().slice(0, 10),
      client: 'ООО «Стройдом»',
      address: 'г. Тверь, ул. Советская, 14',
      manager: 'Менеджер',
      status: 'Расчёт',
      discount: 0,
      comment: 'Контрольное изделие: 920×1620, поворотно-откидная створка.',
      items: [withSash],
    },
  ]
}

function load(): Order[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Order[]
    return Array.isArray(parsed) && parsed.length ? parsed : seed()
  } catch {
    return seed()
  }
}

function save(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders))
  } catch {
    /* приватный режим браузера — работаем без сохранения */
  }
}

const listeners = new Set<(orders: Order[]) => void>()
let state: Order[] | null = null

function getState(): Order[] {
  if (!state) state = load()
  return state
}

function setState(next: Order[]) {
  state = next
  save(next)
  listeners.forEach((fn) => fn(next))
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(getState)

  useEffect(() => {
    listeners.add(setOrders)
    return () => {
      listeners.delete(setOrders)
    }
  }, [])

  const createOrder = useCallback((): Order => {
    const current = getState()
    const year = new Date().getFullYear()
    const seq = current.length + 1
    const order: Order = {
      id: nextId('O'),
      number: `${year}-${String(seq).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      client: '',
      address: '',
      manager: '',
      status: 'Черновик',
      discount: 0,
      comment: '',
      items: [],
    }
    setState([order, ...current])
    return order
  }, [])

  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setState(getState().map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }, [])

  const removeOrder = useCallback((id: string) => {
    setState(getState().filter((o) => o.id !== id))
  }, [])

  const addItem = useCallback((orderId: string, item?: ProductInput): ProductInput => {
    const product = item ?? newProduct(getCatalog())
    setState(getState().map((o) => (o.id === orderId ? { ...o, items: [...o.items, product] } : o)))
    return product
  }, [])

  const updateItem = useCallback((orderId: string, item: ProductInput) => {
    setState(
      getState().map((o) =>
        o.id === orderId ? { ...o, items: o.items.map((i) => (i.id === item.id ? item : i)) } : o,
      ),
    )
  }, [])

  const removeItem = useCallback((orderId: string, itemId: string) => {
    setState(
      getState().map((o) => (o.id === orderId ? { ...o, items: o.items.filter((i) => i.id !== itemId) } : o)),
    )
  }, [])

  const duplicateItem = useCallback((orderId: string, itemId: string) => {
    setState(
      getState().map((o) => {
        if (o.id !== orderId) return o
        const source = o.items.find((i) => i.id === itemId)
        if (!source) return o
        return { ...o, items: [...o.items, { ...structuredClone(source), id: nextId('P') }] }
      }),
    )
  }, [])

  return {
    orders,
    createOrder,
    updateOrder,
    removeOrder,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
  }
}
