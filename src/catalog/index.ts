/**
 * Демонстрационный срез справочников (план §2, §5.1).
 *
 * ВАЖНО: цифры геометрии профилей и цены — стартовые, их обязан подтвердить
 * технолог по узлам системы. Ядро расчёта не содержит ни одной константы
 * конкретной системы: всё берётся отсюда. Вторая система (REHAU Blitz 60)
 * держится в справочнике именно для контроля отсутствия хардкода (план §10).
 *
 * Геометрия VEKA Softline 70 подобрана под контрольный кейс плана §11.5:
 *   рама 920×1620 -> створка 844×1544 -> СП 666×1366.
 */
import type { Catalog } from '../core/types'

export const catalog: Catalog = {
  currency: { code: 'RUB', symbol: '₽' },

  colors: [
    { id: 'COL-WHITE', name: 'Белый', markup: 1, render: { outer: '#f4f6f8', inner: '#e9edf1', edge: '#b9c2cc' } },
    { id: 'COL-OAK', name: 'Золотой дуб (ламинация снаружи)', markup: 1.35, render: { outer: '#b4823a', inner: '#eef1f4', edge: '#8a6a3a' } },
    { id: 'COL-ANTHRACITE', name: 'Антрацит (ламинация двусторонняя)', markup: 1.55, render: { outer: '#4a4f55', inner: '#4a4f55', edge: '#2f3338' } },
  ],

  materials: [
    /* ── VEKA Softline 70 ── */
    { id: 'M-SL70-FRAME', code: '103.209', name: 'Рама VEKA Softline 70', kind: 'profile', unit: 'м', price: 620, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 70, overlap: 32, falz: 19, depth: 70, massPerMeter: 1.25 } },
    { id: 'M-SL70-SASH', code: '103.380', name: 'Створка VEKA Softline 70', kind: 'profile', unit: 'м', price: 720, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 108, overlap: 32, falz: 19, depth: 70, massPerMeter: 1.6 } },
    { id: 'M-SL70-IMPOST', code: '103.191', name: 'Импост VEKA Softline 70', kind: 'profile', unit: 'м', price: 690, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 82, overlap: 32, falz: 19, depth: 70, massPerMeter: 1.5 } },
    { id: 'M-SL70-BEAD', code: '103.585', name: 'Штапик VEKA Softline 70', kind: 'profile', unit: 'м', price: 145, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 20, overlap: 0, falz: 0, depth: 24, massPerMeter: 0.18 } },

    /* ── REHAU Blitz 60 (контрольная вторая система) ── */
    { id: 'M-BL60-FRAME', code: '213.001', name: 'Рама REHAU Blitz 60', kind: 'profile', unit: 'м', price: 480, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 58, overlap: 26, falz: 17, depth: 60, massPerMeter: 1.1 } },
    { id: 'M-BL60-SASH', code: '213.002', name: 'Створка REHAU Blitz 60', kind: 'profile', unit: 'м', price: 560, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 96, overlap: 26, falz: 17, depth: 60, massPerMeter: 1.42 } },
    { id: 'M-BL60-IMPOST', code: '213.003', name: 'Импост REHAU Blitz 60', kind: 'profile', unit: 'м', price: 520, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 76, overlap: 26, falz: 17, depth: 60, massPerMeter: 1.32 } },
    { id: 'M-BL60-BEAD', code: '213.010', name: 'Штапик REHAU Blitz 60', kind: 'profile', unit: 'м', price: 130, group: 'Профиль ПВХ', colored: true,
      geometry: { faceWidth: 19, overlap: 0, falz: 0, depth: 22, massPerMeter: 0.16 } },

    /* ── Армирование ── */
    { id: 'M-REINF-FRAME', code: 'AR-1.5', name: 'Армирование рамное 1.5 мм', kind: 'profile', unit: 'м', price: 210, group: 'Армирование',
      geometry: { faceWidth: 30, overlap: 0, falz: 0, depth: 30, massPerMeter: 1.05 } },
    { id: 'M-REINF-SASH', code: 'AR-1.5S', name: 'Армирование створочное 1.5 мм', kind: 'profile', unit: 'м', price: 230, group: 'Армирование',
      geometry: { faceWidth: 32, overlap: 0, falz: 0, depth: 30, massPerMeter: 1.15 } },
    { id: 'M-REINF-IMPOST', code: 'AR-2.0I', name: 'Армирование импоста 2.0 мм', kind: 'profile', unit: 'м', price: 320, group: 'Армирование',
      geometry: { faceWidth: 34, overlap: 0, falz: 0, depth: 34, massPerMeter: 1.9 } },

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
  ],

  glazings: [
    {
      id: 'GL-24-STD',
      name: 'СПД 4-16-4И (24 мм)',
      elements: [
        { name: 'Стекло наружное 4 мм', thickness: 4, mass: 10, materialId: 'M-GLASS-4', by: 'area' },
        { name: 'Рамка 16 мм', thickness: 16, mass: 0.12, materialId: 'M-SPACER-16', by: 'perimeter' },
        { name: 'Стекло внутреннее 4 мм И', thickness: 4, mass: 10, materialId: 'M-GLASS-4I', by: 'area' },
      ],
      applicability: { minW: 200, maxW: 2000, minH: 200, maxH: 2500, maxArea: 4 },
    },
    {
      id: 'GL-32-ENERGY',
      name: 'СПО 4-10-4-10-4И (32 мм)',
      elements: [
        { name: 'Стекло наружное 4 мм', thickness: 4, mass: 10, materialId: 'M-GLASS-4', by: 'area' },
        { name: 'Рамка 10 мм', thickness: 10, mass: 0.1, materialId: 'M-SPACER-10', by: 'perimeter' },
        { name: 'Стекло среднее 4 мм', thickness: 4, mass: 10, materialId: 'M-GLASS-4', by: 'area' },
        { name: 'Рамка 10 мм', thickness: 10, mass: 0.1, materialId: 'M-SPACER-10', by: 'perimeter' },
        { name: 'Стекло внутреннее 4 мм И', thickness: 4, mass: 10, materialId: 'M-GLASS-4I', by: 'area' },
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
        { fw: [300, 700], fh: [400, 1000], items: [{ materialId: 'M-HW-TT-SET-S', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 2 }] },
        { fw: [300, 700], fh: [1000, 1600], items: [{ materialId: 'M-HW-TT-SET-M', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 2 }, { materialId: 'M-HW-MICRO', qty: 1 }] },
        { fw: [300, 700], fh: [1600, 2000], items: [{ materialId: 'M-HW-TT-SET-L', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 3 }, { materialId: 'M-HW-MICRO', qty: 1 }] },
        { fw: [700, 1000], fh: [400, 1000], items: [{ materialId: 'M-HW-TT-SET-M', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 2 }] },
        { fw: [700, 1000], fh: [1000, 1600], items: [{ materialId: 'M-HW-TT-SET-L', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 3 }, { materialId: 'M-HW-MICRO', qty: 1 }] },
        { fw: [700, 1000], fh: [1600, 2000], items: [{ materialId: 'M-HW-TT-SET-L', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 3 }, { materialId: 'M-HW-MICRO', qty: 1 }] },
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
        { fw: [300, 900], fh: [400, 1200], items: [{ materialId: 'M-HW-TURN-SET', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 2 }] },
        { fw: [300, 900], fh: [1200, 1800], items: [{ materialId: 'M-HW-TURN-SET', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 3 }] },
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
        { fw: [300, 1600], fh: [300, 900], items: [{ materialId: 'M-HW-TURN-SET', qty: 1 }, { materialId: 'M-HW-HANDLE', qty: 1 }, { materialId: 'M-HW-HINGE', qty: 2 }] },
      ],
    },
  ],

  rules: [
    { id: 'R-SEAL-FRAME', name: 'Уплотнитель рамный', source: 'element', role: 'frame', materialId: 'M-SEAL-FRAME', base: 'width', dim: '1D', coef: 1, addition: 0, step: 1, count: 1 },
    { id: 'R-SEAL-SASH', name: 'Уплотнитель створочный', source: 'element', role: 'sash', materialId: 'M-SEAL-SASH', base: 'width', dim: '1D', coef: 1, addition: 0, step: 1, count: 1 },
    { id: 'R-REINF-FRAME', name: 'Армирование рамы', source: 'element', role: 'frame', materialId: 'M-REINF-FRAME', base: 'width', dim: '1D', coef: 1, addition: -60, step: 5, count: 1 },
    { id: 'R-REINF-SASH', name: 'Армирование створки', source: 'element', role: 'sash', materialId: 'M-REINF-SASH', base: 'width', dim: '1D', coef: 1, addition: -50, step: 5, count: 1 },
    { id: 'R-REINF-IMPOST', name: 'Армирование импоста', source: 'element', role: 'impost', materialId: 'M-REINF-IMPOST', base: 'width', dim: '1D', coef: 1, addition: -30, step: 5, count: 1 },
    { id: 'R-BEAD-SL70', name: 'Штапик по периметру СП', source: 'glazing', materialId: 'M-SL70-BEAD', base: 'perimeter', dim: '1D', coef: 1, addition: 0, step: 1, count: 1 },
    { id: 'R-BEAD-BL60', name: 'Штапик по периметру СП', source: 'glazing', materialId: 'M-BL60-BEAD', base: 'perimeter', dim: '1D', coef: 1, addition: 0, step: 1, count: 1 },
    { id: 'R-SEAL-GLASS', name: 'Уплотнитель стекольный', source: 'glazing', materialId: 'M-SEAL-GLASS', base: 'perimeter', dim: '1D', coef: 2, addition: 0, step: 1, count: 1 },
    { id: 'R-WORK-GLAZE', name: 'Остекление', source: 'glazing', materialId: 'W-GLAZE', base: 'area', dim: '0D', coef: 1, addition: 0, step: 0, count: 1 },
    { id: 'R-WORK-HW', name: 'Установка фурнитуры', source: 'sash', materialId: 'W-HW-MOUNT', base: 'total', dim: '0D', coef: 1, addition: 0, step: 0, count: 1 },
    { id: 'R-WORK-WELD', name: 'Сварка углов рамы', source: 'product', materialId: 'W-WELD', base: 'total', dim: '0D', coef: 1, addition: 0, step: 0, count: 4 },
    { id: 'R-WORK-ASSEMBLY', name: 'Сборка изделия', source: 'product', materialId: 'W-ASSEMBLY', base: 'area', dim: '0D', coef: 1, addition: 0, step: 0, count: 1 },
  ],

  systems: [
    {
      id: 'SYS-SL70',
      name: 'VEKA Softline 70',
      buildFrom: 'inside',
      profiles: { frame: 'M-SL70-FRAME', sash: 'M-SL70-SASH', impost: 'M-SL70-IMPOST', bead: 'M-SL70-BEAD', shtulp: undefined, sill: undefined, reinforcement: 'M-REINF-FRAME' },
      glazingIds: ['GL-24-STD', 'GL-32-ENERGY'],
      hardwareVariantIds: ['HW-TT-STD', 'HW-TURN-STD', 'HW-TILT-STD'],
      joints: { impost: 19, sash: 0 },
      params: [
        { name: 'Цвет уплотнения', values: ['Чёрный', 'Серый'], level: 'product' },
        { name: 'Направление открывания', values: ['Левое', 'Правое'], level: 'sash' },
      ],
      specRuleIds: ['R-SEAL-FRAME', 'R-SEAL-SASH', 'R-REINF-FRAME', 'R-REINF-SASH', 'R-REINF-IMPOST', 'R-BEAD-SL70', 'R-SEAL-GLASS', 'R-WORK-GLAZE', 'R-WORK-HW', 'R-WORK-WELD', 'R-WORK-ASSEMBLY'],
    },
    {
      id: 'SYS-BL60',
      name: 'REHAU Blitz 60',
      buildFrom: 'inside',
      profiles: { frame: 'M-BL60-FRAME', sash: 'M-BL60-SASH', impost: 'M-BL60-IMPOST', bead: 'M-BL60-BEAD', shtulp: undefined, sill: undefined, reinforcement: 'M-REINF-FRAME' },
      glazingIds: ['GL-24-STD'],
      hardwareVariantIds: ['HW-TT-STD', 'HW-TURN-STD'],
      joints: { impost: 17, sash: 0 },
      params: [{ name: 'Цвет уплотнения', values: ['Чёрный'], level: 'product' }],
      specRuleIds: ['R-SEAL-FRAME', 'R-SEAL-SASH', 'R-REINF-FRAME', 'R-REINF-SASH', 'R-REINF-IMPOST', 'R-BEAD-BL60', 'R-SEAL-GLASS', 'R-WORK-GLAZE', 'R-WORK-HW', 'R-WORK-WELD', 'R-WORK-ASSEMBLY'],
    },
  ],
}
