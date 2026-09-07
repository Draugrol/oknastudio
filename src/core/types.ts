/**
 * Доменные типы. Соответствие плану (см. README):
 *  - справочники   -> §2, §5.1
 *  - входная модель -> §5.4 (аналог SCHEME2)
 *  - расчётные структуры -> §6
 *
 * Правило из практики IT Окна: материалы профилей принадлежат системе.
 * Глобальных «профиль рамы» нет — только через настройки профильной системы.
 */

/* ─────────────────────────── Справочники ─────────────────────────── */

export type MaterialKind = 'profile' | 'sheet' | 'piece' | 'work'
/** Роль профиля внутри системы. */
export type ProfileRole = 'frame' | 'sash' | 'impost' | 'shtulp' | 'sill' | 'bead' | 'reinforcement'

/** Геометрия профиля в плане, мм. Все размеры — от наружного края профиля. */
export interface ProfileGeometry {
  /** Ширина в плане: от наружного края до светового проёма. */
  faceWidth: number
  /** Наплав: на сколько прилегающий контур (створка) заходит на этот профиль. */
  overlap: number
  /** Глубина фальца: на сколько заполнение заходит под профиль. */
  falz: number
  /** Монтажная глубина (ось Z), мм. */
  depth: number
  /** Масса погонного метра, кг/м. */
  massPerMeter: number
}

export interface Material {
  id: string
  code: string
  name: string
  kind: MaterialKind
  /** Единица измерения для отчётов: м, м², шт, ч. */
  unit: string
  /** Цена за единицу в валюте справочника. */
  price: number
  group: string
  /** Только для kind === 'profile'. */
  geometry?: ProfileGeometry
  /** Материал имеет цветовые исполнения (наценка за цвет применяется). */
  colored?: boolean
}

export interface ColorScheme {
  id: string
  name: string
  /** Наценка к цене окрашиваемых материалов, коэффициент. */
  markup: number
  /** Цвет для отрисовки в редакторе. */
  render: { outer: string; inner: string; edge: string }
}

/** Элемент состава заполнения: стекло, дистанционная рамка, плёнка. */
export interface GlazingElement {
  name: string
  /** Толщина, мм. */
  thickness: number
  /** Масса на м² (для стекла) либо на пог. м (для рамки). */
  mass: number
  materialId: string
  /** Вид расчёта элемента: по площади либо по периметру. */
  by: 'area' | 'perimeter'
}

export interface Glazing {
  id: string
  name: string
  elements: GlazingElement[]
  /** Применимость на ВЫЧИСЛЕННОМ размере СП (план §6.4), мм и м². */
  applicability: { minW: number; maxW: number; minH: number; maxH: number; maxArea: number }
}

export type OpeningType = 'fix' | 'turn' | 'turnTilt' | 'tilt'

/** Вариант комплектации фурнитуры: диапазоны фальца -> материалы. */
export interface HardwareRange {
  /** Фальцевая ширина, мм. */
  fw: [number, number]
  /** Фальцевая высота, мм. */
  fh: [number, number]
  items: { materialId: string; qty: number }[]
}

export interface HardwareVariant {
  id: string
  name: string
  opening: OpeningType
  /** Максимальная масса створки, кг. */
  maxSashMass: number
  /** Максимальные размеры створки по фальцу, мм. */
  maxFw: number
  maxFh: number
  ranges: HardwareRange[]
}

/** База расчёта «Вида расчёта» (план §6.2). */
export type CalcBase = 'total' | 'width' | 'height' | 'perimeter' | 'area'
/** Размерность детали спецификации. */
export type CalcDim = '0D' | '1D' | '2D'

export interface SpecRule {
  id: string
  name: string
  /** К чему привязано правило. */
  source: 'element' | 'glazing' | 'sash' | 'product' | 'joint'
  /** Фильтр по роли профиля / типу открывания; пусто — применять ко всем. */
  role?: ProfileRole
  opening?: OpeningType
  materialId: string
  base: CalcBase
  dim: CalcDim
  /** Коэффициент к базовому размеру. */
  coef: number
  /** Добавка к базовому размеру, мм (до умножения на коэффициент). */
  addition: number
  /** Шаг округления результата, мм (0 — без округления). */
  step: number
  /** Количество на единицу базы. */
  count: number
}

export interface ProfileSystem {
  id: string
  name: string
  /** Вид построения: от какой стороны строится изделие. */
  buildFrom: 'inside' | 'outside'
  /** Материалы профилей по ролям — только внутри системы. */
  profiles: Record<ProfileRole, string | undefined>
  /** Допустимые заполнения. */
  glazingIds: string[]
  /** Допустимые варианты фурнитуры. */
  hardwareVariantIds: string[]
  /** Смещения соединений, мм: на сколько деталь заходит в соседний профиль. */
  joints: { impost: number; sash: number }
  /** Параметры системы (план §2, SPR_PR_SYS_PARAMS). */
  params: { name: string; values: string[]; level: 'product' | 'contour' | 'sash' }[]
  /** Правила спецификации системы. */
  specRuleIds: string[]
}

export interface Catalog {
  materials: Material[]
  colors: ColorScheme[]
  glazings: Glazing[]
  hardware: HardwareVariant[]
  systems: ProfileSystem[]
  rules: SpecRule[]
  currency: { code: string; symbol: string }
}

/* ───────────────────── Входная модель изделия (§5.4) ───────────────────── */

export type FieldFill =
  | { type: 'glass'; glazingId: string }
  | {
      type: 'sash'
      opening: OpeningType
      handle: 'left' | 'right'
      glazingId: string
      hardwareVariantId: string
    }

export interface FieldNode {
  kind: 'field'
  id: string
  fill: FieldFill
}

export interface SplitNode {
  kind: 'split'
  id: string
  /** 'v' — вертикальный импост (делит по ширине), 'h' — горизонтальный. */
  dir: 'v' | 'h'
  /** Доля первого потомка в световом проёме родителя, 0..1. */
  ratio: number
  children: [SceneNode, SceneNode]
}

export type SceneNode = FieldNode | SplitNode

export interface ProductInput {
  id: string
  systemId: string
  colorId: string
  /** Габарит по наружному краю рамы, мм. */
  width: number
  height: number
  qty: number
  params: Record<string, string>
  root: SceneNode
}

/* ─────────────────────── Расчётные структуры (§6) ─────────────────────── */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type ContourKind = 'frame' | 'sash'

/** Профильная деталь контура. */
export interface CalcElement {
  id: string
  contourId: string
  role: ProfileRole
  materialId: string
  /** Длина заготовки, мм. */
  length: number
  /** Сторона контура. */
  side: 'left' | 'right' | 'top' | 'bottom' | 'mid'
  /** Тип реза по концам. */
  cut: [number, number]
  rect: Rect
}

export interface CalcContour {
  id: string
  /** Человекочитаемое обозначение для сообщений и печатных форм. */
  label?: string
  kind: ContourKind
  parentId: string | null
  /** Габарит контура (наружный), мм. */
  rect: Rect
  /** Световой проём контура, мм. */
  light: Rect
  fieldId?: string
  opening?: OpeningType
  handle?: 'left' | 'right'
  hardwareVariantId?: string
  /** Размеры по фальцу (ФШ×ФВ) — база расчёта фурнитуры (§6.3). */
  falz?: { w: number; h: number }
}

export interface CalcGlazing {
  id: string
  label: string
  fieldId: string
  glazingId: string
  rect: Rect
  /** Габарит стеклопакета, мм. */
  size: { w: number; h: number }
  areaM2: number
  massKg: number
  /** Нарушения применимости (§6.4). */
  issues: string[]
}

export interface SpecLine {
  materialId: string
  name: string
  unit: string
  kind: MaterialKind
  qty: number
  /** Длина детали, мм (1D/2D). */
  length?: number
  /** Ширина детали, мм (2D). */
  width?: number
  /** Итоговое количество в единицах материала (м, м², шт). */
  amount: number
  price: number
  sum: number
  source: string
}

export interface CalcResult {
  input: ProductInput
  contours: CalcContour[]
  elements: CalcElement[]
  glazings: CalcGlazing[]
  /** Световые проёмы полей — для отрисовки и подписи размеров. */
  fields: { id: string; rect: Rect }[]
  /** Узлы деления: проём родителя и тело импоста. */
  splits: { id: string; dir: 'v' | 'h'; region: Rect; rect: Rect }[]
  spec: SpecLine[]
  /** Площадь изделия, м². */
  areaM2: number
  /** Периметр изделия, мм. */
  perimeter: number
  massKg: number
  /** Цена за единицу изделия. */
  price: number
  /** Цена с учётом количества. */
  total: number
  issues: string[]
}
