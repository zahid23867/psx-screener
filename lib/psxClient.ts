import * as cheerio from "cheerio";

/**
 * Real PSX data client - hits the same public AJAX endpoints that power PSX's
 * own Data Portal (dps.psx.com.pk) pages, which is what free community tools
 * like `psxdata` / `psx-data-reader` use. This is NOT PSX's official API and
 * is not a paid real-time feed:
 *  - Data reflects the exchange's public delayed board (small lag, no SLA).
 *  - PSX's Terms of Use restrict *redistributing* this data commercially -
 *    fine for personal research/decision-support, not for reselling a feed.
 *  - For a licensed real-time feed, use PSX Data Vending or a broker API
 *    (e.g. AKD) once you have credentials - see swap point at the bottom.
 */

const BASE_URL = "https://dps.psx.com.pk";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: `${BASE_URL}/`,
  "X-Requested-With": "XMLHttpRequest",
};

export interface BoardRow {
  symbol: string;
  name: string;
  ldcp: number; // previous close
  change: number; // absolute change (signed)
  volume: number; // running volume for the session
  price: number; // derived: ldcp + change
}

export interface HistoricalRow {
  date: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function parseNumber(text: string): number {
  const n = parseFloat(text.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

// --- Simple in-memory caches + a soft rate limiter (PSX's own client caps at ~2 req/s) ----

let boardCache: { data: Map<string, BoardRow>; fetchedAt: number } | null = null;
const BOARD_TTL_MS = 45_000;

const historicalCache = new Map<string, { data: HistoricalRow[]; fetchedAt: number }>();
const HISTORICAL_TTL_MS = 4 * 60 * 60_000; // 4 hours - EOD data only changes once/day

let lastRequestAt = 0;
async function throttledFetch(input: string, init?: RequestInit) {
  const minGapMs = 550; // ~1.8 req/s, under PSX's soft limit
  const wait = Math.max(0, lastRequestAt + minGapMs - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fetch(input, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
}

export async function fetchTradingBoard(): Promise<Map<string, BoardRow> | null> {
  if (boardCache && Date.now() - boardCache.fetchedAt < BOARD_TTL_MS) {
    return boardCache.data;
  }
  try {
    const res = await throttledFetch(`${BASE_URL}/trading-board/REG/main`);
    if (!res.ok) throw new Error(`trading-board HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const rows = new Map<string, BoardRow>();

    $("table#tradingBoardTable tbody tr").each((_, el) => {
      const tds = $(el).find("td");
      const symbol = $(tds[0]).find("strong").text().trim() || $(tds[0]).text().trim();
      if (!symbol) return;
      const name = $(tds[1]).text().trim();
      const ldcp = parseNumber($(tds[6]).text());
      const change = parseNumber($(tds[7]).text().replace(/[^\d.,-]/g, ""));
      const volume = parseNumber($(tds[8]).text());
      rows.set(symbol, { symbol, name, ldcp, change, volume, price: ldcp + change });
    });

    if (rows.size === 0) throw new Error("empty trading board - parser may need updating");
    boardCache = { data: rows, fetchedAt: Date.now() };
    return rows;
  } catch (err) {
    console.error("[psxClient] fetchTradingBoard failed:", err);
    return boardCache?.data ?? null; // serve stale cache if available, else null
  }
}

export async function fetchHistorical(symbol: string): Promise<HistoricalRow[] | null> {
  const cached = historicalCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < HISTORICAL_TTL_MS) {
    return cached.data;
  }
  try {
    const res = await throttledFetch(`${BASE_URL}/historical`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `symbol=${encodeURIComponent(symbol)}`,
    });
    if (!res.ok) throw new Error(`historical HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const rows: HistoricalRow[] = [];

    $("table#historicalTable tbody tr").each((_, el) => {
      const tds = $(el).find("td");
      const dateAttr = $(tds[0]).attr("data-order");
      const dateMs = dateAttr ? parseInt(dateAttr, 10) * 1000 : NaN;
      const open = parseNumber($(tds[1]).text());
      const high = parseNumber($(tds[2]).text());
      const low = parseNumber($(tds[3]).text());
      const close = parseNumber($(tds[4]).text());
      const volume = parseNumber($(tds[5]).text());
      if (Number.isFinite(dateMs) && close > 0) {
        rows.push({ date: dateMs, open, high, low, close, volume });
      }
    });

    rows.sort((a, b) => a.date - b.date); // ascending
    if (rows.length === 0) throw new Error("empty historical table - parser may need updating");
    historicalCache.set(symbol, { data: rows, fetchedAt: Date.now() });
    return rows;
  } catch (err) {
    console.error(`[psxClient] fetchHistorical(${symbol}) failed:`, err);
    return cached?.data ?? null; // serve stale cache if available, else null
  }
}
