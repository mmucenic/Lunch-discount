import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

const CW_URL = 'https://www.canarywharf.com/whats-on/offers-promotions/'

const FOOD_KEYWORDS =
  /restaurant|food|eat|lunch|dine|dining|cafe|bar|drink|pizza|burger|sushi|curry|noodle|brasserie|grill|kitchen|menu|offer|deal|discount|free|off|save/i

// Ordered from most specific to most generic — stops as soon as any selector yields results
const CARD_SELECTORS = [
  'article',
  '.offer-card',
  '[class*="offer-card"]',
  '[class*="OfferCard"]',
  '[class*="listing-item"]',
  '[class*="whats-on"]',
  '[class*="promotion"]',
  '.card',
  '[class*="-card"]',
  'li[class]',                     // generic list items with any class
]

function resolveUrl(href: string | undefined): string {
  if (!href) return CW_URL
  return href.startsWith('http') ? href : `https://www.canarywharf.com${href}`
}

export async function scrapeCanaryWharf(): Promise<Deal[]> {
  let html: string
  let status: number

  try {
    const res = await fetch(CW_URL, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
    status = res.status
    if (!res.ok) {
      console.error(`[canarywharf] HTTP ${status}`)
      return []
    }
    html = await res.text()
  } catch (err) {
    console.error('[canarywharf] fetch failed:', err)
    return []
  }

  const $ = cheerio.load(html)
  const deals: Deal[] = []

  // Try each selector until one finds elements
  let matched = false
  for (const selector of CARD_SELECTORS) {
    const elements = $(selector)
    if (elements.length === 0) continue

    console.log(`[canarywharf] selector "${selector}" matched ${elements.length} elements`)
    matched = true

    elements.each((i, el) => {
      const title = $(el)
        .find('h2, h3, h4, h5, [class*="title"], [class*="heading"], [class*="name"]')
        .first()
        .text()
        .trim()
      const description = $(el).find('p, [class*="description"], [class*="summary"], [class*="body"]').first().text().trim()
      const href = $(el).find('a').first().attr('href')

      if (!title || title.length < 3 || title.length > 120) return
      if (!FOOD_KEYWORDS.test(title) && !FOOD_KEYWORDS.test(description)) return

      deals.push({
        id: `cw-${i}`,
        restaurant: title,
        tagline: description.slice(0, 80) || 'Current offer at Canary Wharf',
        description: description || title,
        dealType: 'percentage',
        discountLabel: 'Special offer',
        cuisine: 'other',
        priceRange: '££',
        validDays: ['everyday'],
        url: resolveUrl(href),
        location: 'Canary Wharf',
        source: 'scraped',
        imageEmoji: '🍽️',
      })
    })

    // If we got any deals, stop trying more selectors
    if (deals.length > 0) break
    // If selector matched elements but none passed the food keyword filter, try the next
  }

  if (!matched) {
    console.error('[canarywharf] no card selectors matched — page structure may have changed')
  }

  console.log(`[canarywharf] scraped ${deals.length} deals`)
  return deals
}
