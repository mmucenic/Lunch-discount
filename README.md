# Canary Wharf Lunch Deals

A mobile-first web app for finding lunch deals, discount codes, and offers at restaurants near Canary Wharf, London.

## Features

- **Curated deals** — 14+ verified deals across Wagamama, Dishoom, Wahaca, itsu, Pret and more
- **Live scraping** — automatically checks the Canary Wharf Group offers page for new promotions (refreshed hourly)
- **Smart day filter** — defaults to today's day so only currently-valid deals show first
- **Filter by cuisine, deal type, and price range**
- **Search** — find a specific restaurant or deal type instantly
- **Reveal discount codes** — tap to reveal codes without copying to notes
- **Mobile-first** — designed for use on a phone during the lunch rush

## Deal sources

| Source | What you get |
|--------|-------------|
| **Meerkat Meals** (comparethemarket app) | 2-for-1 mains every Tuesday & Wednesday at Wagamama, Côte, Bill's, Banana Tree |
| **itsu app** | 20% off every order |
| **Pret subscription** | Up to 5 barista drinks/day from £30/month |
| **Wasabi app** | £1 off every order |
| **Tastecard** | 2-for-1 or 25% off at Busaba and others |
| **Restaurant newsletters** | Tortilla (free burrito), Wahaca (20% off), Shake Shack (10% off) |
| **Set lunch menus** | Dishoom from £15, LEON meal deal from £8.50 |
| **canarywharf.com/offers** | Scraped automatically every hour |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

## Deploy (free, one-click)

The easiest way to make this accessible on your phone from anywhere is to deploy it to Vercel:

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Click **Deploy** — it's live in ~60 seconds
4. Bookmark the URL on your phone

No environment variables needed.

## Adding new deals

Edit `app/data/deals.ts` and add a new entry to the `curatedDeals` array. The `Deal` type is defined in `app/types/deals.ts`.

```typescript
{
  id: 'unique-id',
  restaurant: 'Restaurant Name',
  tagline: 'Short tagline shown on the card',
  description: 'Full description of the deal',
  dealType: 'percentage',      // '2for1' | 'percentage' | 'fixed' | 'freeItem' | 'setMenu' | 'subscription'
  discountLabel: '20% off',
  code: 'OPTIONAL_CODE',       // shown behind a "Reveal code" button
  cuisine: 'italian',
  priceRange: '££',
  validDays: ['tuesday', 'wednesday'], // or ['everyday']
  requiresApp: 'App name',     // optional
  url: 'https://...',
  location: 'Canary Wharf',
  source: 'curated',
  imageEmoji: '🍕',
}
```

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** — utility-first styling
- **cheerio** — HTML scraping for canarywharf.com
- ISR with 1-hour revalidation — fast loads, fresh data
