import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

const URL = 'https://www.canarywharf.com/whats-on/offers-promotions/'

const FOOD_KEYWORDS =
  /restaurant|food|eat|lunch|dine|dining|cafe|bar|drink|pizza|burger|sushi|curry|noodle|brasserie|grill|kitchen|menu|offer|deal|discount|free|off|save/i

export async function scrapeCanaryWharf(): Promise<Deal[]> {
  try {
    const res = await fetch(URL, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CheapIsCheapBot/1.0)' },
    })
    if (!res.ok) return []

    const $ = cheerio.load(await res.text())
    const deals: Deal[] = []

    $('article, .offer-card, .card, [class*="offer"], [class*="promotion"]').each((i, el) => {
      const title = $(el).find('h2, h3, h4, .title, [class*="title"]').first().text().trim()
      const description = $(el).find('p, .description, .summary').first().text().trim()
      const url = $(el).find('a').first().attr('href')

      if (!title || title.length < 3) return
      if (!FOOD_KEYWORDS.test(title) && !FOOD_KEYWORDS.test(description)) return

      deals.push({
        id: `cw-${i}-${Date.now()}`,
        restaurant: title,
        tagline: description.slice(0, 80) || 'Current offer at Canary Wharf',
        description: description || title,
        dealType: 'percentage',
        discountLabel: 'Special offer',
        cuisine: 'other',
        priceRange: '££',
        validDays: ['everyday'],
        url: url
          ? url.startsWith('http') ? url : `https://www.canarywharf.com${url}`
          : URL,
        location: 'Canary Wharf',
        source: 'scraped',
        imageEmoji: '🍽️',
      })
    })

    return deals
  } catch (err) {
    console.error('[canarywharf scraper]', err)
    return []
  }
}
