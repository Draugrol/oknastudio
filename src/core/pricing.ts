/**
 * Ценообразование (план §6.5).
 * Цена = Σ(деталь × цена материала × коэффициент цвета) + работы; далее скидки/наценки заказа.
 */
import type { Catalog, SpecLine } from './types'
import { materialById } from './geometry'

export function priceSpec(lines: SpecLine[], catalog: Catalog, colorId: string): SpecLine[] {
  const color = catalog.colors.find((c) => c.id === colorId)
  const markup = color?.markup ?? 1
  return lines.map((line) => {
    const material = materialById(catalog, line.materialId)
    const colored = material.colored && line.colorRule !== 'none'
    const price = round2(material.price * (colored ? markup : 1))
    return { ...line, price, sum: round2(price * line.amount) }
  })
}

export function specTotal(lines: SpecLine[]): number {
  return round2(lines.reduce((acc, l) => acc + l.sum, 0))
}

export function applyDiscount(total: number, discountPercent: number): number {
  return round2(total * (1 - discountPercent / 100))
}

const round2 = (v: number) => Math.round(v * 100) / 100
