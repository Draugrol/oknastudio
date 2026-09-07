/**
 * Заводской срез справочников — стартовые данные.
 * Рабочая копия живёт в src/store/catalog.ts, правится в разделе «Справочники»
 * и хранится локально; этот файл — то, к чему возвращает «Сбросить к заводским».
 *
 * ВАЖНО: геометрия профилей, прилегания, соединения и цены — стартовые.
 * Их обязан подтвердить технолог по узлам системы. Значения VEKA Softline 70
 * подобраны под контрольный кейс плана §11.5:
 *   рама 920×1620 -> створка 844×1544 -> СП 666×1366.
 */
import type { Catalog, CalcBase, CalcDim, SpecItem } from '../core/types'

let seq = 0
const sid = (p: string) => `${p}${++seq}`

/** Строка спецификации со значениями по умолчанию — как «Добавить» в IT Окна. */
function spec(
  materialId: string,
  o: Partial<Omit<SpecItem, 'id' | 'materialId'>> & { base?: CalcBase; dim?: CalcDim } = {},
): SpecItem {
  return {
    id: sid('SI'),
    enabled: true,
    materialId,
    colorRule: 'own',
    count: 1,
    base: 'length',
    size: 0,
    coef: 1,
    step: 0,
    dim: '1D',
    ...o,
  }
}

export const defaultCatalog: Catalog = {
  currency: { code: 'RUB', symbol: '₽' },

  colors: [
    { id: 'COL-WHITE', name: 'Белый', markup: 1, render: { outer: '#f4f6f8', inner: '#e9edf1', edge: '#b9c2cc' } },
    { id: 'COL-OAK', name: 'Золотой дуб (ламинация снаружи)', markup: 1.35, render: { outer: '#b4823a', inner: '#eef1f4', edge: '#8a6a3a' } },
    { id: 'COL-ANTHRACITE', name: 'Антрацит (ламинация двусторонняя)', markup: 1.55, render: { outer: '#4a4f55', inner: '#4a4f55', edge: '#2f3338' } },
  ],

  materials: [
    /* ── VEKA Softline 70 ── */
    { id: 'M-SL70-FRAME', code: '103.209', name: 'Рама VEKA Softline 70', kind: 'profile', unit: 'м', price: 620, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 70, depth: 70, massPerMeter: 1.25 } },
    { id: 'M-SL70-SASH', code: '103.380', name: 'Створка VEKA Softline 70', kind: 'profile', unit: 'м', price: 720, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 108, depth: 70, massPerMeter: 1.6 } },
    { id: 'M-SL70-IMPOST', code: '103.191', name: 'Импост VEKA Softline 70', kind: 'profile', unit: 'м', price: 690, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 82, depth: 70, massPerMeter: 1.5 } },
    { id: 'M-SL70-BEAD', code: '103.585', name: 'Штапик VEKA Softline 70', kind: 'profile', unit: 'м', price: 145, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 20, depth: 24, massPerMeter: 0.18 } },

    /* ── REHAU Blitz 60 (контрольная вторая система) ── */
    { id: 'M-BL60-FRAME', code: '213.001', name: 'Рама REHAU Blitz 60', kind: 'profile', unit: 'м', price: 480, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 58, depth: 60, massPerMeter: 1.1 } },
    { id: 'M-BL60-SASH', code: '213.002', name: 'Створка REHAU Blitz 60', kind: 'profile', unit: 'м', price: 560, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 96, depth: 60, massPerMeter: 1.42 } },
    { id: 'M-BL60-IMPOST', code: '213.003', name: 'Импост REHAU Blitz 60', kind: 'profile', unit: 'м', price: 520, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 76, depth: 60, massPerMeter: 1.32 } },
    { id: 'M-BL60-BEAD', code: '213.010', name: 'Штапик REHAU Blitz 60', kind: 'profile', unit: 'м', price: 130, group: 'Профиль ПВХ', colored: true, geometry: { faceWidth: 19, depth: 22, massPerMeter: 0.16 } },

    /* ── Армирование ── */
    { id: 'M-REINF-FRAME', code: 'AR-1.5', name: 'Армирование рамное 1.5 мм', kind: 'profile', unit: 'м', price: 210, group: 'Армирование', geometry: { faceWidth: 30, depth: 30, massPerMeter: 1.05 } },
    { id: 'M-REINF-SASH', code: 'AR-1.5S', name: 'Армирование створочное 1.5 мм', kind: 'profile', unit: 'м', price: 230, group: 'Армирование', geometry: { faceWidth: 32, depth: 30, massPerMeter: 1.15 } },
    { id: 'M-REINF-IMPOST', code: 'AR-2.0I', name: 'Армирование импоста 2.0 мм', kind: 'profile', unit: 'м', price: 320, group: 'Армирование', geometry: { faceWidth: 34, depth: 34, massPerMeter: 1.9 } },

    /* ── Уплотнение ── */
    { id: 'M-SEAL-FRAME', code: 'EPDM-F', name: 'Уплотнитель рамный EPDM', kind: 'profile', unit: 'м', price: 42, group: 'Уплотнение' },
    { id: 'M-SEAL-SASH', code: 'EPDM-S', name: 'Уплотнитель створочный EPDM', kind: 'profile', unit: 'м', price: 46, group: 'Уплотнение' },
    { id: 'M-SEAL-GLASS', code: 'EPDM-G', name: 'Уплотнитель стекольный EPDM', kind: 'profile', unit: 'м', price: 38, group: 'Уплотнение' },

    /* ── Стекло и комплектующие СП ── */
    { id: 'M-GLASS-4', code: 'M1-4', name: 'Стекло 4 мм М1', kind: 'sheet', unit: 'м²', price: 480, group: 'Стекло' },
    { id: 'M-GLASS-4I', code: 'I-4', name: 'Стекло 4 мм энергосберегающее', kind: 'sheet', unit: 'м²', price: 760, group: 'Стекло' },
    { id: 'M-SPACER-16', code: 'DR-16', name: 'Дистанционная рамка 16 мм', kind: 'profile', unit: 'м', price: 95, group: 'Стеклопакет' },
    { id: 'M-SPACER-10', code: 'DR-10', name: 'Дистанционная рамка 10 мм', kind: 'profile', unit: 'м', price: 88, group: 'Стеклопакет' },

    /* ── Фурнитура ── */
    { id: 'M-HW-HANDLE', code: 'HW-100', name: 'Ручка оконная', kind: 'piece', unit: 'шт', price: 480, group: 'Фурнитура', colored: true },
    { id: 'M-HW-TT-SET-S', code: 'HW-TT-S', name: 'Комплект поворотно-откидной, малый', kind: 'piece', unit: 'шт', price: 2450, group: 'Фурнитура' },
    { id: 'M-HW-TT-SET-M', code: 'HW-TT-M', name: 'Комплект поворотно-откидной, средний', kind: 'piece', unit: 'шт', price: 2980, group: 'Фурнитура' },
    { id: 'M-HW-TT-SET-L', code: 'HW-TT-L', name: 'Комплект поворотно-откидной, большой', kind: 'piece', unit: 'шт', price: 3640, group: 'Фурнитура' },
    { id: 'M-HW-TURN-SET', code: 'HW-T', name: 'Комплект поворотный', kind: 'piece', unit: 'шт', price: 1650, group: 'Фурнитура' },
    { id: 'M-HW-HINGE', code: 'HW-P', name: 'Петля створки', kind: 'piece', unit: 'шт', price: 390, group: 'Фурнитура' },
    { id: 'M-HW-MICRO', code: 'HW-MV', name: 'Микропроветривание', kind: 'piece', unit: 'шт', price: 260, group: 'Фурнитура' },

    /* ── Работы ── */
    { id: 'W-WELD', code: 'R-01', name: 'Сварка и зачистка угла', kind: 'work', unit: 'шт', price: 55, group: 'Работы' },
    { id: 'W-GLAZE', code: 'R-02', name: 'Остекление', kind: 'work', unit: 'м²', price: 210, group: 'Работы' },
    { id: 'W-ASSEMBLY', code: 'R-03', name: 'Сборка изделия', kind: 'work', unit: 'м²', price: 340, group: 'Работы' },
    { id: 'W-HW-MOUNT', code: 'R-04', name: 'Установка фурнитуры', kind: 'work', unit: 'шт', price: 420, group: 'Работы' },
    { id: 'W-REINF-CUT', code: 'R-05', name: 'Пил армирования', kind: 'work', unit: 'шт', price: 18, group: 'Работы' },
  ],

  glazings: [
    {
      id: 'GL-24-STD',
      name: 'СПД 4-16-4И (24 мм)',
      elements: [
        { id: 'GE1', name: 'Стекло наружное 4 мм', thickness: 4, mass: 10, materialId: 'M-GLASS-4', by: 'area' },
        { id: 'GE2', name: 'Рамка 16 мм', thickness: 16, mass: 0.12, materialId: 'M-SPACER-16', by: 'perimeter' },
        { id: 'GE3', name: 'Стекло внутреннее 4 мм И', thickness: 4, mass: 10, materialId: 'M-GLASS-4I', by: 'area' },
      ],
      applicability: { minW: 200, maxW: 2000, minH: 200, maxH: 2500, maxArea: 4 },
    },
    {
      id: 'GL-32-ENERGY',
      name: 'СПО 4-10-4-10-4И (32 мм)',
      elements: [
        { id: 'GE4', name: 'Стекло наружное 4 мм', thickness: 4, mass: 10, materialId: 'M-GLASS-4', by: 'area' },
        { id: 'GE5', name: 'Рамка 10 мм', thickness: 10, mass: 0.1, materialId: 'M-SPACER-10', by: 'perimeter' },
        { id: 'GE6', name: 'Стекло среднее 4 мм', thickness: 4, mass: 10, materialId: 'M-GLASS-4', by: 'area' },
        { id: 'GE7', name: 'Рамка 10 мм', thickness: 10, mass: 0.1, materialId: 'M-SPACER-10', by: 'perimeter' },
        { id: 'GE8', name: 'Стекло внутреннее 4 мм И', thickness: 4, mass: 10, materialId: 'M-GLASS-4I', by: 'area' },
      ],
      applicability: { minW: 250, maxW: 1800, minH: 250, maxH: 2300, maxArea: 3.5 },
    },
  ],

  hardware: [
    {
      id: 'HW-TT-STD',
      name: 'Поворотно-откидная, стандарт',
      opening: 'turnTilt',
      maxSashMass: 100,
      maxFw: 1000,
      maxFh: 2000,
      ranges: [
        { id: 'HR1', fw: [300, 700], fh: [400, 1000], items: [{ id: 'HI1', materialId: 'M-HW-TT-SET-S', qty: 1 }, { id: 'HI2', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI3', materialId: 'M-HW-HINGE', qty: 2 }, { id: 'HI4', materialId: 'W-HW-MOUNT', qty: 1 }] },
        { id: 'HR2', fw: [300, 700], fh: [1000, 1600], items: [{ id: 'HI5', materialId: 'M-HW-TT-SET-M', qty: 1 }, { id: 'HI6', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI7', materialId: 'M-HW-HINGE', qty: 2 }, { id: 'HI8', materialId: 'M-HW-MICRO', qty: 1 }, { id: 'HI9', materialId: 'W-HW-MOUNT', qty: 1 }] },
        { id: 'HR3', fw: [300, 700], fh: [1600, 2000], items: [{ id: 'HI10', materialId: 'M-HW-TT-SET-L', qty: 1 }, { id: 'HI11', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI12', materialId: 'M-HW-HINGE', qty: 3 }, { id: 'HI13', materialId: 'M-HW-MICRO', qty: 1 }, { id: 'HI14', materialId: 'W-HW-MOUNT', qty: 1 }] },
        { id: 'HR4', fw: [700, 1000], fh: [400, 1000], items: [{ id: 'HI15', materialId: 'M-HW-TT-SET-M', qty: 1 }, { id: 'HI16', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI17', materialId: 'M-HW-HINGE', qty: 2 }, { id: 'HI18', materialId: 'W-HW-MOUNT', qty: 1 }] },
        { id: 'HR5', fw: [700, 1000], fh: [1000, 1600], items: [{ id: 'HI19', materialId: 'M-HW-TT-SET-L', qty: 1 }, { id: 'HI20', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI21', materialId: 'M-HW-HINGE', qty: 3 }, { id: 'HI22', materialId: 'M-HW-MICRO', qty: 1 }, { id: 'HI23', materialId: 'W-HW-MOUNT', qty: 1 }] },
        { id: 'HR6', fw: [700, 1000], fh: [1600, 2000], items: [{ id: 'HI24', materialId: 'M-HW-TT-SET-L', qty: 1 }, { id: 'HI25', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI26', materialId: 'M-HW-HINGE', qty: 3 }, { id: 'HI27', materialId: 'M-HW-MICRO', qty: 1 }, { id: 'HI28', materialId: 'W-HW-MOUNT', qty: 1 }] },
      ],
    },
    {
      id: 'HW-TURN-STD',
      name: 'Поворотная, стандарт',
      opening: 'turn',
      maxSashMass: 80,
      maxFw: 900,
      maxFh: 1800,
      ranges: [
        { id: 'HR7', fw: [300, 900], fh: [400, 1200], items: [{ id: 'HI29', materialId: 'M-HW-TURN-SET', qty: 1 }, { id: 'HI30', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI31', materialId: 'M-HW-HINGE', qty: 2 }, { id: 'HI32', materialId: 'W-HW-MOUNT', qty: 1 }] },
        { id: 'HR8', fw: [300, 900], fh: [1200, 1800], items: [{ id: 'HI33', materialId: 'M-HW-TURN-SET', qty: 1 }, { id: 'HI34', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI35', materialId: 'M-HW-HINGE', qty: 3 }, { id: 'HI36', materialId: 'W-HW-MOUNT', qty: 1 }] },
      ],
    },
    {
      id: 'HW-TILT-STD',
      name: 'Откидная (фрамужная)',
      opening: 'tilt',
      maxSashMass: 60,
      maxFw: 1600,
      maxFh: 900,
      ranges: [
        { id: 'HR9', fw: [300, 1600], fh: [300, 900], items: [{ id: 'HI37', materialId: 'M-HW-TURN-SET', qty: 1 }, { id: 'HI38', materialId: 'M-HW-HANDLE', qty: 1 }, { id: 'HI39', materialId: 'M-HW-HINGE', qty: 2 }, { id: 'HI40', materialId: 'W-HW-MOUNT', qty: 1 }] },
      ],
    },
  ],

  systems: [
    {
      id: 'SYS-SL70',
      name: 'VEKA Softline 70',
      group: 'VEKA',
      enabled: true,
      buildFrom: 'inside',
      glazingIds: ['GL-24-STD', 'GL-32-ENERGY'],
      hardwareVariantIds: ['HW-TT-STD', 'HW-TURN-STD', 'HW-TILT-STD'],
      params: [
        { id: 'PP1', name: 'Цвет уплотнения', values: ['Чёрный', 'Серый'], level: 'product' },
        { id: 'PP2', name: 'Направление открывания', values: ['Левое', 'Правое'], level: 'sash' },
      ],
      profiles: [
        {
          id: 'SP-SL70-FRAME', name: 'Рама 70 Softline', enabled: true, role: 'frame', materialId: 'M-SL70-FRAME',
          spec: [
            spec('M-SL70-FRAME', { base: 'length', dim: '1D', step: 1 }),
            spec('M-REINF-FRAME', { base: 'length', dim: '1D', size: -60, step: 5, colorRule: 'none' }),
            spec('M-SEAL-FRAME', { base: 'length', dim: '1D', step: 1, colorRule: 'none' }),
            spec('W-REINF-CUT', { base: 'total', dim: '0D', count: 1, colorRule: 'none' }),
          ],
        },
        {
          id: 'SP-SL70-SASH', name: 'Створка 108 Softline', enabled: true, role: 'sash', materialId: 'M-SL70-SASH',
          spec: [
            spec('M-SL70-SASH', { base: 'length', dim: '1D', step: 1 }),
            spec('M-REINF-SASH', { base: 'length', dim: '1D', size: -50, step: 5, colorRule: 'none' }),
            spec('M-SEAL-SASH', { base: 'length', dim: '1D', step: 1, colorRule: 'none' }),
          ],
        },
        {
          id: 'SP-SL70-IMPOST', name: 'Импост 82 Softline', enabled: true, role: 'impost', materialId: 'M-SL70-IMPOST',
          spec: [
            spec('M-SL70-IMPOST', { base: 'length', dim: '1D', step: 1 }),
            spec('M-REINF-IMPOST', { base: 'length', dim: '1D', size: -30, step: 5, colorRule: 'none' }),
          ],
        },
      ],
      contours: [
        { id: 'CT-SL70-FRAME', name: 'Рама', enabled: true, isFrame: true, isSash: false, bottom: 'SP-SL70-FRAME', left: 'SP-SL70-FRAME', top: 'SP-SL70-FRAME', right: 'SP-SL70-FRAME', dividerH: 'SP-SL70-IMPOST', dividerV: 'SP-SL70-IMPOST', fillingId: 'FL-SL70-FRAME' },
        { id: 'CT-SL70-SASH', name: 'Створка', enabled: true, isFrame: false, isSash: true, bottom: 'SP-SL70-SASH', left: 'SP-SL70-SASH', top: 'SP-SL70-SASH', right: 'SP-SL70-SASH', dividerH: 'SP-SL70-IMPOST', dividerV: 'SP-SL70-IMPOST', fillingId: 'FL-SL70-SASH' },
      ],
      adjacencies: [
        { id: 'ADJ-SL70-1', name: 'Створка / рама', enabled: true, parent: 'frame', dW: 64, dH: 64 },
        { id: 'ADJ-SL70-2', name: 'Створка / импост', enabled: true, parent: 'impost', dW: 64, dH: 64 },
      ],
      joints: [
        { id: 'J-SL70-1', name: 'Рама — угол', enabled: true, kind: 'corner', role: 'frame', size: 0 },
        { id: 'J-SL70-2', name: 'Створка — угол', enabled: true, kind: 'corner', role: 'sash', size: 0 },
        { id: 'J-SL70-3', name: 'Импост — Т', enabled: true, kind: 'impostT', role: 'impost', size: 19 },
      ],
      fillings: [
        {
          id: 'FL-SL70-FRAME', name: 'Заполнение / рама', enabled: true, target: 'frame', dW: 38, dH: 38,
          spec: [
            spec('M-SL70-BEAD', { base: 'perimeter', dim: '1D', step: 1 }),
            spec('M-SEAL-GLASS', { base: 'perimeter', dim: '1D', coef: 2, step: 1, colorRule: 'none' }),
            spec('W-GLAZE', { base: 'area', dim: '0D', colorRule: 'none' }),
          ],
        },
        {
          id: 'FL-SL70-SASH', name: 'Заполнение / створка', enabled: true, target: 'sash', dW: 38, dH: 38,
          spec: [
            spec('M-SL70-BEAD', { base: 'perimeter', dim: '1D', step: 1 }),
            spec('M-SEAL-GLASS', { base: 'perimeter', dim: '1D', coef: 2, step: 1, colorRule: 'none' }),
            spec('W-GLAZE', { base: 'area', dim: '0D', colorRule: 'none' }),
          ],
        },
      ],
      spec: [
        spec('W-WELD', { base: 'total', dim: '0D', count: 4, colorRule: 'none' }),
        spec('W-ASSEMBLY', { base: 'area', dim: '0D', colorRule: 'none' }),
      ],
    },

    {
      id: 'SYS-BL60',
      name: 'REHAU Blitz 60',
      group: 'REHAU',
      enabled: true,
      buildFrom: 'inside',
      glazingIds: ['GL-24-STD'],
      hardwareVariantIds: ['HW-TT-STD', 'HW-TURN-STD'],
      params: [{ id: 'PP3', name: 'Цвет уплотнения', values: ['Чёрный'], level: 'product' }],
      profiles: [
        {
          id: 'SP-BL60-FRAME', name: 'Рама 58 Blitz', enabled: true, role: 'frame', materialId: 'M-BL60-FRAME',
          spec: [
            spec('M-BL60-FRAME', { base: 'length', dim: '1D', step: 1 }),
            spec('M-REINF-FRAME', { base: 'length', dim: '1D', size: -60, step: 5, colorRule: 'none' }),
            spec('M-SEAL-FRAME', { base: 'length', dim: '1D', step: 1, colorRule: 'none' }),
          ],
        },
        {
          id: 'SP-BL60-SASH', name: 'Створка 96 Blitz', enabled: true, role: 'sash', materialId: 'M-BL60-SASH',
          spec: [
            spec('M-BL60-SASH', { base: 'length', dim: '1D', step: 1 }),
            spec('M-REINF-SASH', { base: 'length', dim: '1D', size: -50, step: 5, colorRule: 'none' }),
            spec('M-SEAL-SASH', { base: 'length', dim: '1D', step: 1, colorRule: 'none' }),
          ],
        },
        {
          id: 'SP-BL60-IMPOST', name: 'Импост 76 Blitz', enabled: true, role: 'impost', materialId: 'M-BL60-IMPOST',
          spec: [
            spec('M-BL60-IMPOST', { base: 'length', dim: '1D', step: 1 }),
            spec('M-REINF-IMPOST', { base: 'length', dim: '1D', size: -30, step: 5, colorRule: 'none' }),
          ],
        },
      ],
      contours: [
        { id: 'CT-BL60-FRAME', name: 'Рама', enabled: true, isFrame: true, isSash: false, bottom: 'SP-BL60-FRAME', left: 'SP-BL60-FRAME', top: 'SP-BL60-FRAME', right: 'SP-BL60-FRAME', dividerH: 'SP-BL60-IMPOST', dividerV: 'SP-BL60-IMPOST', fillingId: 'FL-BL60-FRAME' },
        { id: 'CT-BL60-SASH', name: 'Створка', enabled: true, isFrame: false, isSash: true, bottom: 'SP-BL60-SASH', left: 'SP-BL60-SASH', top: 'SP-BL60-SASH', right: 'SP-BL60-SASH', dividerH: 'SP-BL60-IMPOST', dividerV: 'SP-BL60-IMPOST', fillingId: 'FL-BL60-SASH' },
      ],
      adjacencies: [
        { id: 'ADJ-BL60-1', name: 'Створка / рама', enabled: true, parent: 'frame', dW: 52, dH: 52 },
        { id: 'ADJ-BL60-2', name: 'Створка / импост', enabled: true, parent: 'impost', dW: 52, dH: 52 },
      ],
      joints: [
        { id: 'J-BL60-1', name: 'Рама — угол', enabled: true, kind: 'corner', role: 'frame', size: 0 },
        { id: 'J-BL60-2', name: 'Створка — угол', enabled: true, kind: 'corner', role: 'sash', size: 0 },
        { id: 'J-BL60-3', name: 'Импост — Т', enabled: true, kind: 'impostT', role: 'impost', size: 17 },
      ],
      fillings: [
        {
          id: 'FL-BL60-FRAME', name: 'Заполнение / рама', enabled: true, target: 'frame', dW: 34, dH: 34,
          spec: [
            spec('M-BL60-BEAD', { base: 'perimeter', dim: '1D', step: 1 }),
            spec('M-SEAL-GLASS', { base: 'perimeter', dim: '1D', coef: 2, step: 1, colorRule: 'none' }),
            spec('W-GLAZE', { base: 'area', dim: '0D', colorRule: 'none' }),
          ],
        },
        {
          id: 'FL-BL60-SASH', name: 'Заполнение / створка', enabled: true, target: 'sash', dW: 34, dH: 34,
          spec: [
            spec('M-BL60-BEAD', { base: 'perimeter', dim: '1D', step: 1 }),
            spec('M-SEAL-GLASS', { base: 'perimeter', dim: '1D', coef: 2, step: 1, colorRule: 'none' }),
            spec('W-GLAZE', { base: 'area', dim: '0D', colorRule: 'none' }),
          ],
        },
      ],
      spec: [
        spec('W-WELD', { base: 'total', dim: '0D', count: 4, colorRule: 'none' }),
        spec('W-ASSEMBLY', { base: 'area', dim: '0D', colorRule: 'none' }),
      ],
    },
  ],
}
