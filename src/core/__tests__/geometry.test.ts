import { describe, expect, it } from 'vitest'
import { calcProduct } from '../calc'
import { computeGeometry } from '../geometry'
import { newProduct, splitField, listFields, setFill } from '../scene'
import { applyRule, baseValue, roundStep } from '../spec'
import { catalog } from '../../catalog'
import type { ProductInput } from '../types'

/** Контрольный кейс плана §11.5. */
function singleSash(): ProductInput {
  const product = newProduct({ width: 920, height: 1620 })
  const fieldId = listFields(product.root)[0]
  return {
    ...product,
    root: setFill(product.root, fieldId, {
      type: 'sash',
      opening: 'turnTilt',
      handle: 'right',
      glazingId: 'GL-24-STD',
      hardwareVariantId: 'HW-TT-STD',
    }),
  }
}

describe('геометрическое ядро', () => {
  it('рама 920×1620 -> створка 844×1544 -> СП 666×1366', () => {
    const geometry = computeGeometry(singleSash(), catalog)
    const sash = geometry.contours.find((c) => c.kind === 'sash')!
    expect([sash.rect.w, sash.rect.h]).toEqual([844, 1544])
    const glazing = geometry.glazings[0]
    expect([glazing.size.w, glazing.size.h]).toEqual([666, 1366])
  })

  it('фальцевые размеры створки = световой проём рамы', () => {
    const geometry = computeGeometry(singleSash(), catalog)
    const sash = geometry.contours.find((c) => c.kind === 'sash')!
    expect(sash.falz).toEqual({ w: 780, h: 1480 })
  })

  it('глухое изделие: СП = световой проём рамы + 2 фальца', () => {
    const geometry = computeGeometry(newProduct({ width: 1000, height: 1000 }), catalog)
    // 1000 - 2*70 = 860; 860 + 2*19 = 898
    expect(geometry.glazings[0].size).toEqual({ w: 898, h: 898 })
  })

  it('длины профилей рамы на сварном угле равны габариту', () => {
    const geometry = computeGeometry(newProduct({ width: 1200, height: 1500 }), catalog)
    const frame = geometry.elements.filter((e) => e.role === 'frame')
    expect(frame.map((e) => e.length).sort((a, b) => a - b)).toEqual([1200, 1200, 1500, 1500])
  })

  it('импост: длина = проём + 2 смещения соединения, поля уменьшаются на его ширину', () => {
    const base = newProduct({ width: 1500, height: 1400 })
    const product = { ...base, root: splitField(base.root, listFields(base.root)[0], 'v', 0.5) }
    const geometry = computeGeometry(product, catalog)
    const impost = geometry.elements.find((e) => e.role === 'impost')!
    // проём по высоте 1400 - 2*70 = 1260; + 2*19 = 1298
    expect(impost.length).toBe(1298)
    // проём по ширине 1500 - 140 = 1360; минус импост 82 -> 1278 на два поля
    const widths = geometry.fields.map((f) => Math.round(f.rect.w))
    expect(widths.reduce((a, b) => a + b, 0)).toBe(1278)
  })

  it('положение импоста округляется до целого мм при любой доле деления', () => {
    const base = newProduct({ width: 2100, height: 1500 })
    const product = { ...base, root: splitField(base.root, listFields(base.root)[0], 'v', 0.4137) }
    const geometry = computeGeometry(product, catalog)
    for (const g of geometry.glazings) {
      expect(Number.isInteger(g.size.w)).toBe(true)
      expect(Number.isInteger(g.size.h)).toBe(true)
    }
    for (const c of geometry.contours) {
      expect(Number.isInteger(Math.round(c.rect.w))).toBe(true)
      expect(c.rect.w % 1).toBe(0)
    }
  })

  it('вторая система считается по своим цифрам (нет хардкода)', () => {
    const product = newProduct({ width: 1000, height: 1000, systemId: 'SYS-BL60' })
    const geometry = computeGeometry(product, catalog)
    // 1000 - 2*58 = 884; + 2*17 = 918
    expect(geometry.glazings[0].size).toEqual({ w: 918, h: 918 })
  })
})

describe('движок спецификации «Вид расчёта»', () => {
  it('базы расчёта', () => {
    const b = { width: 1000, height: 2000 }
    expect(baseValue('total', b)).toBe(1)
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

  it('1D: длина = Округл((База + Добавка) · Коэффициент, Шаг)', () => {
    const rule = catalog.rules.find((r) => r.id === 'R-REINF-FRAME')!
    const line = applyRule(rule, { width: 1620, height: 0 }, catalog, 'test')
    expect(line.length).toBe(1560) // (1620 - 60) * 1, шаг 5
    expect(line.amount).toBeCloseTo(1.56, 3)
  })

  it('0D по площади: количество = Кол · База', () => {
    const rule = catalog.rules.find((r) => r.id === 'R-WORK-ASSEMBLY')!
    const line = applyRule(rule, { width: 1000, height: 2000 }, catalog, 'test')
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
    const result = calcProduct(singleSash(), catalog)
    const names = result.spec.map((l) => l.name)
    expect(names).toContain('Комплект поворотно-откидной, большой')
    expect(names).toContain('Ручка оконная')
  })

  it('наценка за цвет применяется только к окрашиваемым материалам', () => {
    const white = calcProduct(singleSash(), catalog)
    const oak = calcProduct({ ...singleSash(), colorId: 'COL-OAK' }, catalog)
    expect(oak.price).toBeGreaterThan(white.price)
    const glassWhite = white.spec.find((l) => l.materialId === 'M-GLASS-4')!
    const glassOak = oak.spec.find((l) => l.materialId === 'M-GLASS-4')!
    expect(glassOak.price).toBe(glassWhite.price)
  })

  it('нарушение применимости заполнения попадает в issues', () => {
    const product = newProduct({ width: 2400, height: 2400 })
    const result = calcProduct(product, catalog)
    expect(result.issues.join(" ")).toMatch(/площадь СП|вне диапазона/)
  })

  it('цена монотонна по размеру', () => {
    const small = calcProduct(newProduct({ width: 800, height: 800 }), catalog)
    const big = calcProduct(newProduct({ width: 1200, height: 1200 }), catalog)
    expect(big.price).toBeGreaterThan(small.price)
  })
})
