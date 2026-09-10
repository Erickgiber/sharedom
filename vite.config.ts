import { defineConfig, type Plugin } from 'vite';

const SITE_URL = 'https://erickgiber.github.io/sharedom/';

/**
 * Every page of the site, and the clean URL it is served at. GitHub Pages resolves
 * an extensionless request to the matching `.html` file, so `privacy.html` answers
 * `/privacy` directly — no redirect, no trailing slash. `appType: 'mpa'` below makes
 * the dev server resolve them the same way instead of falling back to index.html.
 */
const PAGES = [
  { name: 'main', file: 'index.html', path: '', changefreq: 'weekly', priority: '1.0' },
  { name: 'privacy', file: 'privacy.html', path: 'privacy', changefreq: 'yearly', priority: '0.3' },
];

/** A hand-written lastmod goes stale on every deploy, so it is emitted at build time. */
function sitemap(): Plugin {
  return {
    name: 'sharedom-sitemap',
    generateBundle() {
      const lastmod = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`,
      });
    },
  };
}

export default defineConfig({
  root: 'preview',
  base: './',
  appType: 'mpa',
  plugins: [sitemap()],
  build: {
    outDir: '../dist-preview',
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        PAGES.map((page) => [page.name, new URL(`./preview/${page.file}`, import.meta.url).pathname])
      ),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      'sharedom/ssr': new URL('./src/ssr.ts', import.meta.url).pathname,
      'sharedom': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
