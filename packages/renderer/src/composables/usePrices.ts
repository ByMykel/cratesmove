import { ref, readonly, watch } from 'vue';
import type { PriceData, InventoryItem } from '@/types/steam';
import { useSettings, type PriceSource } from '@/composables/useSettings';
import { fetchUrl } from '@app/preload';

const STEAM_CDN_URL =
  'https://cdn.jsdelivr.net/gh/bymykel/counter-strike-price-tracker@main/static/latest.json';
const CSFLOAT_URL = 'https://csfloat.com/api/v1/listings/price-list';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const priceMap = ref<Record<string, number>>({});
const updatedAt = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const { priceSource } = useSettings();

initForSource(priceSource.value);

watch(priceSource, newSource => {
  initForSource(newSource);
});

interface CacheEntry {
  data: PriceData;
  cachedAt: number;
}

function cacheKey(source: PriceSource): string {
  return `cs2-prices-cache-${source}`;
}

function loadFromCache(source: PriceSource): PriceData | null {
  try {
    const raw = localStorage.getItem(cacheKey(source));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function saveToCache(source: PriceSource, data: PriceData) {
  try {
    const entry: CacheEntry = { data, cachedAt: Date.now() };
    localStorage.setItem(cacheKey(source), JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — ignore
  }
}

function applyData(data: PriceData) {
  priceMap.value = data.prices;
  updatedAt.value = data.metadata.updated_at;
}

async function fetchSteam(): Promise<PriceData> {
  const res = await fetch(STEAM_CDN_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch prices: ${res.status}`);
  return res.json();
}

async function fetchCSFloat(): Promise<PriceData> {
  const text = await fetchUrl(CSFLOAT_URL);
  const items: { market_hash_name: string; min_price: number }[] = JSON.parse(text);
  const prices: Record<string, number> = {};
  for (const item of items) {
    prices[item.market_hash_name] = Math.round(item.min_price);
  }
  return {
    metadata: { updated_at: new Date().toISOString(), currency: 'USD', item_count: items.length },
    prices,
  };
}

function fetchPrices(source: PriceSource): Promise<PriceData> {
  return source === 'csfloat' ? fetchCSFloat() : fetchSteam();
}

async function refreshPrices() {
  const source = priceSource.value;
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchPrices(source);
    applyData(data);
    saveToCache(source, data);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
}

function initForSource(source: PriceSource) {
  const cached = loadFromCache(source);
  if (cached) {
    applyData(cached);
  } else {
    priceMap.value = {};
    updatedAt.value = null;
  }
  refreshPrices();
}

function getPrice(marketHashName: string): number | null {
  return priceMap.value[marketHashName] ?? null;
}

function formatPrice(cents: number | null): string {
  if (cents == null) return '--';
  return `$${(cents / 100).toFixed(2)}`;
}

function getTotalValue(items: readonly InventoryItem[]): number {
  let total = 0;
  for (const item of items) {
    const price = priceMap.value[item.market_hash_name];
    if (price != null) total += price;
  }
  return total;
}

export function usePrices() {
  return {
    priceMap: readonly(priceMap),
    updatedAt: readonly(updatedAt),
    loading: readonly(loading),
    error: readonly(error),
    getPrice,
    formatPrice,
    getTotalValue,
    refreshPrices,
  };
}
