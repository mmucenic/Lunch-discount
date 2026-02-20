/**
 * Fast-casual Canary Wharf restaurant scraper.
 *
 * For each restaurant we try a small set of URLs (loyalty/offers/deals pages
 * followed by the homepage).  We parse the HTML with Cheerio, extract visible
 * text and look for deal / loyalty keywords.  When found, we emit a Deal with
 * the restaurant's Canary Wharf location and coordinates.
 */

import * as cheerio from 'cheerio'
import { Deal, Cuisine } from '@/app/types/deals'

// ─── Deal detection patterns ──────────────────────────────────────────────────
const PCT_RE = /(\d+)\s*%\s*off/i
const POUND_OFF_RE = /£\s*(\d+(?:\.\d{2})?)\s*off/i
const FREE_ITEM_RE = /free\s+(item|drink|meal|bowl|wrap|coffee|juice|smoothie|poke|falafel)/i
const SET_MENU_RE = /set\s+(lunch|menu|meal)|prix\s+fixe|meal\s+deal|\bfrom\s+£\d+/i
const LOYALTY_RE =
  /loyalty|rewards?\s+program|stamp\s+card|earn\s+(points|stamps)|points\s+per|free\s+after|redeem|perks|app\s+reward/i
const MEERKAT_RE = /meerkat\s+meals?|comparethemarket/i
const BLUE_LIGHT_RE = /blue\s+light\s+card|blc\s+discount/i
const STUDENT_RE = /student\s+discount|unidays|student\s+beans/i

// ─── Restaurant definitions ───────────────────────────────────────────────────
interface FCRestaurant {
  id: string
  name: string
  emoji: string
  cuisine: Cuisine
  priceRange: '£' | '££' | '£££'
  location: string
  lat: number
  lng: number
  /** URLs to try in order — first 200 response wins */
  urls: string[]
}

const RESTAURANTS: FCRestaurant[] = [
  // ── Wood Wharf cluster (SE of main estate) ─────────────────────────────────
  {
    id: 'kung-fu-mama',
    name: 'Kung Fu Mama',
    emoji: '🥢',
    cuisine: 'asian',
    priceRange: '£',
    location: 'Water St, Wood Wharf',
    lat: 51.5022,
    lng: -0.0160,
    urls: ['https://www.kungfumama.co.uk/offers', 'https://www.kungfumama.co.uk'],
  },
  {
    id: 'mama-li',
    name: 'Mama Li',
    emoji: '🍜',
    cuisine: 'asian',
    priceRange: '£',
    location: 'Water St, Wood Wharf',
    lat: 51.5023,
    lng: -0.0161,
    urls: ['https://mamali.co.uk/offers', 'https://mamali.co.uk'],
  },
  {
    id: 'ong-lai',
    name: 'Ong Lai Kopitam',
    emoji: '🍵',
    cuisine: 'asian',
    priceRange: '£',
    location: 'Water St, Wood Wharf',
    lat: 51.5024,
    lng: -0.0163,
    urls: ['https://www.onglaicopitam.com/offers', 'https://www.onglaicopitam.com'],
  },
  {
    id: 'rice-guys',
    name: 'Rice Guys',
    emoji: '🍚',
    cuisine: 'asian',
    priceRange: '£',
    location: 'Water St, Wood Wharf',
    lat: 51.5025,
    lng: -0.0163,
    urls: ['https://www.riceguys.co.uk/offers', 'https://www.riceguys.co.uk'],
  },

  // ── Jubilee Place / Churchill Place cluster (underground central mall) ──────
  {
    id: 'pho',
    name: 'Pho',
    emoji: '🍲',
    cuisine: 'asian',
    priceRange: '££',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5042,
    lng: -0.0207,
    urls: [
      'https://www.phocafe.co.uk/offers',
      'https://www.phocafe.co.uk/deals',
      'https://www.phocafe.co.uk',
    ],
  },
  {
    id: 'za-ta',
    name: "Za'ta",
    emoji: '🥙',
    cuisine: 'mediterranean',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5043,
    lng: -0.0203,
    urls: ['https://www.zatarestaurant.com/offers', 'https://www.zatarestaurant.com'],
  },
  {
    id: 'ithai',
    name: 'iThai',
    emoji: '🌶️',
    cuisine: 'asian',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5042,
    lng: -0.0205,
    urls: ['https://www.ithai.co.uk/offers', 'https://www.ithai.co.uk'],
  },
  {
    id: 'grind',
    name: 'Grind',
    emoji: '☕',
    cuisine: 'british',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5042,
    lng: -0.0207,
    urls: [
      'https://grind.co.uk/pages/loyalty',
      'https://grind.co.uk/pages/rewards',
      'https://grind.co.uk',
    ],
  },
  {
    id: 'urban-greens',
    name: 'Urban Greens',
    emoji: '🥗',
    cuisine: 'other',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5042,
    lng: -0.0206,
    urls: ['https://www.urbangreenslondon.com/deals', 'https://www.urbangreenslondon.com'],
  },
  {
    id: 'poke-house',
    name: 'Poke House',
    emoji: '🐟',
    cuisine: 'other',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5043,
    lng: -0.0204,
    urls: [
      'https://pokehouse.co.uk/pages/loyalty',
      'https://pokehouse.co.uk/pages/offers',
      'https://pokehouse.co.uk',
    ],
  },
  {
    id: 'jamaica-patty-co',
    name: 'Jamaica Patty Co',
    emoji: '🫓',
    cuisine: 'other',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5042,
    lng: -0.0206,
    urls: ['https://www.jamaicapattyco.com/offers', 'https://www.jamaicapattyco.com'],
  },
  {
    id: 'jenki',
    name: 'Jenki',
    emoji: '🍵',
    cuisine: 'other',
    priceRange: '£',
    location: 'Cabot Place, Canary Wharf',
    lat: 51.5041,
    lng: -0.0200,
    urls: ['https://www.jenki.com/pages/rewards', 'https://www.jenki.com'],
  },
  {
    id: 'cafe-seek',
    name: 'Café Seek',
    emoji: '☕',
    cuisine: 'other',
    priceRange: '£',
    location: 'Jubilee Place, Canary Wharf',
    lat: 51.5042,
    lng: -0.0208,
    urls: ['https://seekcoffee.co.uk/pages/loyalty', 'https://seekcoffee.co.uk'],
  },
  {
    id: 'supershakes',
    name: 'Supershakes',
    emoji: '🥤',
    cuisine: 'other',
    priceRange: '£',
    location: 'Churchill Place, Canary Wharf',
    lat: 51.5043,
    lng: -0.0200,
    urls: ['https://www.supershakes.co.uk/offers', 'https://www.supershakes.co.uk'],
  },

  // ── Cabot Place / east mall cluster ──────────────────────────────────────────
  {
    id: 'farmer-j',
    name: 'Farmer J',
    emoji: '🌾',
    cuisine: 'british',
    priceRange: '£',
    location: 'Cabot Place, Canary Wharf',
    lat: 51.5041,
    lng: -0.0197,
    urls: [
      'https://farmerjlondon.com/loaded',
      'https://farmerjlondon.com/pages/loaded',
      'https://farmerjlondon.com',
    ],
  },
  {
    id: 'coco-di-mama',
    name: 'Coco di Mama',
    emoji: '🍝',
    cuisine: 'italian',
    priceRange: '£',
    location: 'Cabot Place, Canary Wharf',
    lat: 51.5041,
    lng: -0.0198,
    urls: [
      'https://cocodimamarestaurant.com/deals',
      'https://cocodimamarestaurant.com/loyalty',
      'https://cocodimamarestaurant.com',
    ],
  },
  {
    id: 'atis',
    name: 'Atis',
    emoji: '🥗',
    cuisine: 'other',
    priceRange: '£',
    location: 'Cabot Place, Canary Wharf',
    lat: 51.5041,
    lng: -0.0196,
    urls: ['https://www.atis.co.uk/pages/loyalty', 'https://www.atis.co.uk'],
  },
  {
    id: 'garbanzos',
    name: 'Garbanzos',
    emoji: '🫘',
    cuisine: 'mexican',
    priceRange: '£',
    location: 'Cabot Place, Canary Wharf',
    lat: 51.5041,
    lng: -0.0199,
    urls: ['https://www.garbanzos.co.uk/offers', 'https://www.garbanzos.co.uk'],
  },

  // ── Canada Place / south mall cluster ────────────────────────────────────────
  {
    id: 'salad-project',
    name: 'Salad Project',
    emoji: '🥗',
    cuisine: 'other',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5049,
    lng: -0.0188,
    urls: [
      'https://www.thesaladproject.co.uk/loyalty',
      'https://www.thesaladproject.co.uk/offers',
      'https://www.thesaladproject.co.uk',
    ],
  },
  {
    id: 'joe-juice',
    name: 'Joe & The Juice',
    emoji: '🧃',
    cuisine: 'other',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5049,
    lng: -0.0184,
    urls: [
      'https://www.joeandthejuice.com/loyalty',
      'https://www.joeandthejuice.com',
    ],
  },
  {
    id: 'blank-street',
    name: 'Blank Street Coffee',
    emoji: '☕',
    cuisine: 'other',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5048,
    lng: -0.0186,
    urls: [
      'https://www.blankstreetcoffee.co.uk/pages/loyalty',
      'https://www.blankstreetcoffee.co.uk/pages/rewards',
      'https://www.blankstreetcoffee.co.uk',
    ],
  },
  {
    id: 'watchhouse',
    name: 'Watchhouse',
    emoji: '☕',
    cuisine: 'other',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5049,
    lng: -0.0185,
    urls: [
      'https://www.watchhouse.com/pages/loyalty',
      'https://www.watchhouse.com/pages/rewards',
      'https://www.watchhouse.com',
    ],
  },
  {
    id: 'island-poke',
    name: 'Island Poke',
    emoji: '🐟',
    cuisine: 'other',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5049,
    lng: -0.0184,
    urls: [
      'https://www.islandpoke.com/loyalty',
      'https://www.islandpoke.com/pages/rewards',
      'https://www.islandpoke.com',
    ],
  },
  {
    id: 'pilpel',
    name: 'Pilpel',
    emoji: '🧆',
    cuisine: 'mediterranean',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5049,
    lng: -0.0186,
    urls: ['https://www.pilpel.co.uk/deals', 'https://www.pilpel.co.uk'],
  },
  {
    id: 'chai-guys',
    name: 'Chai Guys',
    emoji: '🍵',
    cuisine: 'other',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5050,
    lng: -0.0187,
    urls: ['https://www.chaiguys.co.uk/offers', 'https://www.chaiguys.co.uk'],
  },
  {
    id: 'indi-go',
    name: 'Indi-go',
    emoji: '🍛',
    cuisine: 'indian',
    priceRange: '£',
    location: 'Canada Place, Canary Wharf',
    lat: 51.5050,
    lng: -0.0186,
    urls: ['https://www.indi-go.co.uk/offers', 'https://www.indi-go.co.uk'],
  },
]

// ─── HTTP fetch with timeout ──────────────────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ─── Deal extraction ──────────────────────────────────────────────────────────
interface ExtractedDeal {
  discountLabel: string
  dealType: Deal['dealType']
  description: string
  code?: string
}

function extractDeal(text: string): ExtractedDeal | null {
  // Try specific discounts first
  const pct = text.match(PCT_RE)
  const poundOff = text.match(POUND_OFF_RE)
  const freeItem = text.match(FREE_ITEM_RE)
  const setMenu = SET_MENU_RE.test(text)
  const loyalty = LOYALTY_RE.test(text)
  const meerkat = MEERKAT_RE.test(text)
  const blueLight = BLUE_LIGHT_RE.test(text)
  const student = STUDENT_RE.test(text)

  // Extract promo code if present
  const codeMatch = text.match(/\b(?:code|use|promo|voucher)[\s:]+([A-Z][A-Z0-9]{3,14})\b/)
  const code = codeMatch?.[1]

  if (pct) {
    return {
      discountLabel: `${pct[1]}% off`,
      dealType: 'percentage',
      description: `Get ${pct[1]}% off at this location.`,
      code,
    }
  }
  if (poundOff) {
    return {
      discountLabel: `£${poundOff[1]} off`,
      dealType: 'fixed',
      description: `Save £${poundOff[1]} on your order.`,
      code,
    }
  }
  if (freeItem) {
    const item = freeItem[1]
    return {
      discountLabel: `Free ${item}`,
      dealType: 'freeItem',
      description: `Get a free ${item} — see website for details.`,
      code,
    }
  }
  if (setMenu) {
    const fromMatch = text.match(/from\s+(£\d+(?:\.\d{2})?)/i)
    return {
      discountLabel: fromMatch ? `From ${fromMatch[1]}` : 'Set menu deal',
      dealType: 'setMenu',
      description: 'Set lunch menu available — see website for current pricing.',
      code,
    }
  }
  if (meerkat) {
    return {
      discountLabel: '2 for 1 mains',
      dealType: '2for1',
      description: '2-for-1 on mains every Tuesday and Wednesday with Meerkat Meals.',
      code,
    }
  }
  if (blueLight) {
    return {
      discountLabel: 'Blue Light Card discount',
      dealType: 'percentage',
      description:
        'Blue Light Card holders (NHS, emergency services, armed forces) get a discount. See website.',
      code,
    }
  }
  if (student) {
    return {
      discountLabel: 'Student discount',
      dealType: 'percentage',
      description: 'Student discount available via UNiDAYS or Student Beans.',
      code,
    }
  }
  if (loyalty) {
    return {
      discountLabel: 'Loyalty rewards',
      dealType: 'percentage',
      description:
        'Download the app or collect stamps to earn free items and exclusive rewards.',
      code,
    }
  }
  return null
}

// ─── Per-restaurant scrape ────────────────────────────────────────────────────
async function scrapeRestaurant(r: FCRestaurant, index: number): Promise<Deal | null> {
  for (const url of r.urls) {
    const html = await fetchWithTimeout(url)
    if (!html) continue

    const $ = cheerio.load(html)

    // Remove noise: nav, footer, cookie banners, scripts
    $('nav, footer, script, style, noscript, [class*="cookie"], [class*="banner"]').remove()

    const text = $.root().text().replace(/\s+/g, ' ').trim()
    if (text.length < 100) continue // page too sparse to be useful

    const extracted = extractDeal(text)
    if (!extracted) continue

    // Use the first sentence of the main content as the tagline
    const sentences = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean)
    const tagline = sentences.find((s) => s.length > 20 && s.length < 100) ?? r.name

    return {
      id: `fc-${r.id}-${index}`,
      restaurant: r.name,
      tagline: tagline.slice(0, 80),
      description: extracted.description,
      dealType: extracted.dealType,
      discountLabel: extracted.discountLabel,
      code: extracted.code,
      cuisine: r.cuisine,
      priceRange: r.priceRange,
      validDays: ['everyday'],
      url,
      location: r.location,
      lat: r.lat,
      lng: r.lng,
      source: 'scraped',
      imageEmoji: r.emoji,
    }
  }
  return null
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function scrapeFastCasual(): Promise<Deal[]> {
  const results = await Promise.allSettled(
    RESTAURANTS.map((r, i) => scrapeRestaurant(r, i))
  )

  const deals: Deal[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      deals.push(r.value)
    } else if (r.status === 'rejected') {
      console.error(`[fastcasual] error scraping ${RESTAURANTS[i].name}:`, r.reason)
    }
  })

  console.log(`[fastcasual] scraped ${deals.length}/${RESTAURANTS.length} restaurants`)
  return deals
}
