/**
 * Оркестратор расчёта изделия: геометрия -> спецификация -> цена.
 * Чистая функция без побочных эффектов (план §3): её же реализует будущее серверное ядро.
 */
import type { Catalog, CalcResult, ProductInput } from './types'
import { computeGeometry } from './geometry'
import { computeSpec, groupSpec } from './spec'
import { priceSpec, specTotal } from './pricing'
import { materialById } from './geometry'

export function calcProduct(input: ProductInput, catalog: Catalog): CalcResult {
  const geometry = computeGeometry(input, catalog)
  const { lines, issues: specIssues } = computeSpec(
    { input, elements: geometry.elements, glazings: geometry.glazings, contours: geometry.contours },
    catalog,
  )
  const priced = priceSpec(lines, catalog, input.colorId)
  const spec = groupSpec(priced)
  const price = specTotal(priced)

  const profileMass = geometry.elements.reduce((acc, el) => {
    const geom = materialById(catalog, el.materialId).geometry
    return acc + ((geom?.massPerMeter ?? 0) * el.length) / 1000
  }, 0)
  const glassMass = geometry.glazings.reduce((acc, g) => acc + g.massKg, 0)

  return {
    input,
    contours: geometry.contours,
    elements: geometry.elements,
    glazings: geometry.glazings,
    fields: geometry.fields.map((f) => ({ id: f.id, rect: f.rect })),
    splits: geometry.splits,
    spec,
    areaM2: round3((input.width * input.height) / 1_000_000),
    perimeter: 2 * (input.width + input.height),
    massKg: round2(profileMass + glassMass),
    price,
    total: round2(price * input.qty),
    issues: [...geometry.issues, ...specIssues],
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100
const round3 = (v: number) => Math.round(v * 1000) / 1000
