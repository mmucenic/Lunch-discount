export type Cuisine =
  | 'british'
  | 'italian'
  | 'japanese'
  | 'asian'
  | 'indian'
  | 'american'
  | 'mexican'
  | 'mediterranean'
  | 'other'

export type DealType =
  | 'percentage'
  | '2for1'
  | 'fixed'
  | 'freeItem'
  | 'setMenu'
  | 'subscription'

export type PriceRange = '£' | '££' | '£££'

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'everyday'

export interface Deal {
  id: string
  restaurant: string
  tagline: string
  description: string
  dealType: DealType
  discountLabel: string
  code?: string
  cuisine: Cuisine
  priceRange: PriceRange
  validDays: DayOfWeek[]
  validUntil?: string
  requiresApp?: string
  requiresCard?: string
  url?: string
  location: string
  source: 'curated' | 'scraped'
  imageEmoji: string
}

export interface Filters {
  cuisine: Cuisine | 'all'
  dealType: DealType | 'all'
  priceRange: PriceRange | 'all'
  day: DayOfWeek | 'all'
  hideRequiresApp: boolean
  showNewOnly: boolean
}
