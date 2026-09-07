/**
 * Геометрическое ядро (план §6.1).
 *
 * Чистые функции: вход — модель изделия и срез справочников, выход — контуры,
 * профильные детали и заполнения. Ни UI, ни хранилища.
 *
 * Всё выводится из настроек системы: «Контура» задают профиль каждой стороны,
 * «Прилегания» (dW/dH) — посадку створки на родительский профиль, «Соединения»
 * (Размер) — добавку к длине детали, «Заполнения» (dW/dH) — габарит стеклопакета.
 *
 * Конвенция координат: начало — левый нижний угол наружного габарита рамы,
 * X вправо, Y вверх, размеры в миллиметрах.
 *
 * Контрольный кейс (план §11.5): рама 920×1620 -> створка 844×1544 -> СП 666×1366.
 */
import type {
  Catalog,
  CalcContour,
  CalcElement,
  CalcGlazing,
  ContourType,
  Material,
  ProductInput,
  ProfileRole,
  ProfileSystem,
  Rect,
  SceneNode,
  SystemProfile,
} from './types'

export interface GeometryResult {
  contours: CalcContour[]
  elements: CalcElement[]
  glazings: CalcGlazing[]
  fields: { id: string; rect: Rect; neighbors: Neighbors }[]
  splits: { id: string; dir: 'v' | 'h'; region: Rect; rect: Rect }[]
  imposts: CalcElement[]
  issues: string[]
}

export type Side = 'left' | 'right' | 'top' | 'bottom'
export type Neighbors = Record<Side, ProfileRole>

const round = (v: number) => Math.round(v * 10) / 10

export function findSystem(catalog: Catalog, id: string): ProfileSystem {
  const s = catalog.systems.find((x) => x.id === id)
  if (!s) throw new Error(`Профильная система не найдена: ${id}`)
  return s
}

export function materialById(catalog: Catalog, id: string): Material {
  const m = catalog.materials.find((x) => x.id === id)
  if (!m) throw new Error(`Материал не найден: ${id}`)
  return m
}

/** Тип контура рамы и створки в системе. */
export function frameContourOf(system: ProfileSystem): ContourType | undefined {
  return system.contours.find((c) => c.enabled && c.isFrame && !c.isSash) ?? system.contours.find((c) => c.enabled)
}
export function sashContourOf(system: ProfileSystem): ContourType | undefined {
  return system.contours.find((c) => c.enabled && c.isSash)
}

export function computeGeometry(input: ProductInput, catalog: Catalog): GeometryResult {
  const system = findSystem(catalog, input.systemId)

  const contours: CalcContour[] = []
  const elements: CalcElement[] = []
  const glazings: CalcGlazing[] = []
  const imposts: CalcElement[] = []
  const fields: GeometryResult['fields'] = []
  const splits: GeometryResult['splits'] = []
  const issues: string[] = []

  const frameContour = frameContourOf(system)
  const sashContour = sashContourOf(system)
  if (!frameContour) {
    issues.push(`В системе «${system.name}» не задан контур рамы (вкладка «Контура»)`)
    return { contours, elements, glazings, fields, splits, imposts, issues }
  }

  const outer: Rect = { x: 0, y: 0, w: input.width, h: input.height }
  const frameLight = insetByContour(frameContour, outer)

  contours.push({
    id: 'C1',
    kind: 'frame',
    parentId: null,
    contourTypeId: frameContour.id,
    rect: outer,
    light: frameLight,
  })
  elements.push(...contourElements('C1', frameContour, outer))

  const neighbors: Neighbors = { left: 'frame', right: 'frame', top: 'frame', bottom: 'frame' }
  walk(input.root, frameLight, neighbors)

  return { contours, elements, glazings, fields, splits, imposts, issues }

  /* ───────────────────────── обход дерева деления ───────────────────────── */

  function walk(node: SceneNode, region: Rect, nb: Neighbors) {
    if (node.kind === 'split') {
      const vertical = node.dir === 'v'
      const dividerId = vertical ? frameContour!.dividerV : frameContour!.dividerH
      const divider = profileOf(dividerId)
      if (!divider) {
        issues.push(`В контуре «${frameContour!.name}» не задан разделитель (импост)`)
        walk(node.children[0], region, nb)
        return
      }
      const iw = faceWidth(divider)
      const span = vertical ? region.w : region.h
      if (span < iw + 100) issues.push(`Поле слишком мало для импоста (${Math.round(span)} мм)`)

      const cut = clamp(node.ratio, 0.08, 0.92) * span
      // Положение импоста округляется до целого мм: производство не режет доли миллиметра.
      const start = Math.round((vertical ? region.x : region.y) + cut - iw / 2)

      const rect: Rect = vertical
        ? { x: start, y: region.y, w: iw, h: region.h }
        : { x: region.x, y: start, w: region.w, h: iw }

      // Примыкание к телу: деталь заходит в соседний профиль с двух сторон.
      const length = (vertical ? region.h : region.w) + 2 * jointSize('impostT', divider.role)
      const element: CalcElement = {
        id: `E-${node.id}`,
        contourId: 'C1',
        role: divider.role,
        systemProfileId: divider.id,
        materialId: divider.materialId,
        length: round(length),
        side: 'mid',
        cut: [90, 90],
        rect,
      }
      imposts.push(element)
      elements.push(element)
      splits.push({ id: node.id, dir: node.dir, region, rect })

      const first: Rect = vertical
        ? { x: region.x, y: region.y, w: rect.x - region.x, h: region.h }
        : { x: region.x, y: rect.y + rect.h, w: region.w, h: region.y + region.h - (rect.y + rect.h) }
      const second: Rect = vertical
        ? { x: rect.x + rect.w, y: region.y, w: region.x + region.w - (rect.x + rect.w), h: region.h }
        : { x: region.x, y: region.y, w: region.w, h: rect.y - region.y }

      walk(node.children[0], first, vertical ? { ...nb, right: divider.role } : { ...nb, bottom: divider.role })
      walk(node.children[1], second, vertical ? { ...nb, left: divider.role } : { ...nb, top: divider.role })
      return
    }

    fields.push({ id: node.id, rect: region, neighbors: { ...nb } })

    if (node.fill.type === 'glass') {
      const filling = fillingOf(frameContour!)
      glazings.push(makeGlazing(node.id, node.fill.glazingId, expandByFilling(region, filling?.dW, filling?.dH), filling?.id))
      return
    }

    if (!sashContour) {
      issues.push(`В системе «${system.name}» не задан контур створки (вкладка «Контура»)`)
      return
    }

    // Створка садится на родительский профиль по «Прилеганию»: dW/dH — суммарная
    // добавка к ширине и высоте относительно светового проёма родителя.
    const sashRect = expand(
      region,
      adjacency(nb.left).dW / 2,
      adjacency(nb.right).dW / 2,
      adjacency(nb.top).dH / 2,
      adjacency(nb.bottom).dH / 2,
    )
    const sashLight = insetByContour(sashContour, sashRect)
    const contourId = `C-${node.id}`

    contours.push({
      id: contourId,
      label: `Створка №${contours.filter((c) => c.kind === 'sash').length + 1}`,
      kind: 'sash',
      parentId: 'C1',
      contourTypeId: sashContour.id,
      rect: sashRect,
      light: sashLight,
      fieldId: node.id,
      opening: node.fill.opening,
      handle: node.fill.handle,
      hardwareVariantId: node.fill.hardwareVariantId,
      // Фальцевый размер створки = световой проём родителя (габарит минус наплав).
      falz: { w: round(region.w), h: round(region.h) },
    })
    elements.push(...contourElements(contourId, sashContour, sashRect))

    const filling = fillingOf(sashContour)
    glazings.push(
      makeGlazing(node.id, node.fill.glazingId, expandByFilling(sashLight, filling?.dW, filling?.dH), filling?.id),
    )
  }

  /* ─────────────────────────── справочные выборки ─────────────────────────── */

  function profileOf(id: string): SystemProfile | undefined {
    return system.profiles.find((p) => p.id === id && p.enabled)
  }

  function faceWidth(profile: SystemProfile | undefined): number {
    if (!profile) return 0
    const material = catalog.materials.find((m) => m.id === profile.materialId)
    if (!material?.geometry) {
      issues.push(`У материала профиля «${profile.name}» не заполнена геометрия`)
      return 0
    }
    return material.geometry.faceWidth
  }

  function jointSize(kind: 'corner' | 'impostT', role: ProfileRole): number {
    return system.joints.find((j) => j.enabled && j.kind === kind && j.role === role)?.size ?? 0
  }

  function adjacency(parent: ProfileRole): { dW: number; dH: number } {
    const found = system.adjacencies.find((a) => a.enabled && a.parent === parent)
    if (!found) {
      issues.push(`Не задано прилегание створки к профилю роли «${roleTitle(parent)}» (вкладка «Прилегания»)`)
      return { dW: 0, dH: 0 }
    }
    return found
  }

  function fillingOf(contour: ContourType) {
    const found = system.fillings.find((f) => f.id === contour.fillingId && f.enabled)
    if (!found) issues.push(`Для контура «${contour.name}» не задано заполнение (вкладка «Заполнения»)`)
    return found
  }

  /** Световой проём контура: отступ каждой стороны по ширине её профиля в плане. */
  function insetByContour(contour: ContourType, rect: Rect): Rect {
    const l = faceWidth(profileOf(contour.left))
    const r = faceWidth(profileOf(contour.right))
    const t = faceWidth(profileOf(contour.top))
    const b = faceWidth(profileOf(contour.bottom))
    return { x: rect.x + l, y: rect.y + b, w: rect.w - l - r, h: rect.h - t - b }
  }

  /** Прямоугольный контур: длина детали = габарит + 2 × размер углового соединения. */
  function contourElements(contourId: string, contour: ContourType, rect: Rect): CalcElement[] {
    const sides: { side: Side; base: number; profileId: string }[] = [
      { side: 'bottom', base: rect.w, profileId: contour.bottom },
      { side: 'top', base: rect.w, profileId: contour.top },
      { side: 'left', base: rect.h, profileId: contour.left },
      { side: 'right', base: rect.h, profileId: contour.right },
    ]
    const result: CalcElement[] = []
    for (const s of sides) {
      const profile = profileOf(s.profileId)
      if (!profile) {
        issues.push(`В контуре «${contour.name}» не задан профиль стороны «${sideTitle(s.side)}»`)
        continue
      }
      result.push({
        id: `${contourId}-${s.side}`,
        contourId,
        role: profile.role,
        systemProfileId: profile.id,
        materialId: profile.materialId,
        length: round(s.base + 2 * jointSize('corner', profile.role)),
        side: s.side,
        cut: [45, 45],
        rect,
      })
    }
    return result
  }

  function expandByFilling(rect: Rect, dW = 0, dH = 0): Rect {
    return expand(rect, dW / 2, dW / 2, dH / 2, dH / 2)
  }

  function makeGlazing(fieldId: string, glazingId: string, rect: Rect, fillingId = ''): CalcGlazing {
    const label = `Заполнение №${glazings.length + 1}`
    const glazing = catalog.glazings.find((g) => g.id === glazingId)
    const size = { w: round(rect.w), h: round(rect.h) }
    const areaM2 = (size.w * size.h) / 1_000_000
    const problems: string[] = []
    let massKg = 0
    if (!glazing) {
      problems.push(`${label}: заполнение не найдено в справочнике`)
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
      fillingId,
      rect,
      size,
      areaM2: Math.round(areaM2 * 1000) / 1000,
      massKg: Math.round(massKg * 100) / 100,
      issues: problems,
    }
  }
}

/* ───────────────────────────── помощники ───────────────────────────── */

export function expand(r: Rect, left: number, right: number, top: number, bottom: number): Rect {
  return { x: r.x - left, y: r.y - bottom, w: r.w + left + right, h: r.h + top + bottom }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export const roleTitle = (role: ProfileRole) =>
  ({
    frame: 'рама',
    sash: 'створка',
    impost: 'импост',
    shtulp: 'штульп',
    bead: 'штапик',
    reinforcement: 'армирование',
    none: 'без роли',
  })[role]

const sideTitle = (side: Side) =>
  ({ left: 'левая', right: 'правая', top: 'верхняя', bottom: 'нижняя' })[side]
