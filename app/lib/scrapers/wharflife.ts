import { Deal } from '@/app/types/deals'

// Wharf Life (wharf-life.com) covers new restaurant openings and reviews
// for Canary Wharf, Wood Wharf and the wider Docklands area.
const WL_API = 'https://wharf-life.com/wp-json/wp/v2/posts'

// Must mention food/restaurant context
const FOOD_RE =
  /restaurant|cafe|café|bar|food|dining|drink|menu|kitchen|pizz|sushi|burger|noodle|brasserie|grill|bakery|eatery|brunch|lunch|dinner/i

// Must mention the Canary Wharf / Wood Wharf area
const CW_RE =
  /canary wharf|wood wharf|jubilee place|canada square|cabot|crossrail place/i

// Title patterns that indicate a specific venue (not generic area news)
const VENUE_TITLE_RE =
  /\b(opens?|brings?|launches?|review|serves?|arrives?|expands?|lands?)\b/i

// Patterns used to extract just the venue name from the title
// "Mama Li brings..." → "Mama Li", "Nora opens at..." → "Nora"
const VERB_SPLIT_RE =
  /\s+(?:opens?|brings?|launches?|review[\s:!,]|sets?\s+to|serves?|arrives?|expands?|lands?|is\s+(?:a|an)\s|at\s+(?:canary|wood|jubilee|canada)).*/i

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
  if (/pizza/.test(t)) return '🍕'
  return '🍽️'
}

interface WpPost {
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
  date: string
}

export async function scrapeWharfLife(): Promise<Deal[]> {
  let posts: WpPost[] = []

  try {
    // Fetch the 100 most recent posts; the API search doesn't filter by category
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

  // Only keep posts from the last 6 months so cards stay fresh
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 6)

  const deals: Deal[] = []

  posts.forEach((post, i) => {
    const title = stripHtml(post.title.rendered)
    const excerpt = stripHtml(post.excerpt.rendered)
    const combined = title + ' ' + excerpt

    // Must be a venue-specific article about food at CW
    if (!VENUE_TITLE_RE.test(title)) return
    if (!FOOD_RE.test(combined)) return
    if (!CW_RE.test(combined)) return

    // Only recent articles
    if (new Date(post.date) < cutoff) return

    // Extract the venue name: strip everything from the first action verb onwards,
    // then also strip trailing ", a/an description" qualifiers
    const venueMatch = title
      .replace(VERB_SPLIT_RE, '')
      .replace(/,\s+(?:a|an|the)\s+.*/i, '')
      .trim()
    const restaurant = venueMatch.length >= 2 && venueMatch.length <= 60
      ? venueMatch
      : title.slice(0, 50)

    // Detect if it's a review vs opening vs deal
    const isReview = /\breview\b/i.test(title)
    const hasDeal = /offer|discount|deal|set menu|from £\d+|%\s*off/i.test(combined)
    const discountLabel = hasDeal
      ? 'Special offer'
      : isReview
      ? 'Review'
      : 'New opening'

    const tagline = excerpt
      // Strip the newsletter boilerplate Wharf Life adds to every excerpt
      .replace(/Subscribe to our free Wharf Whispers newsletter here\.?/gi, '')
      .replace(/ADVERTISING FEATURE/gi, '')
      .trim()
      .slice(0, 80)

    deals.push({
      id: `wl-${i}`,
      restaurant,
      tagline: tagline || title.slice(0, 80),
      description: excerpt.replace(/Subscribe to our free Wharf Whispers newsletter here\.?/gi, '').trim().slice(0, 300) || title,
      dealType: hasDeal ? 'percentage' : 'percentage',
      discountLabel,
      cuisine: 'other',
      priceRange: '££',
      validDays: ['everyday'],
      url: post.link,
      location: 'Canary Wharf',
      source: 'scraped',
      imageEmoji: guessEmoji(combined),
    })
  })

  console.log(`[wharflife] scraped ${deals.length} deals`)
  return deals
}
