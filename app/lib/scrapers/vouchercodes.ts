import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

// Target the restaurants vouchers listing
const CATEGORY_URL = 'https://www.vouchercodes.co.uk/restaurant-vouchers.html'

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

    // Cards use class "flex-offer"; merchant name is in the logo img alt attribute,
    // offer title is in the element with data-qa="el:offerTitle"
    const containers = $('[class*="flex-offer"]')

    containers.each((i, el) => {
      // Merchant name from logo alt text (e.g. "Wagamama Logo" → "Wagamama")
      const logoAlt = $(el).find('img').first().attr('alt') ?? ''
      const merchant = logoAlt.replace(/\s*Logo\s*$/i, '').trim()

      if (!merchant || !matchesChain(merchant)) return

      // Deal description from the offer title element
      const description = $(el)
        .find('[data-qa="el:offerTitle"], h3, h4')
        .first()
        .text()
        .trim()

      // Discount code in a lozenge-style span
      const codeEl = $(el).find('[data-qa="el:lozenge"], [class*="lozenge"]').first().text().trim()
      const code = codeEl && codeEl.toLowerCase() !== 'deal' && codeEl.toLowerCase() !== 'vip' && codeEl.length <= 20
        ? codeEl
        : undefined

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
