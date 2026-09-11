import { runCleanups } from './lifecycle';

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, string>();

const META = [
  'title',
  'meta[name="title"]',
  'meta[name="description"]',
  'meta[name="robots"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:url"]',
  'meta[property="og:type"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'link[rel="canonical"]',
];

function isSameOrigin(url: URL): boolean {
  return url.origin === window.location.origin && url.pathname.startsWith(BASE);
}

function shouldIntercept(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  if (anchor.getAttribute('rel')?.includes('external')) return false;
  return isSameOrigin(new URL(anchor.href, window.location.href));
}

async function load(url: string): Promise<string | null> {
  const cached = cache.get(url);
  if (cached) return cached;
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html' } });
    const html = await response.text();
    cache.set(url, html);
    return html;
  } catch {
    return null;
  }
}

function applyDocument(next: Document): void {
  const root = document.documentElement;
  const nextRoot = next.documentElement;

  root.className = nextRoot.className;
  root.classList.remove('no-js');
  root.lang = nextRoot.lang;
  root.dir = nextRoot.dir;
  for (const key of ['metaTitle', 'metaDescription']) {
    const value = nextRoot.dataset[key];
    if (value) root.dataset[key] = value;
    else delete root.dataset[key];
  }

  for (const selector of META) {
    const incoming = next.querySelector(selector);
    const current = document.head.querySelector(selector);
    if (incoming && current) current.replaceWith(incoming.cloneNode(true));
    else if (incoming) document.head.appendChild(incoming.cloneNode(true));
    else current?.remove();
  }

  document.body.className = next.body.className;
  document.body.innerHTML = next.body.innerHTML;
}

type Mount = () => void;
let mount: Mount = () => {};
let navigating = false;

async function go(href: string, push: boolean): Promise<void> {
  if (navigating) return;
  const url = new URL(href, window.location.href);
  const target = url.pathname + url.search;

  navigating = true;
  document.documentElement.classList.add('is-navigating');
  const html = await load(target);
  document.documentElement.classList.remove('is-navigating');
  navigating = false;

  if (html === null) {
    window.location.href = href;
    return;
  }

  runCleanups();
  applyDocument(new DOMParser().parseFromString(html, 'text/html'));
  if (push) window.history.pushState({ router: true }, '', url.href);

  const anchor = url.hash ? document.querySelector(url.hash) : null;
  if (anchor) anchor.scrollIntoView();
  else window.scrollTo(0, 0);

  mount();
}

export function initRouter(mountPage: Mount): void {
  mount = mountPage;

  document.addEventListener('click', (event) => {
    const anchor = (event.target as Element | null)?.closest?.('a');
    if (!anchor || !shouldIntercept(event, anchor)) return;

    const url = new URL(anchor.href, window.location.href);
    if (url.pathname === window.location.pathname && url.hash) return;

    event.preventDefault();
    void go(anchor.href, true);
  });

  window.addEventListener('popstate', () => {
    void go(window.location.href, false);
  });
}
