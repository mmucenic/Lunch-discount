/**
 * Standalone scraper script — runs outside Next.js on GitHub Actions.
 * Writes results to app/data/scraped-deals.json which is committed and
 * picked up at the next build / ISR revalidation.
 *
 * Run locally:  npm run scrape
 */

// Use relative imports so tsx can resolve them without needing the @/ alias
import { scrapeCanaryWharf } from '../app/lib/scrapers/canarywharf'
import { scrapeVoucherCodes } from '../app/lib/scrapers/vouchercodes'
import { scrapeTimeOut } from '../app/lib/scrapers/timeout'
import { scrapeBluesky } from '../app/lib/scrapers/bluesky'
// Instagram is omitted — requires login and will always return [] without credentials

import { writeFileSync } from 'fs'
import { join } from 'path'

async function main() {
  const start = Date.now()
  console.log(`[scrape] starting at ${new Date().toISOString()}`)

  const [cwDeals, vcDeals, toDeals, bskyDeals] = await Promise.all([
    scrapeCanaryWharf(),
    scrapeVoucherCodes(),
    scrapeTimeOut(),
    scrapeBluesky(),
  ])

  const deals = [...cwDeals, ...vcDeals, ...toDeals, ...bskyDeals]

  console.log(
    `[scrape] done in ${Date.now() - start}ms — ` +
    `cw=${cwDeals.length} vc=${vcDeals.length} to=${toDeals.length} bsky=${bskyDeals.length} ` +
    `total=${deals.length}`
  )

  const outPath = join(process.cwd(), 'app/data/scraped-deals.json')
  writeFileSync(outPath, JSON.stringify(deals, null, 2))
  console.log(`[scrape] written → ${outPath}`)
}

main().catch((err) => {
  console.error('[scrape] fatal:', err)
  process.exit(1)
})
