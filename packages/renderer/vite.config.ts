import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import {fileURLToPath, URL} from 'node:url';

export default defineConfig({
  plugins: [vue(), ui({ui: {colors: {neutral: 'zinc'}}})],
  build: {
    target: 'chrome131',
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
