import { NextResponse } from 'next/server'
import { curatedDeals } from '@/app/data/deals'
import { scrapeAllSources } from '@/app/lib/scraper'

export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    const scrapedDeals = await scrapeAllSources()
    const allDeals = [...curatedDeals, ...scrapedDeals]

    return NextResponse.json(allDeals, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    console.error('Failed to fetch deals:', err)
    // Fall back to curated deals only if scraping fails
    return NextResponse.json(curatedDeals)
  }
}
