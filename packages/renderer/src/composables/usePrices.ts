import {ref, readonly} from 'vue';
import type {PriceData, InventoryItem} from '@/types/steam';

const CDN_URL = 'https://cdn.jsdelivr.net/gh/bymykel/counter-strike-price-tracker@main/static/latest.json';
const CACHE_KEY = 'cs2-prices-cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const priceMap = ref<Record<string, number>>({});
const updatedAt = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

let initialized = false;

interface CacheEntry {
  data: PriceData;
  cachedAt: number;
}

function loadFromCache(): PriceData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function saveToCache(data: PriceData) {
  try {
    const entry: CacheEntry = {data, cachedAt: Date.now()};
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — ignore
  }
}

function applyData(data: PriceData) {
  priceMap.value = data.prices;
  updatedAt.value = data.metadata.updated_at;
}

async function fetchFromCDN(): Promise<PriceData> {
  const res = await fetch(CDN_URL);
  if (!res.ok) throw new Error(`Failed to fetch prices: ${res.status}`);
  return res.json();
}

async function refreshPrices() {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchFromCDN();
    applyData(data);
    saveToCache(data);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
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
  if (!initialized) {
    initialized = true;
    const cached = loadFromCache();
    if (cached) {
      applyData(cached);
      // Refresh in background even with cache hit
      refreshPrices();
    } else {
      refreshPrices();
    }
  }

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
