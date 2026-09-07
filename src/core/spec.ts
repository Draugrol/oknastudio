/**
 * Движок спецификации «Вид расчёта» (план §6.2) и фурнитура (§6.3).
 *
 * База расчёта:  Всего -> 1 | Ширина -> ШКМ | Высота -> ВКМ
 *                Периметр -> 2·ШКМ + 2·ВКМ | Площадь -> ШКМ·ВКМ
 * Размер детали: Округл((База + Добавка) · Коэффициент, Шаг)
 * Количество:    Кол · База (для 0D)
 */
import type {
  Catalog,
  CalcElement,
  CalcGlazing,
  CalcContour,
  CalcBase,
  ProductInput,
  SpecLine,
  SpecRule,
} from './types'
import { materialById } from './geometry'

/** Размеры, от которых считается правило. */
export interface RuleBase {
  width: number
  height: number
}

export function baseValue(base: CalcBase, b: RuleBase): number {
  switch (base) {
    case 'total':
      return 1
    case 'width':
      return b.width
    case 'height':
      return b.height
    case 'perimeter':
      return 2 * b.width + 2 * b.height
    case 'area':
      return (b.width * b.height) / 1_000_000
  }
}

export function roundStep(value: number, step: number): number {
  if (!step) return Math.round(value * 100) / 100
  return Math.round(value / step) * step
}

/** Применение одного правила к базе. Возвращает строку спецификации без цены. */
export function applyRule(
  rule: SpecRule,
  b: RuleBase,
  catalog: Catalog,
  source: string,
): Omit<SpecLine, 'price' | 'sum'> {
  const material = materialById(catalog, rule.materialId)
  const size = baseValue(rule.base, b)

  if (rule.dim === '0D') {
    const qty = roundStep(rule.count * size, rule.step || 0)
    return {
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      kind: material.kind,
      qty,
      amount: qty,
      source,
    }
  }

  if (rule.dim === '1D') {
    const length = roundStep((size + rule.addition) * rule.coef, rule.step)
    return {
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      kind: material.kind,
      qty: rule.count,
      length,
      amount: (rule.count * length) / 1000,
      source,
    }
  }

  // 2D: лист/стекло — длина по ширине базы, ширина по высоте базы.
  const length = roundStep((b.width + rule.addition) * rule.coef, rule.step)
  const width = roundStep((b.height + rule.addition) * rule.coef, rule.step)
  return {
    materialId: material.id,
    name: material.name,
    unit: material.unit,
    kind: material.kind,
    qty: rule.count,
    length,
    width,
    amount: (rule.count * length * width) / 1_000_000,
    source,
  }
}

export interface SpecInput {
  input: ProductInput
  elements: CalcElement[]
  glazings: CalcGlazing[]
  contours: CalcContour[]
}

/** Полная спецификация изделия: профили, сопутствующие материалы, заполнения, фурнитура. */
export function computeSpec(data: SpecInput, catalog: Catalog): { lines: SpecLine[]; issues: string[] } {
  const { input, elements, glazings, contours } = data
  const system = catalog.systems.find((s) => s.id === input.systemId)!
  const rules = catalog.rules.filter((r) => system.specRuleIds.includes(r.id))
  const lines: Omit<SpecLine, 'price' | 'sum'>[] = []
  const issues: string[] = []

  // 1. Профильные детали — прямой результат геометрического ядра.
  for (const el of elements) {
    const material = materialById(catalog, el.materialId)
    lines.push({
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      kind: material.kind,
      qty: 1,
      length: el.length,
      amount: el.length / 1000,
      source: `Профиль ${el.contourId}/${el.side}`,
    })
    for (const rule of rules.filter((r) => r.source === 'element' && (!r.role || r.role === el.role))) {
      lines.push(applyRule(rule, { width: el.length, height: 0 }, catalog, `${rule.name} (${el.id})`))
    }
  }

  // 2. Заполнения: состав стеклопакета по элементам.
  for (const g of glazings) {
    const glazing = catalog.glazings.find((x) => x.id === g.glazingId)
    if (!glazing) continue
    for (const el of glazing.elements) {
      const material = materialById(catalog, el.materialId)
      if (el.by === 'area') {
        lines.push({
          materialId: material.id,
          name: material.name,
          unit: material.unit,
          kind: material.kind,
          qty: 1,
          length: g.size.w,
          width: g.size.h,
          amount: g.areaM2,
          source: `Заполнение ${g.fieldId}`,
        })
      } else {
        const perimeter = 2 * (g.size.w + g.size.h)
        lines.push({
          materialId: material.id,
          name: material.name,
          unit: material.unit,
          kind: material.kind,
          qty: 1,
          length: perimeter,
          amount: perimeter / 1000,
          source: `Заполнение ${g.fieldId}`,
        })
      }
    }
    for (const rule of rules.filter((r) => r.source === 'glazing')) {
      lines.push(applyRule(rule, { width: g.size.w, height: g.size.h }, catalog, `${rule.name} (${g.fieldId})`))
    }
  }

  // 3. Створки: фурнитура по фальцу + правила уровня створки.
  for (const c of contours.filter((x) => x.kind === 'sash' && x.falz)) {
    const falz = c.falz!
    const variant = catalog.hardware.find((h) => h.id === c.hardwareVariantId)
    if (!variant) {
      issues.push(`${c.label ?? 'Створка'}: не выбран вариант фурнитуры`)
    } else {
      if (falz.w > variant.maxFw || falz.h > variant.maxFh) {
        issues.push(
          `${c.label ?? 'Створка'}: фальц ${falz.w}×${falz.h} мм превышает предел варианта «${variant.name}» (${variant.maxFw}×${variant.maxFh} мм)`,
        )
      }
      const range = variant.ranges.find(
        (r) => falz.w >= r.fw[0] && falz.w <= r.fw[1] && falz.h >= r.fh[0] && falz.h <= r.fh[1],
      )
      if (!range) {
        issues.push(
          `${c.label ?? 'Створка'}: в варианте «${variant.name}» нет диапазона комплектации для фальца ${falz.w}×${falz.h} мм`,
        )
      } else {
        for (const item of range.items) {
          const material = materialById(catalog, item.materialId)
          lines.push({
            materialId: material.id,
            name: material.name,
            unit: material.unit,
            kind: material.kind,
            qty: item.qty,
            amount: item.qty,
            source: `Фурнитура ${variant.name} (${c.fieldId})`,
          })
        }
      }
    }
    for (const rule of rules.filter((r) => r.source === 'sash' && (!r.opening || r.opening === c.opening))) {
      lines.push(applyRule(rule, { width: falz.w, height: falz.h }, catalog, `${rule.name} (${c.fieldId})`))
    }
  }

  // 4. Уровень изделия.
  for (const rule of rules.filter((r) => r.source === 'product')) {
    lines.push(applyRule(rule, { width: input.width, height: input.height }, catalog, rule.name))
  }

  return { lines: lines.map((l) => ({ ...l, price: 0, sum: 0 })), issues }
}

/** Свёртка спецификации по материалу и размеру детали — для отчётов и раскроя. */
export function groupSpec(lines: SpecLine[]): SpecLine[] {
  const map = new Map<string, SpecLine>()
  for (const line of lines) {
    const key = [line.materialId, line.length ?? '', line.width ?? ''].join('|')
    const found = map.get(key)
    if (found) {
      found.qty = round2(found.qty + line.qty)
      found.amount = round3(found.amount + line.amount)
      found.sum = round2(found.sum + line.sum)
    } else {
      map.set(key, { ...line })
    }
  }
  return [...map.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
}

const round2 = (v: number) => Math.round(v * 100) / 100
const round3 = (v: number) => Math.round(v * 1000) / 1000
