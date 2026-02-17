'use client'

import { useState, useMemo } from 'react'
import { Deal, Filters, DayOfWeek } from '@/app/types/deals'
import { DealCard } from './DealCard'
import { FilterBar } from './FilterBar'

interface DealsClientProps {
  initialDeals: Deal[]
}

function getTodayAsDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ]
  const dow = new Date().getDay() // 0 = Sunday
  // Mon=1, Tue=2, ..., Fri=5; Sat/Sun fall back to 'everyday' (no specific day)
  if (dow >= 1 && dow <= 5) return days[dow - 1]
  return 'everyday'
}

function dealsMatchFilter(deal: Deal, filters: Filters): boolean {
  if (filters.cuisine !== 'all' && deal.cuisine !== filters.cuisine) return false
  if (filters.dealType !== 'all' && deal.dealType !== filters.dealType) return false
  if (filters.priceRange !== 'all' && deal.priceRange !== filters.priceRange)
    return false
  if (filters.day !== 'all') {
    const dayMatch =
      deal.validDays.includes(filters.day) ||
      deal.validDays.includes('everyday')
    if (!dayMatch) return false
  }
  return true
}

export function DealsClient({ initialDeals }: DealsClientProps) {
  const [filters, setFilters] = useState<Filters>({
    cuisine: 'all',
    dealType: 'all',
    priceRange: 'all',
    day: getTodayAsDayOfWeek(),
  })
  const [search, setSearch] = useState('')

  const filteredDeals = useMemo(() => {
    return initialDeals.filter((deal) => {
      if (!dealsMatchFilter(deal, filters)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          deal.restaurant.toLowerCase().includes(q) ||
          deal.tagline.toLowerCase().includes(q) ||
          deal.description.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [initialDeals, filters, search])

  return (
    <div>
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="search"
          placeholder="Search restaurants or deals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={filteredDeals.length}
      />

      {/* Deal cards */}
      <div className="px-4 py-4 space-y-3">
        {filteredDeals.length > 0 ? (
          filteredDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No deals match your filters</p>
            <p className="text-sm mt-1">Try adjusting the day or cuisine filter</p>
            <button
              onClick={() =>
                setFilters({
                  cuisine: 'all',
                  dealType: 'all',
                  priceRange: 'all',
                  day: 'all',
                })
              }
              className="mt-4 text-sm text-blue-500 hover:text-blue-700 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 text-center">
        <p className="text-xs text-gray-400">
          Deals updated regularly · Always verify at the restaurant before ordering
        </p>
        <a
          href="https://www.canarywharf.com/whats-on/offers-promotions/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-600 mt-1 block"
        >
          See all offers on canarywharf.com →
        </a>
      </div>
    </div>
  )
}
