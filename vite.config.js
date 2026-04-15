import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        log: 'src/log.html',
      },
    },
  },
  server: {
    // port: 5173,
    // hmr: {
    //   port: 5173,
    // },
  },
});
