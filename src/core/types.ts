/**
 * Доменные типы.
 *
 * Структура справочников повторяет IT Окна: профильная система содержит
 * «Контура», «Профили», «Прилегания», «Соединения», «Заполнения», «Фурнитуру»
 * и «Параметры», а у профиля и заполнения есть собственная «Спецификация»
 * (Вид расчёта / Размер / Коэфф. / Шаг). Геометрию и стоимость ядро выводит
 * только из этих таблиц — констант конкретной системы в коде нет.
 */

/* ─────────────────────────── Справочники ─────────────────────────── */

export type MaterialKind = 'profile' | 'sheet' | 'piece' | 'work'

/** Роль профиля в контуре. */
export type ProfileRole = 'frame' | 'sash' | 'impost' | 'shtulp' | 'bead' | 'reinforcement' | 'none'

/** Геометрия профиля в плане, мм. Наплав и фальц сюда не входят: это свойства
 *  прилегания и заполнения системы, а не материала (как в IT Окна). */
export interface ProfileGeometry {
  /** Ширина в плане: от наружного края профиля до светового проёма. */
  faceWidth: number
  /** Монтажная глубина, мм. */
  depth: number
  /** Масса погонного метра, кг/м. */
  massPerMeter: number
}

export interface Material {
  id: string
  code: string
  name: string
  kind: MaterialKind
  unit: string
  price: number
  group: string
  geometry?: ProfileGeometry
  /** Материал имеет цветовые исполнения — к цене применяется наценка за цвет. */
  colored?: boolean
}

export interface ColorScheme {
  id: string
  name: string
  /** Коэффициент к цене окрашиваемых материалов. */
  markup: number
  render: { outer: string; inner: string; edge: string }
}

/** Элемент состава стеклопакета: стекло, дистанционная рамка, плёнка. */
export interface GlazingElement {
  id: string
  name: string
  thickness: number
  /** Масса: кг/м² для площадных элементов, кг/м для рамки. */
  mass: number
  materialId: string
  by: 'area' | 'perimeter'
}

export interface Glazing {
  id: string
  name: string
  elements: GlazingElement[]
  /** Применимость проверяется на ВЫЧИСЛЕННОМ размере СП. */
  applicability: { minW: number; maxW: number; minH: number; maxH: number; maxArea: number }
}

export type OpeningType = 'fix' | 'turn' | 'turnTilt' | 'tilt'

export interface HardwareRange {
  id: string
  /** Фальцевая ширина, мм. */
  fw: [number, number]
  /** Фальцевая высота, мм. */
  fh: [number, number]
  items: { id: string; materialId: string; qty: number }[]
}

export interface HardwareVariant {
  id: string
  name: string
  opening: OpeningType
  maxSashMass: number
  maxFw: number
  maxFh: number
  ranges: HardwareRange[]
}

/* ─────────────── Спецификация: «Вид расчёта» (план §6.2) ─────────────── */

/** База расчёта. `length` — «По длине»: база равна длине детали. */
export type CalcBase = 'total' | 'length' | 'width' | 'height' | 'perimeter' | 'area'
export type CalcDim = '0D' | '1D' | '2D'

/** Строка спецификации справочника — одинаковая у профиля, заполнения и изделия. */
export interface SpecItem {
  id: string
  enabled: boolean
  materialId: string
  /** Цвет: собственный / как у базового артикула / без цвета. */
  colorRule: 'own' | 'asBase' | 'none'
  /** Кол — количество на единицу базы. */
  count: number
  base: CalcBase
  /** Размер — добавка к базовому размеру, мм. */
  size: number
  coef: number
  /** Шаг округления, мм (0 — без округления). */
  step: number
  dim: CalcDim
  /** Параметры/условие применимости — пока справочно. */
  note?: string
  tag?: string
}

/* ─────────────────────── Профильная система ─────────────────────── */

export interface SystemProfile {
  id: string
  name: string
  enabled: boolean
  role: ProfileRole
  materialId: string
  /** Спецификация профиля: сам артикул, армирование, крепёж, работы. */
  spec: SpecItem[]
}

/** Тип контура: рама, створка, встраиваемый. Задаёт профиль каждой стороны. */
export interface ContourType {
  id: string
  name: string
  enabled: boolean
  isFrame: boolean
  isSash: boolean
  /** Ссылки на SystemProfile.id по сторонам. */
  bottom: string
  left: string
  top: string
  right: string
  /** Разделители (импосты). */
  dividerH: string
  dividerV: string
  /** Системное заполнение, применяемое в этом контуре. */
  fillingId: string
}

/**
 * Прилегание: как контур-потомок садится на родительский профиль.
 * dW/dH — суммарная добавка к ширине и высоте контура-потомка
 * относительно светового проёма родителя (двойной наплав).
 */
export interface Adjacency {
  id: string
  name: string
  enabled: boolean
  /** Роль родительского профиля, к которому идёт прилегание. */
  parent: ProfileRole
  dW: number
  dH: number
}

/** Соединение: добавка к длине детали с каждой стороны. */
export interface Joint {
  id: string
  name: string
  enabled: boolean
  /** `corner` — угол контура, `impostT` — примыкание импоста к телу. */
  kind: 'corner' | 'impostT'
  role: ProfileRole
  size: number
}

/**
 * Заполнение системы: как стеклопакет садится в контур.
 * dW/dH — суммарная добавка к световому проёму (двойной заход в фальц).
 */
export interface SystemFilling {
  id: string
  name: string
  enabled: boolean
  target: 'frame' | 'sash'
  dW: number
  dH: number
  /** Спецификация заполнения: штапик, уплотнение, работы. */
  spec: SpecItem[]
}

export interface SystemParam {
  id: string
  name: string
  values: string[]
  level: 'product' | 'contour' | 'sash'
}

export interface ProfileSystem {
  id: string
  name: string
  /** Группа для дерева систем. */
  group: string
  enabled: boolean
  buildFrom: 'inside' | 'outside'
  params: SystemParam[]
  contours: ContourType[]
  profiles: SystemProfile[]
  adjacencies: Adjacency[]
  joints: Joint[]
  fillings: SystemFilling[]
  glazingIds: string[]
  hardwareVariantIds: string[]
  /** Спецификация уровня изделия: сварка, сборка, упаковка. */
  spec: SpecItem[]
}

export interface Catalog {
  materials: Material[]
  colors: ColorScheme[]
  glazings: Glazing[]
  hardware: HardwareVariant[]
  systems: ProfileSystem[]
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
  dir: 'v' | 'h'
  ratio: number
  children: [SceneNode, SceneNode]
}

export type SceneNode = FieldNode | SplitNode

export interface ProductInput {
  id: string
  systemId: string
  colorId: string
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

export interface CalcElement {
  id: string
  contourId: string
  role: ProfileRole
  /** Ссылка на SystemProfile, из которого выведена деталь. */
  systemProfileId: string
  materialId: string
  length: number
  side: 'left' | 'right' | 'top' | 'bottom' | 'mid'
  cut: [number, number]
  rect: Rect
}

export interface CalcContour {
  id: string
  label?: string
  kind: ContourKind
  parentId: string | null
  contourTypeId: string
  rect: Rect
  light: Rect
  fieldId?: string
  opening?: OpeningType
  handle?: 'left' | 'right'
  hardwareVariantId?: string
  /** Размеры по фальцу (ФШ×ФВ) — база расчёта фурнитуры. */
  falz?: { w: number; h: number }
}

export interface CalcGlazing {
  id: string
  label: string
  fieldId: string
  glazingId: string
  /** Системное заполнение, по которому вычислен габарит. */
  fillingId: string
  rect: Rect
  size: { w: number; h: number }
  areaM2: number
  massKg: number
  issues: string[]
}

export interface SpecLine {
  materialId: string
  name: string
  unit: string
  kind: MaterialKind
  /** Как применяется наценка за цвет: 'none' — цвет не влияет. */
  colorRule?: 'own' | 'asBase' | 'none'
  qty: number
  length?: number
  width?: number
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
  fields: { id: string; rect: Rect }[]
  splits: { id: string; dir: 'v' | 'h'; region: Rect; rect: Rect }[]
  spec: SpecLine[]
  areaM2: number
  perimeter: number
  massKg: number
  price: number
  total: number
  issues: string[]
}
