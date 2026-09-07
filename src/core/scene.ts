/**
 * Операции над входной моделью изделия (дерево деления светового проёма).
 * Все функции — иммутабельные: возвращают новую модель.
 */
import { catalog } from '../catalog'
import type { FieldFill, ProductInput, SceneNode } from './types'

/** Значения по умолчанию берутся из справочника, а не из констант кода. */
const defaultSystem = catalog.systems[0]
const defaultGlazingId = defaultSystem.glazingIds[0]

let counter = 0
export const nextId = (prefix: string) => `${prefix}${(++counter).toString(36)}${Date.now().toString(36).slice(-3)}`

export function newField(fill?: FieldFill): SceneNode {
  return { kind: 'field', id: nextId('F'), fill: fill ?? { type: 'glass', glazingId: defaultGlazingId } }
}

export function newProduct(partial: Partial<ProductInput> = {}): ProductInput {
  return {
    id: nextId('P'),
    systemId: defaultSystem.id,
    colorId: catalog.colors[0].id,
    width: 1400,
    height: 1400,
    qty: 1,
    params: {},
    root: newField(),
    ...partial,
  }
}

export function findNode(root: SceneNode, id: string): SceneNode | null {
  if (root.id === id) return root
  if (root.kind === 'split') {
    for (const child of root.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}

/** Список полей (листьев) слева направо, сверху вниз. */
export function listFields(root: SceneNode): string[] {
  if (root.kind === 'field') return [root.id]
  return [...listFields(root.children[0]), ...listFields(root.children[1])]
}

function mapNode(root: SceneNode, id: string, fn: (node: SceneNode) => SceneNode): SceneNode {
  if (root.id === id) return fn(root)
  if (root.kind === 'split') {
    return { ...root, children: [mapNode(root.children[0], id, fn), mapNode(root.children[1], id, fn)] }
  }
  return root
}

/** Разделить поле импостом. Оба потомка наследуют заполнение исходного поля. */
export function splitField(root: SceneNode, id: string, dir: 'v' | 'h', ratio = 0.5): SceneNode {
  return mapNode(root, id, (node) => {
    if (node.kind !== 'field') return node
    const keep: FieldFill =
      node.fill.type === 'glass' ? node.fill : { type: 'glass', glazingId: node.fill.glazingId }
    return {
      kind: 'split',
      id: nextId('S'),
      dir,
      ratio,
      children: [newField({ ...keep }), newField({ ...keep })],
    }
  })
}

/** Удалить импост: узел деления схлопывается в одно поле. */
export function removeSplit(root: SceneNode, id: string): SceneNode {
  if (root.kind === 'split' && root.id === id) return newField()
  return mapNode(root, id, (node) => (node.kind === 'split' ? newField() : node))
}

export function setFill(root: SceneNode, id: string, fill: FieldFill): SceneNode {
  return mapNode(root, id, (node) => (node.kind === 'field' ? { ...node, fill } : node))
}

export function setRatio(root: SceneNode, id: string, ratio: number): SceneNode {
  return mapNode(root, id, (node) => (node.kind === 'split' ? { ...node, ratio } : node))
}

/** Родительский узел деления для поля — нужен, чтобы двигать импост. */
export function parentSplit(root: SceneNode, id: string): SceneNode | null {
  if (root.kind !== 'split') return null
  if (root.children.some((c) => c.id === id)) return root
  for (const child of root.children) {
    const found = parentSplit(child, id)
    if (found) return found
  }
  return null
}
