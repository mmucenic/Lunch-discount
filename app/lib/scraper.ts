import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

const CANARY_WHARF_OFFERS_URL =
  'https://www.canarywharf.com/whats-on/offers-promotions/'

/**
 * Scrapes the Canary Wharf Group offers page for current promotions.
 * Returns an array of Deal objects for any food/restaurant offers found.
 */
export async function scrapeCanaryWharfOffers(): Promise<Deal[]> {
  try {
    const response = await fetch(CANARY_WHARF_OFFERS_URL, {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LunchDealsBot/1.0; +for-personal-use)',
      },
    })

    if (!response.ok) {
      console.warn(`Failed to fetch CW offers: ${response.status}`)
      return []
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const deals: Deal[] = []

    // Canary Wharf Group offer cards — selector may need adjustment if site changes
    // They typically use article or div cards with a title, description, and category tag
    $('article, .offer-card, .card, [class*="offer"], [class*="promotion"]').each(
      (i, el) => {
        const title = $(el).find('h2, h3, h4, .title, [class*="title"]').first().text().trim()
        const description = $(el)
          .find('p, .description, .summary, [class*="desc"]')
          .first()
          .text()
          .trim()
        const url = $(el).find('a').first().attr('href')

        if (!title || title.length < 3) return

        // Basic heuristic: only include food/restaurant related offers
        const foodKeywords =
          /restaurant|food|eat|lunch|dine|dining|cafe|bar|drink|pizza|burger|sushi|curry|noodle|brasserie|grill|kitchen|menu|offer|deal|discount|free|off|save/i
        if (!foodKeywords.test(title) && !foodKeywords.test(description)) return

        const deal: Deal = {
          id: `cw-scraped-${i}-${Date.now()}`,
          restaurant: title,
          tagline: description.slice(0, 80) || 'Current offer at Canary Wharf',
          description: description || title,
          dealType: 'percentage',
          discountLabel: 'Special offer',
          cuisine: 'other',
          priceRange: '££',
          validDays: ['everyday'],
          url: url
            ? url.startsWith('http')
              ? url
              : `https://www.canarywharf.com${url}`
            : CANARY_WHARF_OFFERS_URL,
          location: 'Canary Wharf',
          source: 'scraped',
          imageEmoji: '🍽️',
        }

        deals.push(deal)
      }
    )

    return deals
  } catch (err) {
    console.error('Scraper error:', err)
    return []
  }
}
