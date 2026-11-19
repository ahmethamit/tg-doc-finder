import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// base must match the GitHub Pages path: https://<user>.github.io/tg-doc-finder/
const base = '/tg-doc-finder/';

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      // 'prompt': a new version waits for the user (update banner comes in Phase 5)
      registerType: 'prompt',
      manifest: {
        name: 'TG Doc Finder',
        short_name: 'Doküman Bul',
        lang: 'tr',
        display: 'standalone',
        start_url: base,
        scope: base,
        background_color: '#ffffff',
        theme_color: '#229ed9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Only the app shell is cached. Telegram traffic is never cached (CLAUDE.md).
      workbox: { globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}'] },
    }),
  ],
});
