import { Deal } from '@/app/types/deals'

// WordPress REST API — no auth required, no scraping needed
const NEWS_API = 'https://canarywharf.com/wp-json/wp/v2/news'
const CW_BASE = 'https://canarywharf.com'

// Require food + deal keywords — but the deal keyword must appear in the TITLE
// (not just the excerpt) so we don't pick up generic "Top 10" roundup articles
const FOOD_RE = /restaurant|dining|lunch|dinner|brunch|supper|café|cafe|bar|food|chef|menu|eat out/i
const DEAL_TITLE_RE = /offer|discount|deal|save|voucher|promo|%\s*off|£\d+\s*off|set\s+menu|prix\s+fixe/i

// Generic roundup article titles that are never specific restaurant deals
const ROUNDUP_RE =
  /\btop\s+\d+\b|\bthings to (do|see)\b|\bguide\b|\bseason\b|\bfestive\b|\bhalloween\b|\beaster\b|\bhalf.term\b|\bsummer\b|\bwinter\b|\bspring\b|\bautumn\b|\bultimate\b|\bwhat to\b|\bdog.friendly\b|\bnature\b/i

// Strip HTML tags and decode common HTML entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface WpPost {
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
}

export async function scrapeCanaryWharf(): Promise<Deal[]> {
  let posts: WpPost[] = []

  try {
    // Fetch recent news articles
    const res = await fetch(
      `${NEWS_API}?per_page=50&_fields=title,excerpt,link`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    )
    if (!res.ok) {
      console.error(`[canarywharf] news API HTTP ${res.status}`)
      return []
    }
    posts = (await res.json()) as WpPost[]
  } catch (err) {
    console.error('[canarywharf] fetch failed:', err)
    return []
  }

  const deals: Deal[] = []

  posts.forEach((post, i) => {
    const title = stripHtml(post.title.rendered)
    const excerpt = stripHtml(post.excerpt.rendered)

    // Skip generic roundup / lifestyle articles
    if (ROUNDUP_RE.test(title)) return
    // Require BOTH a food keyword AND a deal keyword in the title itself
    // so we only pick up actual restaurant deal announcements, not general articles
    if (!DEAL_TITLE_RE.test(title) || !FOOD_RE.test(title)) return
    const combined = title + ' ' + excerpt

    // Infer discount label from text
    const combined2 = combined
    const pctMatch = combined2.match(/(\d+)%\s*off/i)
    const freeMatch = /\bfree\s+(item|meal|drink|food|dessert|delivery|dish)\b/i.test(combined2)
    const setMenuMatch = /set (lunch|menu)|prix fixe|\bfrom £\d+/i.test(combined2)
    const discountLabel = pctMatch
      ? `${pctMatch[1]}% off`
      : freeMatch
      ? 'Free item'
      : setMenuMatch
      ? 'Set menu'
      : 'Canary Wharf offer'

    deals.push({
      id: `cw-${i}`,
      restaurant: title.slice(0, 60),
      tagline: excerpt.slice(0, 80) || title,
      description: excerpt || title,
      dealType: pctMatch ? 'percentage' : setMenuMatch ? 'setMenu' : 'percentage',
      discountLabel,
      cuisine: 'other',
      priceRange: '££',
      validDays: ['everyday'],
      url: post.link,
      location: 'Canary Wharf',
      source: 'scraped',
      imageEmoji: '🍽️',
    })
  })

  console.log(`[canarywharf] scraped ${deals.length} deals`)
  return deals
}
