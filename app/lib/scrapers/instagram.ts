import * as cheerio from 'cheerio'
import { Deal } from '@/app/types/deals'

// ─── Curated CW restaurant & food-truck accounts ─────────────────────────────
// Keep handles lowercase.  Add new ones as restaurants open / trucks appear.
const ACCOUNTS: { handle: string; name: string; emoji: string }[] = [
  // Sit-down chains with Canary Wharf branches
  { handle: 'wagamamarestaurants', name: 'Wagamama', emoji: '🍜' },
  { handle: 'itsu', name: 'itsu', emoji: '🍱' },
  { handle: 'wasabisushiuk', name: 'Wasabi', emoji: '🍣' },
  { handle: 'leonrestaurants', name: 'Leon', emoji: '🥗' },
  { handle: 'pretamanger', name: 'Pret a Manger', emoji: '☕' },
  { handle: 'wahacauk', name: 'Wahaca', emoji: '🌮' },
  { handle: 'tortillalimited', name: 'Tortilla', emoji: '🌯' },
  { handle: 'busabauk', name: 'Busaba', emoji: '🍛' },
  { handle: 'shakeshackuk', name: 'Shake Shack', emoji: '🍔' },
  { handle: 'yosushi', name: 'YO! Sushi', emoji: '🍣' },
  { handle: 'cotebrasserie', name: 'Côte Brasserie', emoji: '🥐' },
  { handle: 'dishoom', name: 'Dishoom', emoji: '🫓' },
  { handle: 'billsrestaurants', name: "Bill's", emoji: '🥞' },
  { handle: 'bananatreethai', name: 'Banana Tree', emoji: '🍌' },
  // Fast casual / grab-and-go
  { handle: 'greggs_official', name: 'Greggs', emoji: '🥐' },
  { handle: 'pokedbowluk', name: 'Poked', emoji: '🍚' },
  // Food trucks & street-food vendors active around E14
  { handle: 'kerb_food', name: 'KERB Street Food', emoji: '🚚' },
  { handle: 'baostation_london', name: 'BAO Station', emoji: '🥟' },
  { handle: 'thehalloumiguys', name: 'The Halloumi Guys', emoji: '🧀' },
  { handle: 'fatcatfoodtruck', name: 'Fat Cat Food Truck', emoji: '🐱' },
  // Canary Wharf Group (posts event / food market announcements)
  { handle: 'canarywharf', name: 'Canary Wharf', emoji: '🏙️' },
]

// ─── Keyword regexes ──────────────────────────────────────────────────────────
const DEAL_RE =
  /\b(\d+\s*%\s*off|free\s+\w+|half[\s-]price|code[\s:]+[A-Z0-9]{3,15}|promo|discount|deal|lunch\s+offer|set\s+menu|happy\s+hour|daily\s+special|limited\s+offer|buy\s+one|bogof)\b/i

const CODE_RE =
  /(?:code|use|promo|voucher)[\s:]+([A-Z][A-Z0-9]{3,14})\b/i

const PERCENT_RE = /(\d+)\s*%\s*off/i
const POUND_RE = /£\s*(\d+)\s*off/i

// ─── Graph API (when INSTAGRAM_ACCESS_TOKEN is set) ───────────────────────────
// Setup: create a Facebook App → add Instagram Basic Display product (or
// Instagram Graph API) → generate a long-lived access token and paste it into
// .env.local as INSTAGRAM_ACCESS_TOKEN.
// The token gives access to YOUR account's own media.  To monitor other brands,
// add them to a Meta Business Suite and request the relevant permissions.
async function fetchViaGraphAPI(token: string): Promise<{ caption: string; url: string }[]> {
  const res = await fetch(
    `https://graph.instagram.com/me/media?fields=caption,permalink,timestamp&limit=20&access_token=${token}`,
    { next: { revalidate: 1800 } }
  )
  if (!res.ok) return []

  const json = (await res.json()) as {
    data?: { caption?: string; permalink?: string }[]
  }

  return (json.data ?? [])
    .filter((p) => p.caption && DEAL_RE.test(p.caption))
    .map((p) => ({ caption: p.caption!, url: p.permalink ?? '' }))
}

// ─── HTML scraping fallback (best-effort, no credentials needed) ──────────────
// Instagram's public profile pages embed some post data in JSON script tags.
// This worked reliably until late 2024; Instagram now increasingly requires
// login, so this may return [] — the curated fallback entries are used instead.
async function fetchViaHTML(handle: string): Promise<string[]> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      next: { revalidate: 1800 },
    })

    if (!res.ok) return []

    const $ = cheerio.load(await res.text())
    const captions: string[] = []

    // Instagram buries caption text in `"text":"…"` inside JSON script blocks
    $('script').each((_, el) => {
      const src = $(el).text()
      if (!src.includes('"text"') && !src.includes('"caption"')) return

      try {
        // Grab every "text":"…" value that might be a caption
        const raw = JSON.parse(src)
        const str = JSON.stringify(raw)
        const matches = str.match(/"text":"((?:[^"\\]|\\.)*)"/g) ?? []
        matches.forEach((m) => {
          const text = m
            .slice(8, -1)                          // strip "text":"…"
            .replace(/\\n/g, ' ')
            .replace(/\\u[\da-f]{4}/gi, '')
            .trim()
          if (text.length > 20 && DEAL_RE.test(text)) captions.push(text)
        })
      } catch {
        // Non-JSON script tag — skip
      }
    })

    return captions
  } catch {
    return []
  }
}

// ─── Caption → Deal conversion ────────────────────────────────────────────────
function captionToDeal(
  caption: string,
  url: string,
  account: (typeof ACCOUNTS)[0],
  idx: number
): Deal {
  const codeMatch = caption.match(CODE_RE)
  const pctMatch = caption.match(PERCENT_RE)
  const poundMatch = caption.match(POUND_RE)

  const discountLabel = pctMatch
    ? `${pctMatch[1]}% off`
    : poundMatch
    ? `£${poundMatch[1]} off`
    : caption.match(/free\s+\w+/i)?.[0] ?? 'Social deal'

  return {
    id: `ig-${account.handle}-${idx}-${Date.now()}`,
    restaurant: account.name,
    tagline: caption.replace(/\n+/g, ' ').slice(0, 80),
    description: caption.replace(/\n+/g, ' ').slice(0, 300),
    dealType: pctMatch ? 'percentage' : poundMatch ? 'fixed' : 'percentage',
    discountLabel,
    code: codeMatch?.[1],
    cuisine: 'other',
    priceRange: '££',
    validDays: ['everyday'],
    url: url || `https://www.instagram.com/${account.handle}/`,
    location: 'Canary Wharf',
    source: 'scraped',
    imageEmoji: account.emoji,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function scrapeInstagram(): Promise<Deal[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN

  // ── Tier 1: official Graph API ─────────────────────────────────────────────
  if (token) {
    try {
      const posts = await fetchViaGraphAPI(token)
      if (posts.length > 0) {
        // We don't know which account each post belongs to from own-media calls,
        // so use a generic "Instagram" account entry.
        const genericAccount = {
          handle: 'instagram',
          name: 'Instagram deal',
          emoji: '📸',
        }
        return posts.map((p, i) => captionToDeal(p.caption, p.url, genericAccount, i))
      }
    } catch (err) {
      console.error('[instagram graph api]', err)
    }
  }

  // ── Tier 2: best-effort HTML scraping for each curated account ─────────────
  const results = await Promise.allSettled(
    ACCOUNTS.map(async (account) => {
      const captions = await fetchViaHTML(account.handle)

      if (captions.length === 0) return []

      return captions.map((caption, i) =>
        captionToDeal(caption, `https://www.instagram.com/${account.handle}/`, account, i)
      )
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Deal[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
}
