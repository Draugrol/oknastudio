/** Свод по заказу: пересчёт всех изделий и суммы со скидкой. */
import type { Catalog, CalcResult, ProductInput } from './types'
import { calcProduct } from './calc'
import { applyDiscount } from './pricing'

export interface OrderTotals {
  items: CalcResult[]
  subtotal: number
  total: number
  areaM2: number
  qty: number
  issues: string[]
}

export function calcOrder(items: ProductInput[], catalog: Catalog, discountPercent = 0): OrderTotals {
  const results = items.map((item) => calcProduct(item, catalog))
  const subtotal = round2(results.reduce((acc, r) => acc + r.total, 0))
  return {
    items: results,
    subtotal,
    total: applyDiscount(subtotal, discountPercent),
    areaM2: round3(results.reduce((acc, r) => acc + r.areaM2 * r.input.qty, 0)),
    qty: results.reduce((acc, r) => acc + r.input.qty, 0),
    issues: results.flatMap((r) => r.issues),
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100
const round3 = (v: number) => Math.round(v * 1000) / 1000
