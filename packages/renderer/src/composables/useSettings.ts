import { ref, watch } from 'vue';
import { getProxySettings, setProxySettings } from '@app/preload';

export type PriceSource = 'steam' | 'csfloat';
export type ProxyMode = 'none' | 'custom';
export type ProxyType = 'http' | 'socks5';

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

const proxyMode = ref<ProxyMode>('none');
const proxyType = ref<ProxyType>('http');
const proxyUrl = ref('');
const proxyLoaded = ref(false);

getProxySettings().then(settings => {
  proxyMode.value = (settings.mode as ProxyMode) || 'none';
  proxyType.value = (settings.type as ProxyType) || 'http';
  proxyUrl.value = settings.url || '';
  proxyLoaded.value = true;
});

function saveProxy() {
  setProxySettings({
    mode: proxyMode.value,
    type: proxyType.value,
    url: proxyUrl.value,
  });
}

export function useSettings() {
  return { priceSource, proxyMode, proxyType, proxyUrl, proxyLoaded, saveProxy };
}
