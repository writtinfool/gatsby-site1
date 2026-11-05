// @ts-check
import { defineConfig } from 'astro/config';

// Static output for Cloudflare Pages (build: `npm run build`, output: `dist`).
export default defineConfig({
  site: 'https://transitions.newtreecap.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
