import { Deal } from '@/app/types/deals'

// Wharf Life (wharf-life.com) covers new restaurant openings and reviews
// for Canary Wharf, Wood Wharf and the wider Docklands area.
const WL_API = 'https://wharf-life.com/wp-json/wp/v2/posts'

// Must mention food/restaurant context
const FOOD_RE =
  /restaurant|cafe|café|bar|food|dining|drink|menu|kitchen|pizz|sushi|burger|noodle|brasserie|grill|bakery|eatery|brunch|lunch|dinner/i

// Must mention the Canary Wharf / Wood Wharf area
const CW_RE =
  /canary wharf|wood wharf|jubilee place|canada square|cabot|crossrail place|george street.*wharf|south dock/i

// Title patterns that indicate a specific venue (not generic area news)
const VENUE_TITLE_RE =
  /\b(opens?|brings?|launches?|review|serves?|arrives?|expands?|lands?)\b/i

// Patterns used to extract just the venue name from the title
// "Mama Li brings..." → "Mama Li", "Nora opens at..." → "Nora"
const VERB_SPLIT_RE =
  /\s+(?:opens?|brings?|launches?|review[\s:!,]|sets?\s+to|serves?|arrives?|expands?|lands?|is\s+(?:a|an)\s|at\s+(?:canary|wood|jubilee|canada)).*/i

// Patterns that indicate a genuine deal/offer in the article
const DEAL_RE = /offer|discount|deal|set menu|prix fixe|from £\d+|%\s*off|special|promotion|voucher|free\s+(item|meal|drink|dish)/i

// Strip HTML tags and decode common entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function guessEmoji(text: string): string {
  const t = text.toLowerCase()
  if (/pizza|italian|pasta/.test(t)) return '🍕'
  if (/sushi|japanese|ramen|noodle/.test(t)) return '🍱'
  if (/burger|american|bbq/.test(t)) return '🍔'
  if (/cantonese|chinese|dim sum|roast meat/.test(t)) return '🥢'
  if (/turkish|middle east|lebanese/.test(t)) return '🥙'
  if (/indian|curry/.test(t)) return '🍛'
  if (/bar|beer|drinks|cocktail|wine/.test(t)) return '🍻'
  if (/cafe|coffee|bakery|pastry/.test(t)) return '☕'
  return '🍽️'
}

// Approximate centre coordinates for the two distinct areas
const WOOD_WHARF_LAT = 51.5020
const WOOD_WHARF_LNG = -0.0159
const CANARY_WHARF_LAT = 51.5051
const CANARY_WHARF_LNG = -0.0201

interface WpPost {
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
  date: string
}

export async function scrapeWharfLife(): Promise<Deal[]> {
  let posts: WpPost[] = []

  try {
    const res = await fetch(
      `${WL_API}?per_page=100&search=canary+wharf&_fields=title,excerpt,link,date`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    )
    if (!res.ok) {
      console.error(`[wharflife] API HTTP ${res.status}`)
      return []
    }
    posts = (await res.json()) as WpPost[]
  } catch (err) {
    console.error('[wharflife] fetch failed:', err)
    return []
  }

  // Only show news items for 2 days — after that they're stale
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const deals: Deal[] = []

  posts.forEach((post, i) => {
    const title = stripHtml(post.title.rendered)
    const excerpt = stripHtml(post.excerpt.rendered)
    const combined = title + ' ' + excerpt

    // Must be a venue-specific article about food at CW/Wood Wharf
    if (!VENUE_TITLE_RE.test(title)) return
    if (!FOOD_RE.test(combined)) return
    if (!CW_RE.test(combined)) return

    // Only keep articles from the last 2 days
    if (new Date(post.date) < twoDaysAgo) return

    // IMPORTANT: skip pure "new opening" and "review" items —
    // only surface articles that mention an actual offer/deal
    const hasDeal = DEAL_RE.test(combined)
    if (!hasDeal) return

    // Extract the venue name
    const venueMatch = title
      .replace(VERB_SPLIT_RE, '')
      .replace(/,\s+(?:a|an|the)\s+.*/i, '')
      .trim()
    const restaurant = venueMatch.length >= 2 && venueMatch.length <= 60
      ? venueMatch
      : title.slice(0, 50)

    // Build a more specific discount label where possible
    const pctMatch = combined.match(/(\d+)%\s*off/i)
    const freeMatch = /\bfree\s+(item|meal|drink|dish)\b/i.test(combined)
    const setMenuMatch = /set (lunch|menu)|prix fixe|\bfrom £\d+/i.test(combined)
    const discountLabel = pctMatch
      ? `${pctMatch[1]}% off`
      : freeMatch
      ? 'Free item'
      : setMenuMatch
      ? 'Set menu deal'
      : 'Special offer'

    const tagline = excerpt
      .replace(/Subscribe to our free Wharf Whispers newsletter here\.?/gi, '')
      .replace(/ADVERTISING FEATURE/gi, '')
      .trim()
      .slice(0, 80)

    // Detect whether the article is about Wood Wharf specifically
    const isWoodWharf = /wood wharf|george street.*wharf|south dock/i.test(combined)
    const location = isWoodWharf ? 'Wood Wharf' : 'Canary Wharf'
    const lat = isWoodWharf ? WOOD_WHARF_LAT : CANARY_WHARF_LAT
    const lng = isWoodWharf ? WOOD_WHARF_LNG : CANARY_WHARF_LNG

    // validUntil = article publication date + 2 days
    const publishedAt = new Date(post.date)
    publishedAt.setDate(publishedAt.getDate() + 2)
    const validUntil = publishedAt.toISOString()

    deals.push({
      id: `wl-${i}`,
      restaurant,
      tagline: tagline || title.slice(0, 80),
      description:
        excerpt
          .replace(/Subscribe to our free Wharf Whispers newsletter here\.?/gi, '')
          .trim()
          .slice(0, 300) || title,
      dealType: pctMatch ? 'percentage' : setMenuMatch ? 'setMenu' : 'percentage',
      discountLabel,
      cuisine: 'other',
      priceRange: '££',
      validDays: ['everyday'],
      validUntil,
      url: post.link,
      location,
      lat,
      lng,
      source: 'scraped',
      imageEmoji: guessEmoji(combined),
    })
  })

  console.log(`[wharflife] scraped ${deals.length} deals with offers`)
  return deals
}
