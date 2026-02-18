import { NextResponse } from 'next/server'
import { scrapeCanaryWharf } from '@/app/lib/scrapers/canarywharf'
import { scrapeVoucherCodes } from '@/app/lib/scrapers/vouchercodes'
import { scrapeTimeOut } from '@/app/lib/scrapers/timeout'
import { scrapeBluesky } from '@/app/lib/scrapers/bluesky'

// Always run fresh — never serve a cached response from this endpoint
export const dynamic = 'force-dynamic'

// Probe a URL and return HTTP status + first 200 chars of body
async function probe(label: string, url: string, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers,
      },
    })
    const text = await res.text()
    return {
      label,
      url,
      status: res.status,
      ok: res.ok,
      bodySnippet: text.slice(0, 200),
    }
  } catch (err) {
    return { label, url, status: null, ok: false, error: String(err) }
  }
}

async function runScraper(
  label: string,
  fn: () => Promise<import('@/app/types/deals').Deal[]>
) {
  const start = Date.now()
  try {
    const deals = await fn()
    return {
      label,
      ok: true,
      count: deals.length,
      durationMs: Date.now() - start,
      // Return up to 3 sample deals so you can inspect the output
      sample: deals.slice(0, 3).map((d) => ({
        id: d.id,
        restaurant: d.restaurant,
        tagline: d.tagline,
        source: d.source,
      })),
    }
  } catch (err) {
    return {
      label,
      ok: false,
      count: 0,
      durationMs: Date.now() - start,
      error: String(err),
      sample: [],
    }
  }
}

export async function GET() {
  const [scrapers, probes] = await Promise.all([
    // Run all scrapers in parallel
    Promise.all([
      runScraper('canarywharf', scrapeCanaryWharf),
      runScraper('vouchercodes', scrapeVoucherCodes),
      runScraper('timeout', scrapeTimeOut),
      runScraper('bluesky', scrapeBluesky),
    ]),

    // Probe raw HTTP status for each source URL
    Promise.all([
      probe('canarywharf.com', 'https://www.canarywharf.com/whats-on/offers-promotions/'),
      probe('vouchercodes.co.uk', 'https://www.vouchercodes.co.uk/food-and-drink/restaurants/'),
      probe('timeout.com', 'https://www.timeout.com/london/restaurants/lunch-deals-london'),
      probe('bluesky-api', 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=canary+wharf+lunch+deal&limit=5'),
    ]),
  ])

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      scrapers,
      rawProbes: probes,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
