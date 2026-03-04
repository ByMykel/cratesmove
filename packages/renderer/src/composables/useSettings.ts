import { ref, watch } from 'vue';

export type PriceSource = 'steam' | 'csfloat';

const STORAGE_KEY = 'app-settings';

interface AppSettings {
  priceSource: PriceSource;
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { priceSource: 'steam' };
}

function save(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

const priceSource = ref<PriceSource>(load().priceSource);

watch(priceSource, () => {
  save({ priceSource: priceSource.value });
});

export function useSettings() {
  return { priceSource };
}
