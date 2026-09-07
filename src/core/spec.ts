/**
 * Движок спецификации «Вид расчёта» (план §6.2) и фурнитура (§6.3).
 *
 * База расчёта:  Всего -> 1 | По длине -> длина детали | Ширина | Высота
 *                Периметр -> 2·Ш + 2·В | Площадь -> Ш·В
 * Размер детали: Округл((База + Размер) · Коэфф., Шаг)
 * Количество:    Кол · База (для 0D)
 *
 * Строки спецификации берутся из справочника: у профиля, у заполнения системы,
 * у изделия и у диапазона комплектации фурнитуры — как в IT Окна.
 */
import type {
  Catalog,
  CalcDim,
  MaterialKind,
  Condition,
  CalcElement,
  CalcGlazing,
  CalcContour,
  CalcBase,
  ProductInput,
  SpecItem,
  SpecLine,
} from './types'
import { materialById } from './geometry'

/** Размеры, от которых считается строка спецификации. */
export interface RuleBase {
  width: number
  height: number
  /** «По длине»: длина детали либо периметр заполнения. */
  length: number
}

export function baseValue(base: CalcBase, b: RuleBase): number {
  switch (base) {
    case 'total':
      return 1
    case 'length':
      return b.length
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

/** Размерность детали задаётся типом материала, а не строкой спецификации. */
export function dimOfKind(kind: MaterialKind): CalcDim {
  if (kind === 'profile') return '1D'
  if (kind === 'sheet') return '2D'
  return '0D'
}

export function roundStep(value: number, step: number): number {
  if (!step) return Math.round(value * 100) / 100
  return Math.round(value / step) * step
}

/** Применение строки справочника к базе. Цена проставляется отдельно. */
export function applySpecItem(
  item: SpecItem,
  b: RuleBase,
  catalog: Catalog,
  source: string,
): Omit<SpecLine, 'price' | 'sum'> {
  const material = materialById(catalog, item.materialId)
  const dim = dimOfKind(material.kind)
  const size = baseValue(item.base, b)
  const common = {
    materialId: material.id,
    name: material.name,
    unit: material.unit,
    kind: material.kind,
    colorRule: item.colorRule,
    source,
  }

  if (dim === '0D') {
    const qty = roundStep(item.count * size, item.step || 0)
    return { ...common, qty, amount: qty }
  }

  if (dim === '1D') {
    const length = roundStep((size + item.size) * item.coef, item.step)
    return { ...common, qty: item.count, length, amount: (item.count * length) / 1000 }
  }

  // 2D: длина по ширине базы, ширина по высоте базы.
  const length = roundStep((b.width + item.size) * item.coef, item.step)
  const width = roundStep((b.height + item.size) * item.coef, item.step)
  return {
    ...common,
    qty: item.count,
    length,
    width,
    amount: (item.count * length * width) / 1_000_000,
  }
}

/**
 * Проверка условий строки: [Параметр = Значение] / [Параметр <> Значение].
 * Пустой список условий — строка считается всегда.
 * Незаданное значение параметра берётся из значения по умолчанию справочника.
 */
export function matchConditions(
  conditions: Condition[] | undefined,
  params: Record<string, string>,
  catalog: Catalog,
): boolean {
  if (!conditions?.length) return true
  return conditions.every((c) => {
    const actual = params[c.paramId] ?? catalog.params.find((p) => p.id === c.paramId)?.defaultValue ?? ''
    return c.op === '=' ? actual === c.value : actual !== c.value
  })
}

export interface SpecInput {
  input: ProductInput
  elements: CalcElement[]
  glazings: CalcGlazing[]
  contours: CalcContour[]
}

export function computeSpec(data: SpecInput, catalog: Catalog): { lines: SpecLine[]; issues: string[] } {
  const { input, elements, glazings, contours } = data
  const system = catalog.systems.find((s) => s.id === input.systemId)
  const lines: Omit<SpecLine, 'price' | 'sum'>[] = []
  const issues: string[] = []
  if (!system) return { lines: [], issues: [`Профильная система не найдена: ${input.systemId}`] }

  // Контекст условий: параметры изделия, перекрытые параметрами конкретной створки.
  const sashParams = new Map<string, Record<string, string>>()
  for (const c of contours) {
    if (c.kind === 'sash') sashParams.set(c.id, { ...input.params, ...(c.params ?? {}) })
  }
  const ctxOfContour = (contourId: string) => sashParams.get(contourId) ?? input.params
  const ctxOfField = (fieldId: string) => {
    const sash = contours.find((c) => c.kind === 'sash' && c.fieldId === fieldId)
    return sash ? ctxOfContour(sash.id) : input.params
  }

  // 1. Спецификация профилей: сам артикул, армирование, уплотнение, работы.
  for (const el of elements) {
    const profile = system.profiles.find((p) => p.id === el.systemProfileId)
    if (!profile) {
      issues.push(`Профиль системы не найден: ${el.systemProfileId}`)
      continue
    }
    const base: RuleBase = { width: el.length, height: 0, length: el.length }
    const ctx = ctxOfContour(el.contourId)
    for (const item of profile.spec.filter((i) => i.enabled && matchConditions(i.conditions, ctx, catalog))) {
      lines.push(applySpecItem(item, base, catalog, `${profile.name} (${el.contourId}/${el.side})`))
    }
  }

  // 2. Заполнения: состав стеклопакета + спецификация системного заполнения.
  for (const g of glazings) {
    const glazing = catalog.glazings.find((x) => x.id === g.glazingId)
    if (glazing) {
      const perimeter = 2 * (g.size.w + g.size.h)
      for (const el of glazing.elements) {
        const material = materialById(catalog, el.materialId)
        lines.push(
          el.by === 'area'
            ? {
                materialId: material.id,
                name: material.name,
                unit: material.unit,
                kind: material.kind,
                colorRule: 'none',
                qty: 1,
                length: g.size.w,
                width: g.size.h,
                amount: g.areaM2,
                source: `${glazing.name} (${g.label})`,
              }
            : {
                materialId: material.id,
                name: material.name,
                unit: material.unit,
                kind: material.kind,
                colorRule: 'none',
                qty: 1,
                length: perimeter,
                amount: perimeter / 1000,
                source: `${glazing.name} (${g.label})`,
              },
        )
      }
    }
    const filling = system.fillings.find((f) => f.id === g.fillingId)
    if (filling) {
      const base: RuleBase = { width: g.size.w, height: g.size.h, length: 2 * (g.size.w + g.size.h) }
      const ctx = ctxOfField(g.fieldId)
      for (const item of filling.spec.filter((i) => i.enabled && matchConditions(i.conditions, ctx, catalog))) {
        lines.push(applySpecItem(item, base, catalog, `${filling.name} (${g.label})`))
      }
    }
  }

  // 3. Створки: фурнитура по диапазону фальца (ФШ×ФВ).
  for (const c of contours.filter((x) => x.kind === 'sash' && x.falz)) {
    const falz = c.falz!
    const variant = catalog.hardware.find((h) => h.id === c.hardwareVariantId)
    if (!variant) {
      issues.push(`${c.label ?? 'Створка'}: не выбран вариант фурнитуры`)
      continue
    }
    if (falz.w > variant.maxFw || falz.h > variant.maxFh) {
      issues.push(
        `${c.label ?? 'Створка'}: фальц ${falz.w}×${falz.h} мм превышает предел варианта «${variant.name}» (${variant.maxFw}×${variant.maxFh} мм)`,
      )
    }
    if (c.massKg && c.massKg > variant.maxSashMass) {
      issues.push(
        `${c.label ?? 'Створка'}: масса ${c.massKg} кг превышает предел варианта «${variant.name}» (${variant.maxSashMass} кг)`,
      )
    }
    const range = variant.ranges.find(
      (r) => falz.w >= r.fw[0] && falz.w <= r.fw[1] && falz.h >= r.fh[0] && falz.h <= r.fh[1],
    )
    if (!range) {
      issues.push(
        `${c.label ?? 'Створка'}: в варианте «${variant.name}» нет диапазона комплектации для фальца ${falz.w}×${falz.h} мм`,
      )
      continue
    }
    const ctx = ctxOfContour(c.id)
    for (const it of range.items.filter((i) => matchConditions(i.conditions, ctx, catalog))) {
      const material = materialById(catalog, it.materialId)
      lines.push({
        materialId: material.id,
        name: material.name,
        unit: material.unit,
        kind: material.kind,
        colorRule: 'asBase',
        qty: it.qty,
        amount: it.qty,
        source: `${variant.name} (${c.label ?? c.id})`,
      })
    }
  }

  // 4. Спецификация уровня изделия: сварка, сборка, упаковка.
  const productBase: RuleBase = {
    width: input.width,
    height: input.height,
    length: 2 * (input.width + input.height),
  }
  for (const item of system.spec.filter((i) => i.enabled && matchConditions(i.conditions, input.params, catalog))) {
    lines.push(applySpecItem(item, productBase, catalog, `Изделие · ${system.name}`))
  }

  return { lines: lines.map((l) => ({ ...l, price: 0, sum: 0 })), issues }
}

/** Свёртка спецификации по материалу и размеру детали — для отчётов и раскроя. */
export function groupSpec(lines: SpecLine[]): SpecLine[] {
  const map = new Map<string, SpecLine>()
  for (const line of lines) {
    const key = [line.materialId, line.length ?? '', line.width ?? '', line.colorRule ?? ''].join('|')
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
