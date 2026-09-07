/**
 * Ячейки редактируемых таблиц справочника.
 * Поведение как в гридах IT Окна: правка прямо в ячейке, тулбар
 * «Добавить / Копировать / Удалить» над таблицей.
 */
import type { ReactNode } from 'react'

export function TextCell({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input className="cell" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  )
}

export function NumCell({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  return (
    <input
      className="cell num"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const next = Number(e.target.value)
        if (!Number.isNaN(next)) onChange(next)
      }}
    />
  )
}

export interface Option {
  value: string
  label: string
}

export function SelectCell({
  value,
  onChange,
  options,
  empty,
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  empty?: string
}) {
  const missing = value && !options.some((o) => o.value === value)
  return (
    <select className={missing ? 'cell invalid' : 'cell'} value={value} onChange={(e) => onChange(e.target.value)}>
      {empty && <option value="">{empty}</option>}
      {missing && <option value={value}>{`не найдено: ${value}`}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function CheckCell({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <input className="cell check" type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
}

export function RowToolbar({
  onAdd,
  onCopy,
  onDelete,
  hasSelection,
  title,
  extra,
}: {
  onAdd: () => void
  onCopy?: () => void
  onDelete?: () => void
  hasSelection?: boolean
  title?: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="row-toolbar">
      {title && <span className="rt-title">{title}</span>}
      <button onClick={onAdd}>+ Добавить</button>
      {onCopy && (
        <button disabled={!hasSelection} onClick={onCopy}>
          Копировать
        </button>
      )}
      {onDelete && (
        <button className="danger" disabled={!hasSelection} onClick={onDelete}>
          Удалить
        </button>
      )}
      {extra}
    </div>
  )
}
