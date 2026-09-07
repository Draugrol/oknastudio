/**
 * Геометрическое ядро (план §6.1).
 *
 * Чистые функции: на вход входная модель изделия + срез справочников,
 * на выход — контуры, элементы, заполнения. Ни UI, ни БД.
 *
 * Конвенция координат: начало — левый нижний угол наружного габарита рамы,
 * X вправо, Y вверх, все размеры в миллиметрах.
 *
 * Контрольный кейс (план §11.5): рама 920×1620 -> створка 844×1544 -> СП 666×1366.
 */
import type {
  Catalog,
  CalcContour,
  CalcElement,
  CalcGlazing,
  ProductInput,
  ProfileGeometry,
  ProfileRole,
  Rect,
  SceneNode,
} from './types'

export interface GeometryResult {
  contours: CalcContour[]
  elements: CalcElement[]
  glazings: CalcGlazing[]
  /** Световые проёмы полей (для отрисовки и подписи размеров). */
  fields: { id: string; rect: Rect; neighbors: Neighbors }[]
  /** Узлы деления: проём родителя и тело импоста — нужны редактору для перетаскивания. */
  splits: { id: string; dir: 'v' | 'h'; region: Rect; rect: Rect }[]
  imposts: CalcElement[]
  issues: string[]
}

export type Neighbors = Record<'left' | 'right' | 'top' | 'bottom', ProfileRole>

const round = (v: number) => Math.round(v * 10) / 10

export function findSystem(catalog: Catalog, id: string) {
  const s = catalog.systems.find((x) => x.id === id)
  if (!s) throw new Error(`Профильная система не найдена: ${id}`)
  return s
}

export function materialById(catalog: Catalog, id: string) {
  const m = catalog.materials.find((x) => x.id === id)
  if (!m) throw new Error(`Материал не найден: ${id}`)
  return m
}

/** Геометрия профиля системы по роли. Хардкода ролей вне справочника нет. */
export function profileGeometry(
  catalog: Catalog,
  systemId: string,
  role: ProfileRole,
): { materialId: string; geom: ProfileGeometry } {
  const system = findSystem(catalog, systemId)
  const materialId = system.profiles[role]
  if (!materialId) throw new Error(`В системе «${system.name}» не задан профиль роли «${role}»`)
  const material = materialById(catalog, materialId)
  if (!material.geometry) throw new Error(`У материала «${material.name}» не заполнена геометрия`)
  return { materialId, geom: material.geometry }
}

export function computeGeometry(input: ProductInput, catalog: Catalog): GeometryResult {
  const system = findSystem(catalog, input.systemId)
  const frame = profileGeometry(catalog, input.systemId, 'frame')

  const contours: CalcContour[] = []
  const elements: CalcElement[] = []
  const glazings: CalcGlazing[] = []
  const imposts: CalcElement[] = []
  const fields: GeometryResult['fields'] = []
  const splits: GeometryResult['splits'] = []
  const issues: string[] = []

  const outer: Rect = { x: 0, y: 0, w: input.width, h: input.height }
  const frameLight = inset(outer, frame.geom.faceWidth)

  contours.push({ id: 'C1', kind: 'frame', parentId: null, rect: outer, light: frameLight })
  elements.push(...rectangleContour('C1', 'frame', frame.materialId, outer))

  const neighbors: Neighbors = { left: 'frame', right: 'frame', top: 'frame', bottom: 'frame' }
  walk(input.root, frameLight, neighbors)

  return { contours, elements, glazings, fields, splits, imposts, issues }

  function walk(node: SceneNode, region: Rect, nb: Neighbors) {
    if (node.kind === 'split') {
      const impost = profileGeometry(catalog, input.systemId, 'impost')
      const iw = impost.geom.faceWidth
      const vertical = node.dir === 'v'
      const span = vertical ? region.w : region.h
      if (span < iw + 2 * 50) {
        issues.push(`Поле слишком мало для импоста (${Math.round(span)} мм)`)
      }
      const cut = clamp(node.ratio, 0.08, 0.92) * span
      // Положение импоста округляется до целого мм: производство не режет доли миллиметра.
      const start = Math.round((vertical ? region.x : region.y) + cut - iw / 2)

      const rect: Rect = vertical
        ? { x: start, y: region.y, w: iw, h: region.h }
        : { x: region.x, y: start, w: region.w, h: iw }

      // Примыкание 90° к телу: деталь заходит в фальц соседнего профиля с двух сторон.
      const length = (vertical ? region.h : region.w) + 2 * system.joints.impost
      imposts.push({
        id: `E-${node.id}`,
        contourId: 'C1',
        role: 'impost',
        materialId: impost.materialId,
        length: round(length),
        side: 'mid',
        cut: [90, 90],
        rect,
      })
      elements.push(imposts[imposts.length - 1])
      splits.push({ id: node.id, dir: node.dir, region, rect })

      const first: Rect = vertical
        ? { x: region.x, y: region.y, w: rect.x - region.x, h: region.h }
        : { x: region.x, y: rect.y + rect.h, w: region.w, h: region.y + region.h - (rect.y + rect.h) }
      const second: Rect = vertical
        ? { x: rect.x + rect.w, y: region.y, w: region.x + region.w - (rect.x + rect.w), h: region.h }
        : { x: region.x, y: region.y, w: region.w, h: rect.y - region.y }

      // Первый потомок — слева (для 'v') либо сверху (для 'h').
      walk(node.children[0], first, vertical ? { ...nb, right: 'impost' } : { ...nb, bottom: 'impost' })
      walk(node.children[1], second, vertical ? { ...nb, left: 'impost' } : { ...nb, top: 'impost' })
      return
    }

    fields.push({ id: node.id, rect: region, neighbors: { ...nb } })

    if (node.fill.type === 'glass') {
      glazings.push(makeGlazing(node.id, node.fill.glazingId, expandByFalz(region, nb)))
      return
    }

    // Створка: наружный габарит = световой проём родителя + наплав с каждой стороны.
    const sash = profileGeometry(catalog, input.systemId, 'sash')
    const sashRect = expandByOverlap(region, nb)
    const sashLight = inset(sashRect, sash.geom.faceWidth)
    const contourId = `C-${node.id}`

    contours.push({
      id: contourId,
      kind: 'sash',
      label: `Створка №${contours.filter((c) => c.kind === 'sash').length + 1}`,
      parentId: 'C1',
      rect: sashRect,
      light: sashLight,
      fieldId: node.id,
      opening: node.fill.opening,
      handle: node.fill.handle,
      hardwareVariantId: node.fill.hardwareVariantId,
      // Фальцевый размер створки = размер светового проёма рамы (габарит минус 2 наплава).
      falz: { w: round(region.w), h: round(region.h) },
    })
    elements.push(...rectangleContour(contourId, 'sash', sash.materialId, sashRect))

    const sashNb: Neighbors = { left: 'sash', right: 'sash', top: 'sash', bottom: 'sash' }
    glazings.push(makeGlazing(node.id, node.fill.glazingId, expandByFalz(sashLight, sashNb)))
  }

  function makeGlazing(fieldId: string, glazingId: string, rect: Rect): CalcGlazing {
    const label = `Заполнение №${glazings.length + 1}`
    const glazing = catalog.glazings.find((g) => g.id === glazingId)
    const size = { w: round(rect.w), h: round(rect.h) }
    const areaM2 = (size.w * size.h) / 1_000_000
    const problems: string[] = []
    let massKg = 0
    if (!glazing) {
      problems.push(`Заполнение не найдено: ${glazingId}`)
    } else {
      const a = glazing.applicability
      if (size.w < a.minW || size.w > a.maxW)
        problems.push(`${label}: ширина СП ${size.w} мм вне диапазона ${a.minW}–${a.maxW} мм`)
      if (size.h < a.minH || size.h > a.maxH)
        problems.push(`${label}: высота СП ${size.h} мм вне диапазона ${a.minH}–${a.maxH} мм`)
      if (areaM2 > a.maxArea)
        problems.push(`${label}: площадь СП ${areaM2.toFixed(2)} м² больше допустимых ${a.maxArea} м²`)
      const perimeterM = (2 * (size.w + size.h)) / 1000
      massKg = glazing.elements.reduce(
        (acc, el) => acc + (el.by === 'area' ? el.mass * areaM2 : el.mass * perimeterM),
        0,
      )
    }
    issues.push(...problems)
    return {
      id: `G-${fieldId}`,
      label,
      fieldId,
      glazingId,
      rect,
      size,
      areaM2: Math.round(areaM2 * 1000) / 1000,
      massKg: Math.round(massKg * 100) / 100,
      issues: problems,
    }
  }

  /** Заполнение заходит под профиль на глубину фальца соседа с каждой стороны. */
  function expandByFalz(rect: Rect, nb: Neighbors): Rect {
    const f = (role: ProfileRole) => profileGeometry(catalog, input.systemId, role).geom.falz
    return expand(rect, f(nb.left), f(nb.right), f(nb.top), f(nb.bottom))
  }

  /** Створка перекрывает соседний профиль на величину наплава. */
  function expandByOverlap(rect: Rect, nb: Neighbors): Rect {
    const o = (role: ProfileRole) => profileGeometry(catalog, input.systemId, role).geom.overlap
    return expand(rect, o(nb.left), o(nb.right), o(nb.top), o(nb.bottom))
  }
}

/* ───────────────────────────── помощники ───────────────────────────── */

export function inset(r: Rect, d: number): Rect {
  return { x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d }
}

export function expand(r: Rect, left: number, right: number, top: number, bottom: number): Rect {
  return { x: r.x - left, y: r.y - bottom, w: r.w + left + right, h: r.h + top + bottom }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

/** Прямоугольный контур на сварных углах 45/45: длина детали = габарит контура. */
function rectangleContour(
  contourId: string,
  role: ProfileRole,
  materialId: string,
  rect: Rect,
): CalcElement[] {
  const sides: { side: CalcElement['side']; length: number }[] = [
    { side: 'bottom', length: rect.w },
    { side: 'top', length: rect.w },
    { side: 'left', length: rect.h },
    { side: 'right', length: rect.h },
  ]
  return sides.map((s) => ({
    id: `${contourId}-${s.side}`,
    contourId,
    role,
    materialId,
    length: round(s.length),
    side: s.side,
    cut: [45, 45] as [number, number],
    rect,
  }))
}
