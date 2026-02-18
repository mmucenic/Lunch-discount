import { Deal } from '@/app/types/deals'
import { scrapeCanaryWharf } from './scrapers/canarywharf'
import { scrapeVoucherCodes } from './scrapers/vouchercodes'
import { scrapeTimeOut } from './scrapers/timeout'

/**
 * Runs all scrapers in parallel and merges results.
 * Each individual scraper handles its own errors and returns [] on failure,
 * so this will always resolve — never reject.
 */
export async function scrapeAllSources(): Promise<Deal[]> {
  const [cwDeals, vcDeals, toDeals] = await Promise.all([
    scrapeCanaryWharf(),
    scrapeVoucherCodes(),
    scrapeTimeOut(),
  ])

  return [...cwDeals, ...vcDeals, ...toDeals]
}
