# PSX Screener

A screener for the Pakistan Stock Exchange (KSE-100) that ranks stocks for maximum profit potential within a month using technical signals, and surfaces breakout/signal alerts and squeeze setups.

## Features
- **Screener tab** - KSE-100 stocks ranked by a 0-100 composite score (RSI, MACD, MA trend, volume surge, upside-to-1-month-high), with Strong Buy / Buy / Neutral / Sell / Strong Sell signals.
- **Alerts tab** - polls every 60s and fires on new breakouts, score crossing >=70, Strong Buy/Sell flips, or squeeze fires (with an optional sound alert).
- **Squeeze Setups tab** - Bollinger-band squeeze/breakout detection on the Daily timeframe.

## Data source (important)
PSX has no official free real-time API. This app uses PSX's public data portal (`dps.psx.com.pk`) - the same source community tools like `psxdata` use - via `lib/psxClient.ts`:
- Real daily OHLCV history + a live-ish trading board (small delay, no SLA).
- This is **not** a licensed real-time feed. PSX's Terms of Use restrict *redistributing* this data commercially - this is intended for personal research/decision-support, not resale.
- 1H/4H squeeze detection is not available since the free source only has daily bars - only Daily squeeze is computed.
- If the live fetch fails, the app automatically falls back to clearly-labeled simulated demo data rather than pretending it's real.
- To integrate a licensed real-time feed (e.g. a broker API like AKD, or PSX Data Vending), replace the implementation in `lib/psxClient.ts` - no other code needs to change.

## Getting started
```bash
npm install
npm run dev
```

Open http://localhost:3000

## Tech stack
Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, cheerio (HTML parsing for the PSX data client).
