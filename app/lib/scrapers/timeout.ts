import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

// Time Out's best cheap eats and food coverage for London
const URLS = [
  'https://www.timeout.com/london/food-drink/londons-best-cheap-eats',
  'https://www.timeout.com/london/food-and-drink/londons-best-sunday-lunches',
]

const CANARY_WHARF_KEYWORDS =
  /canary wharf|canada square|jubilee place|cabot|west india|crossrail place|wood wharf/i

export async function scrapeTimeOut(): Promise<Deal[]> {
  const deals: Deal[] = []

  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 3600 },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      })

      if (!res.ok) continue

      const $ = cheerio.load(await res.text())

      // Time Out articles use numbered list items or feature cards
      // Each entry typically has a heading (restaurant name) + paragraph (description)
      const candidates = $(
        [
          'h3, h4',                         // section headers = restaurant names
          '[class*="feature-card"]',
          '[class*="listing-item"]',
          '[class*="card__title"]',
          'li[class*="card"]',
        ].join(', ')
      )

      candidates.each((i, el) => {
        const name = $(el).text().trim()
        if (!name || name.length < 3 || name.length > 80) return

        // The surrounding block's text for context
        const block = $(el).closest('li, article, section, div').first()
        const bodyText = block.find('p').first().text().trim()

        // Only keep entries that mention Canary Wharf area
        if (!CANARY_WHARF_KEYWORDS.test(bodyText) && !CANARY_WHARF_KEYWORDS.test(name)) return

        const href = block.find('a').first().attr('href') || url
        const dealUrl = href.startsWith('http')
          ? href
          : `https://www.timeout.com${href}`

        // Infer price/deal info from body text
        const percentMatch = bodyText.match(/(\d+)%\s*off/i)
        const setMenuMatch = /set (lunch|menu)|prix fixe|\bfrom £\d+/i.test(bodyText)
        const discountLabel = percentMatch
          ? `${percentMatch[1]}% off`
          : setMenuMatch
          ? 'Set menu'
          : 'Featured deal'

        deals.push({
          id: `to-${i}-${Date.now()}`,
          restaurant: name,
          tagline: bodyText.slice(0, 80) || `Recommended by Time Out`,
          description: bodyText || `${name} featured in Time Out London's lunch deals.`,
          dealType: percentMatch ? 'percentage' : setMenuMatch ? 'setMenu' : 'percentage',
          discountLabel,
          cuisine: 'other',
          priceRange: '££',
          validDays: ['everyday'],
          url: dealUrl,
          location: 'Canary Wharf',
          source: 'scraped',
          imageEmoji: '⏱️',
        })
      })
    } catch (err) {
      console.error('[timeout scraper]', url, err)
    }
  }

  return deals
}
