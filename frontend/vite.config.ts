import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Собираем расширение в dist/: его и нужно загружать через chrome://extensions
export default defineConfig({
  root: path('./src'),
  publicDir: path('./public'),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path('./dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: path('./src/sidepanel/index.html'),
        permission: path('./src/permission/index.html'),
        background: path('./src/background/background.ts'),
      },
      output: {
        // manifest.json ссылается на фиксированное имя service worker
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
