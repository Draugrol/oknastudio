/**
 * Рабочая копия справочников.
 *
 * На фронтовом этапе хранится в localStorage; интерфейс намеренно повторяет
 * будущий API настроек, чтобы переезд на сервер не задел экраны.
 * Ядро расчёта справочник не импортирует — он приходит параметром.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Catalog } from '../core/types'
import { defaultCatalog } from '../catalog/defaults'

const KEY = 'oknastudio.catalog.v4'

function load(): Catalog {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(defaultCatalog)
    const parsed = JSON.parse(raw) as Catalog
    if (!parsed?.systems?.length || !parsed?.materials?.length) return structuredClone(defaultCatalog)
    return parsed
  } catch {
    return structuredClone(defaultCatalog)
  }
}

function save(catalog: Catalog) {
  try {
    localStorage.setItem(KEY, JSON.stringify(catalog))
  } catch {
    /* приватный режим браузера — работаем без сохранения */
  }
}

let state: Catalog | null = null
const listeners = new Set<(c: Catalog) => void>()

export function getCatalog(): Catalog {
  if (!state) state = load()
  return state
}

export function replaceCatalog(next: Catalog) {
  state = next
  save(next)
  listeners.forEach((fn) => fn(next))
}

/** Точечная правка: мутатор работает по копии, наружу уходит новый объект. */
export function updateCatalog(mutator: (draft: Catalog) => void) {
  const draft = structuredClone(getCatalog())
  mutator(draft)
  replaceCatalog(draft)
}

export function resetCatalog() {
  replaceCatalog(structuredClone(defaultCatalog))
}

export function useCatalog() {
  const [catalog, setLocal] = useState<Catalog>(getCatalog)

  useEffect(() => {
    listeners.add(setLocal)
    return () => {
      listeners.delete(setLocal)
    }
  }, [])

  const update = useCallback((mutator: (draft: Catalog) => void) => updateCatalog(mutator), [])
  const replace = useCallback((next: Catalog) => replaceCatalog(next), [])
  const reset = useCallback(() => resetCatalog(), [])

  return { catalog, update, replace, reset }
}

/** Новый идентификатор записи справочника. */
let seq = 0
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`
