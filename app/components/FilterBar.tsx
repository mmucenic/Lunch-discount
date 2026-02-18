'use client'

import { Cuisine, DealType, DayOfWeek, Filters } from '@/app/types/deals'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  resultCount: number
}

const cuisineOptions: { value: Cuisine | 'all'; label: string }[] = [
  { value: 'all', label: 'All cuisines' },
  { value: 'asian', label: 'Asian' },
  { value: 'british', label: 'British' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'indian', label: 'Indian' },
  { value: 'american', label: 'American' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'other', label: 'Other' },
]

const dealTypeOptions: { value: DealType | 'all'; label: string }[] = [
  { value: 'all', label: 'All deals' },
  { value: '2for1', label: '2 for 1' },
  { value: 'percentage', label: '% off' },
  { value: 'fixed', label: '£ off' },
  { value: 'freeItem', label: 'Free item' },
  { value: 'setMenu', label: 'Set menu' },
  { value: 'subscription', label: 'Subscription' },
]

const dayOptions: { value: DayOfWeek | 'all'; label: string }[] = [
  { value: 'all', label: 'Any day' },
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'everyday', label: 'Every day' },
]

function ScrollPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`shrink-0 text-sm px-3 py-1.5 rounded-full transition-all duration-150 font-medium ${
            value === opt.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function FilterBar({ filters, onChange, resultCount }: FilterBarProps) {
  return (
    <div className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 pb-3 pt-4 px-4 space-y-2">
      <ScrollPills
        options={dayOptions}
        value={filters.day}
        onChange={(day) => onChange({ ...filters, day })}
      />
      <ScrollPills
        options={cuisineOptions}
        value={filters.cuisine}
        onChange={(cuisine) => onChange({ ...filters, cuisine })}
      />
      <ScrollPills
        options={dealTypeOptions}
        value={filters.dealType}
        onChange={(dealType) => onChange({ ...filters, dealType })}
      />
      <div className="flex items-center justify-between pt-0.5">
        <p className="text-xs text-gray-400">
          {resultCount} deal{resultCount !== 1 ? 's' : ''} found
        </p>
        <button
          onClick={() =>
            onChange({ ...filters, hideRequiresApp: !filters.hideRequiresApp })
          }
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150 ${
            filters.hideRequiresApp
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
          }`}
        >
          <span>{filters.hideRequiresApp ? '✓' : '📱'}</span>
          No app needed
        </button>
      </div>
    </div>
  )
}
