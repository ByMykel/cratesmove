import {computed} from 'vue';
import {useColorMode} from '@vueuse/core';

type ThemePreference = 'light' | 'dark' | 'system';

const colorMode = useColorMode({emitAuto: true});

export function useTheme() {
  const preference = computed<ThemePreference>({
    get: () => (colorMode.store.value === 'auto' ? 'system' : (colorMode.store.value as 'light' | 'dark')),
    set: (v: ThemePreference) => {
      colorMode.store.value = v === 'system' ? 'auto' : v;
    },
  });

  const resolvedTheme = computed<'light' | 'dark'>(() =>
    colorMode.state.value === 'dark' ? 'dark' : 'light',
  );

  return {preference, resolvedTheme};
}
