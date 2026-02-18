import { Deal } from '@/app/types/deals'
import { scrapeCanaryWharf } from './scrapers/canarywharf'
import { scrapeVoucherCodes } from './scrapers/vouchercodes'
import { scrapeTimeOut } from './scrapers/timeout'
import { scrapeInstagram } from './scrapers/instagram'
import { scrapeBluesky } from './scrapers/bluesky'

/**
 * Runs all scrapers in parallel and merges results.
 * Each individual scraper handles its own errors and returns [] on failure,
 * so this will always resolve — never reject.
 *
 * Sources:
 *   canarywharf.com    — official CW Group offers page
 *   vouchercodes.co.uk — voucher codes filtered to CW chains
 *   Time Out London    — editorial lunch deal coverage
 *   Instagram          — HTML best-effort; Graph API if INSTAGRAM_ACCESS_TOKEN set
 *   Bluesky            — public AppView search API, no credentials required
 */
export async function scrapeAllSources(): Promise<Deal[]> {
  const [cwDeals, vcDeals, toDeals, igDeals, bskyDeals] = await Promise.all([
    scrapeCanaryWharf(),
    scrapeVoucherCodes(),
    scrapeTimeOut(),
    scrapeInstagram(),
    scrapeBluesky(),
  ])

  console.log(
    `[scraper] canarywharf=${cwDeals.length} vouchercodes=${vcDeals.length} timeout=${toDeals.length} instagram=${igDeals.length} bluesky=${bskyDeals.length}`
  )

  return [...cwDeals, ...vcDeals, ...toDeals, ...igDeals, ...bskyDeals]
}
