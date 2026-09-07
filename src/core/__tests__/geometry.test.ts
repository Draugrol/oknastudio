import { describe, expect, it } from 'vitest'
import { calcProduct } from '../calc'
import { computeGeometry } from '../geometry'
import { newProduct, splitField, listFields, setFill } from '../scene'
import { applySpecItem, baseValue, roundStep } from '../spec'
import { defaultCatalog } from '../../catalog/defaults'
import type { Catalog, ProductInput, SpecItem } from '../types'

const catalog = defaultCatalog
const clone = (): Catalog => structuredClone(defaultCatalog)

/** Контрольный кейс плана §11.5. */
function singleSash(cat: Catalog = catalog): ProductInput {
  const product = newProduct(cat, { width: 920, height: 1620 })
  const fieldId = listFields(product.root)[0]
  return {
    ...product,
    root: setFill(product.root, fieldId, {
      type: 'sash',
      opening: 'turnTilt',
      handle: 'right',
      glazingId: 'GL-24-STD',
      hardwareVariantId: 'HW-TT-STD',
      params: {},
    }),
  }
}

describe('геометрическое ядро', () => {
  it('рама 920×1620 -> створка 844×1544 -> СП 666×1366', () => {
    const geometry = computeGeometry(singleSash(), catalog)
    const sash = geometry.contours.find((c) => c.kind === 'sash')!
    expect([sash.rect.w, sash.rect.h]).toEqual([844, 1544])
    expect([geometry.glazings[0].size.w, geometry.glazings[0].size.h]).toEqual([666, 1366])
  })

  it('фальцевые размеры створки = световой проём рамы', () => {
    const geometry = computeGeometry(singleSash(), catalog)
    expect(geometry.contours.find((c) => c.kind === 'sash')!.falz).toEqual({ w: 780, h: 1480 })
  })

  it('глухое изделие: СП = световой проём рамы + dW/dH заполнения', () => {
    const geometry = computeGeometry(newProduct(catalog, { width: 1000, height: 1000 }), catalog)
    // 1000 - 2*70 = 860; 860 + 38 = 898
    expect(geometry.glazings[0].size).toEqual({ w: 898, h: 898 })
  })

  it('длины профилей рамы на сварном угле равны габариту', () => {
    const geometry = computeGeometry(newProduct(catalog, { width: 1200, height: 1500 }), catalog)
    const frame = geometry.elements.filter((e) => e.role === 'frame')
    expect(frame.map((e) => e.length).sort((a, b) => a - b)).toEqual([1200, 1200, 1500, 1500])
  })

  it('импост: длина = проём + 2 × размер соединения «Импост — Т»', () => {
    const base = newProduct(catalog, { width: 1500, height: 1400 })
    const product = { ...base, root: splitField(base.root, listFields(base.root)[0], 'v', 0.5) }
    const geometry = computeGeometry(product, catalog)
    // проём по высоте 1400 - 140 = 1260; + 2*19 = 1298
    expect(geometry.elements.find((e) => e.role === 'impost')!.length).toBe(1298)
    // проём по ширине 1360 минус импост 82 -> 1278 на два поля
    expect(geometry.fields.reduce((a, f) => a + Math.round(f.rect.w), 0)).toBe(1278)
  })

  it('положение импоста округляется до целого мм при любой доле деления', () => {
    const base = newProduct(catalog, { width: 2100, height: 1500 })
    const product = { ...base, root: splitField(base.root, listFields(base.root)[0], 'v', 0.4137) }
    const geometry = computeGeometry(product, catalog)
    for (const g of geometry.glazings) {
      expect(Number.isInteger(g.size.w)).toBe(true)
      expect(Number.isInteger(g.size.h)).toBe(true)
    }
    for (const c of geometry.contours) expect(c.rect.w % 1).toBe(0)
  })

  it('вторая система считается по своим цифрам (нет хардкода)', () => {
    const product = newProduct(catalog, { width: 1000, height: 1000, systemId: 'SYS-BL60' })
    const geometry = computeGeometry(product, catalog)
    // 1000 - 2*58 = 884; + 34 = 918
    expect(geometry.glazings[0].size).toEqual({ w: 918, h: 918 })
  })
})

describe('правка справочника меняет расчёт', () => {
  it('«Прилегания»: изменение dW двигает габарит створки', () => {
    const cat = clone()
    const system = cat.systems.find((s) => s.id === 'SYS-SL70')!
    system.adjacencies.find((a) => a.parent === 'frame')!.dW = 40
    const geometry = computeGeometry(singleSash(cat), cat)
    // 780 + 40 = 820 вместо 844
    expect(geometry.contours.find((c) => c.kind === 'sash')!.rect.w).toBe(820)
  })

  it('«Контура»: смена профиля стороны меняет световой проём', () => {
    const cat = clone()
    const system = cat.systems.find((s) => s.id === 'SYS-SL70')!
    system.contours.find((c) => c.isFrame)!.bottom = 'SP-SL70-IMPOST' // 82 мм вместо 70
    const geometry = computeGeometry(newProduct(cat, { width: 1000, height: 1000 }), cat)
    // высота проёма 1000 - 70 - 82 = 848; + 38 = 886
    expect(geometry.glazings[0].size.h).toBe(886)
  })

  it('«Соединения»: размер «Импост — Т» меняет длину импоста', () => {
    const cat = clone()
    const system = cat.systems.find((s) => s.id === 'SYS-SL70')!
    system.joints.find((j) => j.kind === 'impostT')!.size = 23
    const base = newProduct(cat, { width: 1500, height: 1400 })
    const product = { ...base, root: splitField(base.root, listFields(base.root)[0], 'v', 0.5) }
    const geometry = computeGeometry(product, cat)
    expect(geometry.elements.find((e) => e.role === 'impost')!.length).toBe(1306)
  })

  it('«Спецификация профиля»: новая строка попадает в расчёт и в цену', () => {
    const cat = clone()
    const system = cat.systems.find((s) => s.id === 'SYS-SL70')!
    const frame = system.profiles.find((p) => p.role === 'frame')!
    const item: SpecItem = {
      id: 'SI-TEST', enabled: true, materialId: 'W-WELD', colorRule: 'none',
      count: 2, base: 'total', size: 0, coef: 1, step: 0, conditions: [],
    }
    const before = calcProduct(singleSash(cat), cat).price
    frame.spec.push(item)
    const after = calcProduct(singleSash(cat), cat)
    // 4 стороны рамы × 2 шт × 55 ₽
    expect(after.price - before).toBeCloseTo(440, 2)
  })

  it('выключенная строка спецификации не считается', () => {
    const cat = clone()
    const system = cat.systems.find((s) => s.id === 'SYS-SL70')!
    const frame = system.profiles.find((p) => p.role === 'frame')!
    const before = calcProduct(singleSash(cat), cat).price
    frame.spec.find((i) => i.materialId === 'M-REINF-FRAME')!.enabled = false
    expect(calcProduct(singleSash(cat), cat).price).toBeLessThan(before)
  })

  it('незаполненный контур не роняет расчёт, а даёт замечание', () => {
    const cat = clone()
    const system = cat.systems.find((s) => s.id === 'SYS-SL70')!
    system.adjacencies = []
    const result = calcProduct(singleSash(cat), cat)
    expect(result.issues.join(' ')).toMatch(/прилегание/i)
  })
})

describe('параметры и условия', () => {
  const sashWith = (params: Record<string, string>): ProductInput => {
    const product = singleSash()
    const fieldId = listFields(product.root)[0]
    return {
      ...product,
      root: setFill(product.root, fieldId, {
        type: 'sash', opening: 'turnTilt', handle: 'right',
        glazingId: 'GL-24-STD', hardwareVariantId: 'HW-TT-STD', params,
      }),
    }
  }

  it('[Цвет ручки = Белый] ставит белую ручку, [= Коричневый] — коричневую', () => {
    const white = calcProduct(sashWith({ 'PAR-HANDLE-COLOR': 'Белый' }), catalog).spec.map((l) => l.name)
    const brown = calcProduct(sashWith({ 'PAR-HANDLE-COLOR': 'Коричневый' }), catalog).spec.map((l) => l.name)
    expect(white).toContain('Ручка оконная белая')
    expect(white).not.toContain('Ручка оконная коричневая')
    expect(brown).toContain('Ручка оконная коричневая')
    expect(brown).not.toContain('Ручка оконная белая')
  })

  it('незаданный параметр берётся из значения по умолчанию справочника', () => {
    const names = calcProduct(sashWith({}), catalog).spec.map((l) => l.name)
    expect(names).toContain('Ручка оконная белая')
  })

  it('[Детский замок = да] добавляет позицию, [= нет] — нет', () => {
    const off = calcProduct(sashWith({ 'PAR-CHILD-LOCK': 'нет' }), catalog).spec.map((l) => l.name)
    const on = calcProduct(sashWith({ 'PAR-CHILD-LOCK': 'да' }), catalog).spec.map((l) => l.name)
    expect(off).not.toContain('Детский замок')
    expect(on).toContain('Детский замок')
  })

  it('параметр изделия меняет строку спецификации профиля', () => {
    const base = singleSash()
    const black = calcProduct({ ...base, params: { 'PAR-SEAL-COLOR': 'Чёрный' } }, catalog).spec.map((l) => l.name)
    const grey = calcProduct({ ...base, params: { 'PAR-SEAL-COLOR': 'Серый' } }, catalog).spec.map((l) => l.name)
    expect(black).toContain('Уплотнитель рамный EPDM чёрный')
    expect(grey).toContain('Уплотнитель рамный EPDM серый')
    expect(grey).not.toContain('Уплотнитель рамный EPDM чёрный')
  })

  it('параметр створки перекрывает параметр изделия', () => {
    const product = sashWith({ 'PAR-HANDLE-COLOR': 'Серебристый' })
    const names = calcProduct({ ...product, params: { 'PAR-HANDLE-COLOR': 'Белый' } }, catalog).spec.map((l) => l.name)
    expect(names).toContain('Ручка оконная серебристая')
  })
})

describe('поле без заполнения', () => {
  it('пустой проём не даёт стеклопакета и дешевле застеклённого', () => {
    const glazed = newProduct(catalog, { width: 1000, height: 1000 })
    const empty: ProductInput = {
      ...glazed,
      root: setFill(glazed.root, listFields(glazed.root)[0], { type: 'glass', glazingId: '' }),
    }
    const a = calcProduct(glazed, catalog)
    const b = calcProduct(empty, catalog)
    expect(a.glazings).toHaveLength(1)
    expect(b.glazings).toHaveLength(0)
    expect(b.price).toBeLessThan(a.price)
    expect(b.issues).toEqual([])
  })

  it('створка без заполнения считается, но без СП', () => {
    const product = singleSash()
    const fieldId = listFields(product.root)[0]
    const withoutGlass: ProductInput = {
      ...product,
      root: setFill(product.root, fieldId, {
        type: 'sash', opening: 'turnTilt', handle: 'right',
        glazingId: '', hardwareVariantId: 'HW-TT-STD', params: {},
      }),
    }
    const calc = calcProduct(withoutGlass, catalog)
    expect(calc.glazings).toHaveLength(0)
    expect(calc.contours.filter((c) => c.kind === 'sash')).toHaveLength(1)
  })
})

describe('движок спецификации «Вид расчёта»', () => {
  const item = (o: Partial<SpecItem>): SpecItem => ({
    id: 'X', enabled: true, materialId: 'M-REINF-FRAME', colorRule: 'none',
    count: 1, base: 'length', size: 0, coef: 1, step: 0, conditions: [], ...o,
  })

  it('базы расчёта', () => {
    const b = { width: 1000, height: 2000, length: 6000 }
    expect(baseValue('total', b)).toBe(1)
    expect(baseValue('length', b)).toBe(6000)
    expect(baseValue('width', b)).toBe(1000)
    expect(baseValue('height', b)).toBe(2000)
    expect(baseValue('perimeter', b)).toBe(6000)
    expect(baseValue('area', b)).toBe(2)
  })

  it('округление с шагом', () => {
    expect(roundStep(1237, 5)).toBe(1235)
    expect(roundStep(1238, 5)).toBe(1240)
    expect(roundStep(1237.4, 0)).toBe(1237.4)
  })

  it('1D: длина = Округл((База + Размер) · Коэфф., Шаг)', () => {
    const line = applySpecItem(item({ size: -60, step: 5 }), { width: 0, height: 0, length: 1620 }, catalog, 't')
    expect(line.length).toBe(1560)
    expect(line.amount).toBeCloseTo(1.56, 3)
  })

  it('0D по площади: количество = Кол · База', () => {
    const line = applySpecItem(
      item({ materialId: 'W-ASSEMBLY', base: 'area' }),
      { width: 1000, height: 2000, length: 0 },
      catalog,
      't',
    )
    expect(line.qty).toBe(2)
  })
})

describe('расчёт изделия целиком', () => {
  it('спецификация содержит профиль, стекло, фурнитуру и работы; цена положительна', () => {
    const result = calcProduct(singleSash(), catalog)
    const kinds = new Set(result.spec.map((l) => l.kind))
    expect(kinds.has('profile')).toBe(true)
    expect(kinds.has('sheet')).toBe(true)
    expect(kinds.has('piece')).toBe(true)
    expect(kinds.has('work')).toBe(true)
    expect(result.price).toBeGreaterThan(0)
    expect(result.issues).toEqual([])
  })

  it('фурнитура подобрана по диапазону фальца 780×1480', () => {
    const names = calcProduct(singleSash(), catalog).spec.map((l) => l.name)
    expect(names).toContain('Комплект поворотно-откидной, большой')
  })

  it('масса створки считается по её профилям и заполнению', () => {
    const calc = calcProduct(singleSash(), catalog)
    const sash = calc.contours.find((c) => c.kind === 'sash')!
    expect(sash.massKg).toBeGreaterThan(20)
    expect(sash.massKg).toBeLessThan(calc.massKg)
  })

  it('цена берётся по цвету изделия из цен материала, а не по коэффициенту', () => {
    const white = calcProduct(singleSash(), catalog)
    const oak = calcProduct({ ...singleSash(), colorId: 'COL-OAK' }, catalog)
    const frameWhite = white.spec.find((l) => l.materialId === 'M-SL70-FRAME')!
    const frameOak = oak.spec.find((l) => l.materialId === 'M-SL70-FRAME')!
    expect(frameWhite.price).toBe(620)
    expect(frameOak.price).toBe(837) // задано в справочнике явно
    // стекло без цветовой группы — цена не меняется
    expect(oak.spec.find((l) => l.materialId === 'M-GLASS-4')!.price).toBe(
      white.spec.find((l) => l.materialId === 'M-GLASS-4')!.price,
    )
    expect(oak.price).toBeGreaterThan(white.price)
  })

  it('цвет вне списка цен материала считается по базовой цене', () => {
    const cat = clone()
    cat.materials.find((m) => m.id === 'M-SL70-FRAME')!.prices = [{ colorId: 'COL-WHITE', price: 620 }]
    const oak = calcProduct({ ...singleSash(cat), colorId: 'COL-OAK' }, cat)
    expect(oak.spec.find((l) => l.materialId === 'M-SL70-FRAME')!.price).toBe(620)
  })

  it('размерность строки берётся из типа материала', () => {
    const result = calcProduct(singleSash(), catalog)
    // длинновой материал даёт длину детали, штучный — только количество
    expect(result.spec.find((l) => l.materialId === 'M-SEAL-FRAME')!.length).toBeGreaterThan(0)
    expect(result.spec.find((l) => l.materialId === 'M-HW-HINGE')!.length).toBeUndefined()
  })

  it('нарушение применимости заполнения попадает в issues', () => {
    const result = calcProduct(newProduct(catalog, { width: 2400, height: 2400 }), catalog)
    expect(result.issues.join(' ')).toMatch(/площадь СП|вне диапазона/)
  })

  it('цена монотонна по размеру', () => {
    const small = calcProduct(newProduct(catalog, { width: 800, height: 800 }), catalog)
    const big = calcProduct(newProduct(catalog, { width: 1200, height: 1200 }), catalog)
    expect(big.price).toBeGreaterThan(small.price)
  })
})
