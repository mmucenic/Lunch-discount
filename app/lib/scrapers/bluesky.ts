import { Deal } from '@/app/types/deals'

// ─── Bluesky public AppView API — no auth, no token, completely free ──────────
// Docs: https://docs.bsky.app/docs/api/app-bsky-feed-search-posts
const BSKY_API = 'https://public.api.bsky.app/xrpc'

// ─── Search queries to run ────────────────────────────────────────────────────
// Each string is sent as a separate search; results are deduplicated by post URI.
const SEARCH_QUERIES = [
  'canary wharf lunch deal',
  'canary wharf offer discount',
  'canary wharf food truck',
  'E14 lunch deal',
  'canary wharf restaurant promo',
]

// ─── Known restaurant / food-brand Bluesky handles ───────────────────────────
// Add more as brands join.  These are fetched separately via getAuthorFeed.
const KNOWN_HANDLES: { handle: string; name: string; emoji: string }[] = [
  { handle: 'wagamama.bsky.social', name: 'Wagamama', emoji: '🍜' },
  { handle: 'leon.bsky.social', name: 'Leon', emoji: '🥗' },
  { handle: 'pretamanger.bsky.social', name: 'Pret a Manger', emoji: '☕' },
]

// ─── Keyword detection ────────────────────────────────────────────────────────
const DEAL_RE =
  /\b(\d+\s*%\s*off|free\s+\w+|half[\s-]price|promo\s*code|discount\s*code|voucher\s*code|set\s+menu|lunch\s+deal|lunch\s+offer|happy\s+hour|daily\s+special|bogof|buy\s+one\s+get)\b/i
const CODE_RE =
  /(?:code|use|promo|voucher)[\s:]+([A-Z][A-Z0-9]{3,14})\b/i
const PERCENT_RE = /(\d+)\s*%\s*off/i
const POUND_RE = /£\s*(\d+)\s*off/i

// ─── Bluesky post shape (partial) ────────────────────────────────────────────
interface BskyPost {
  uri: string
  author: { handle: string; displayName?: string }
  record: { text?: string; createdAt?: string }
  indexedAt?: string
}

// ─── Text → Deal ──────────────────────────────────────────────────────────────
function postToDeal(post: BskyPost, fallbackName?: string, fallbackEmoji = '🦋'): Deal | null {
  const text = post.record?.text ?? ''
  if (!text || !DEAL_RE.test(text)) return null

  const pctMatch = text.match(PERCENT_RE)
  const poundMatch = text.match(POUND_RE)
  const codeMatch = text.match(CODE_RE)

  const discountLabel = pctMatch
    ? `${pctMatch[1]}% off`
    : poundMatch
    ? `£${poundMatch[1]} off`
    : text.match(/free\s+\w+/i)?.[0] ?? 'Deal on Bluesky'

  const restaurant =
    fallbackName ?? post.author.displayName ?? `@${post.author.handle}`

  // Build a link to the Bluesky post (convert AT URI → web URL)
  // AT URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const rkey = post.uri.split('/').pop() ?? ''
  const profileUrl = `https://bsky.app/profile/${post.author.handle}`
  const postUrl = rkey ? `${profileUrl}/post/${rkey}` : profileUrl

  return {
    id: `bsky-${post.uri.replace(/[^a-z0-9]/gi, '-')}`,
    restaurant,
    tagline: text.replace(/\n+/g, ' ').slice(0, 80),
    description: text.replace(/\n+/g, ' ').slice(0, 300),
    dealType: pctMatch ? 'percentage' : poundMatch ? 'fixed' : 'percentage',
    discountLabel,
    code: codeMatch?.[1],
    cuisine: 'other',
    priceRange: '££',
    validDays: ['everyday'],
    url: postUrl,
    location: 'Canary Wharf',
    source: 'scraped',
    imageEmoji: fallbackEmoji,
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function searchPosts(query: string): Promise<BskyPost[]> {
  const url = `${BSKY_API}/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=20&sort=latest`
  const res = await fetch(url, { next: { revalidate: 1800 } })
  if (!res.ok) return []
  const data = (await res.json()) as { posts?: BskyPost[] }
  return data.posts ?? []
}

async function fetchAuthorFeed(
  handle: string
): Promise<BskyPost[]> {
  const url = `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=10&filter=posts_no_replies`
  const res = await fetch(url, { next: { revalidate: 1800 } })
  if (!res.ok) return []
  const data = (await res.json()) as {
    feed?: { post?: BskyPost }[]
  }
  return (data.feed ?? []).map((f) => f.post!).filter(Boolean)
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function scrapeBluesky(): Promise<Deal[]> {
  try {
    // Run all searches + author-feed fetches concurrently
    const [searchResults, ...authorResults] = await Promise.all([
      Promise.all(SEARCH_QUERIES.map(searchPosts)),
      ...KNOWN_HANDLES.map((h) => fetchAuthorFeed(h.handle)),
    ])

    const seenUris = new Set<string>()
    const deals: Deal[] = []

    // Process search results (author info comes from the post itself)
    for (const posts of searchResults) {
      for (const post of posts) {
        if (seenUris.has(post.uri)) continue
        seenUris.add(post.uri)
        const deal = postToDeal(post)
        if (deal) deals.push(deal)
      }
    }

    // Process known-handle feeds (override display name + emoji)
    KNOWN_HANDLES.forEach(({ name, emoji }, idx) => {
      const posts = authorResults[idx] ?? []
      for (const post of posts) {
        if (seenUris.has(post.uri)) continue
        seenUris.add(post.uri)
        const deal = postToDeal(post, name, emoji)
        if (deal) deals.push(deal)
      }
    })

    return deals
  } catch (err) {
    console.error('[bluesky scraper]', err)
    return []
  }
}
