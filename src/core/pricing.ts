/**
 * Ценообразование (план §6.5).
 *
 * Цена материала берётся по цвету изделия из его цветовой группы —
 * так же, как в карточке материала IT Окна. Никаких коэффициентов:
 * цена каждого цвета задаётся явно, а чего нет в списке — идёт по базовой.
 */
import type { Catalog, Material, SpecLine } from './types'
import { materialById } from './geometry'

export function priceOf(material: Material, colorId: string, colorRule?: 'asBase' | 'none'): number {
  if (colorRule === 'none' || !material.colorGroupId) return material.price
  return material.prices?.find((p) => p.colorId === colorId)?.price ?? material.price
}

export function priceSpec(lines: SpecLine[], catalog: Catalog, colorId: string): SpecLine[] {
  return lines.map((line) => {
    const material = materialById(catalog, line.materialId)
    const price = round2(priceOf(material, colorId, line.colorRule))
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
