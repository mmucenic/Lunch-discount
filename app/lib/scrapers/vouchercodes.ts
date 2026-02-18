import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

// Target the food & drink / restaurants category listing
const CATEGORY_URL = 'https://www.vouchercodes.co.uk/food-and-drink/restaurants/'

// Chains we know have Canary Wharf locations — filter to keep results relevant
const CANARY_WHARF_CHAINS = [
  'wagamama', 'itsu', 'wasabi', 'pret', 'leon', 'dishoom', 'wahaca',
  'tortilla', 'busaba', 'côte', 'cote', "bill's", 'bills', 'banana tree',
  'shake shack', 'five guys', 'nandos', "nando's", 'pizza express',
  'yo sushi', 'yo! sushi', 'zizzi', 'prezzo', 'carluccios', "carluccio's",
]

function matchesChain(text: string): boolean {
  const lower = text.toLowerCase()
  return CANARY_WHARF_CHAINS.some((chain) => lower.includes(chain))
}

export async function scrapeVoucherCodes(): Promise<Deal[]> {
  try {
    const res = await fetch(CATEGORY_URL, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })

    if (!res.ok) return []

    const $ = cheerio.load(await res.text())
    const deals: Deal[] = []

    // Try multiple possible card container selectors
    const containers = $(
      [
        '[data-component="voucher-card"]',
        '.voucher-item',
        '.offer-item',
        '.merchant-card',
        'li[class*="voucher"]',
        'li[class*="offer"]',
        'article[class*="voucher"]',
        'article[class*="offer"]',
        '.deal-card',
      ].join(', ')
    )

    containers.each((i, el) => {
      // Merchant / restaurant name
      const merchant = $(el)
        .find(
          '[class*="merchant"], [class*="brand"], [class*="retailer"], h2, h3, h4'
        )
        .first()
        .text()
        .trim()

      if (!merchant || !matchesChain(merchant)) return

      // Deal description
      const description = $(el)
        .find('[class*="description"], [class*="title"], [class*="offer"], p')
        .first()
        .text()
        .trim()

      // Discount code (hidden behind a button — may be in a data attribute)
      const code =
        $(el).find('[data-code], [class*="code"]').first().attr('data-code') ||
        $(el).find('[class*="code"]').first().text().trim().replace(/\s+/g, '') ||
        undefined

      // Link
      const href = $(el).find('a').first().attr('href') || CATEGORY_URL
      const url = href.startsWith('http')
        ? href
        : `https://www.vouchercodes.co.uk${href}`

      // Infer discount label from description text
      const percentMatch = description.match(/(\d+)%\s*off/i)
      const poundMatch = description.match(/£(\d+)\s*off/i)
      const discountLabel = percentMatch
        ? `${percentMatch[1]}% off`
        : poundMatch
        ? `£${poundMatch[1]} off`
        : description.toLowerCase().includes('free')
        ? 'Free item'
        : 'Special offer'

      deals.push({
        id: `vc-${i}-${Date.now()}`,
        restaurant: merchant,
        tagline: description.slice(0, 80) || `${discountLabel} at ${merchant}`,
        description: description || `Current offer at ${merchant}`,
        dealType: percentMatch
          ? 'percentage'
          : poundMatch
          ? 'fixed'
          : 'percentage',
        discountLabel,
        code: code && code.length >= 2 && code.length <= 20 ? code : undefined,
        cuisine: 'other',
        priceRange: '££',
        validDays: ['everyday'],
        url,
        location: 'Canary Wharf',
        source: 'scraped',
        imageEmoji: '🎟️',
      })
    })

    return deals
  } catch (err) {
    console.error('[vouchercodes scraper]', err)
    return []
  }
}
