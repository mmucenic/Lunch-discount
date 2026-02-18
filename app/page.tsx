import { curatedDeals } from '@/app/data/deals'
import { DealsClient } from '@/app/components/DealsClient'
import type { Deal } from '@/app/types/deals'
// Updated hourly by GitHub Actions (scripts/scrape.ts → .github/workflows/scrape.yml)
import scrapedDealsJson from '@/app/data/scraped-deals.json'

const scrapedDeals = scrapedDealsJson as Deal[]

export default async function Home() {
  const deals = [...curatedDeals, ...scrapedDeals]

  return (
    <main className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">£</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Cheap is Cheap
            </h1>
            <p className="text-sm text-gray-500">
              Canary Wharf lunch deals &amp; codes
            </p>
          </div>
        </div>

        {/* Today callout */}
        <div className="mt-4 bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-base">📅</span>
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Tip:</span> Filtered to today&apos;s
            valid deals by default. Use the day filter to browse all days.
          </p>
        </div>
      </div>

      <DealsClient initialDeals={deals} />
    </main>
  )
}
