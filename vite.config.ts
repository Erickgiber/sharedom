import { defineConfig, type Plugin } from 'vite';

const SITE_URL = 'https://erickgiber.github.io/sharedom/';

const PAGES = [
  { name: 'main', file: 'index.html', path: '', changefreq: 'weekly', priority: '1.0' },
  { name: 'privacy', file: 'privacy.html', path: 'privacy', changefreq: 'yearly', priority: '0.3' },
  { name: 'notFound', file: '404.html', path: '404', priority: null },
];

function baseUrl(base: string): Plugin {
  return {
    name: 'sharedom-base-url',
    transformIndexHtml(html) {
      return html.replaceAll('%BASE%', base);
    },
  };
}

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
${PAGES.filter((page) => page.priority !== null)
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

export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/sharedom/' : '/';
  return {
    root: 'preview',
    base,
    appType: 'mpa',
    plugins: [baseUrl(base), sitemap()],
    build: {
      outDir: '../dist-preview',
      emptyOutDir: true,
      chunkSizeWarningLimit: 700,
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
        sharedom: new URL('./src/index.ts', import.meta.url).pathname,
      },
    },
  };
});
