import {
  getConsoleLogs,
  getNetworkRequests,
  startConsoleCapture,
  startNetworkCapture,
} from '../../../src/tracker';

/**
 * Runs in the MAIN world so it can hook the page's own console and network stack.
 * The isolated content script talks to it through DOM events.
 */
(() => {
  // Exit immediately in iframes to avoid consuming resources on embedded banners/widgets
  if (typeof window === 'undefined' || window.top !== window.self) return;

  const w = window as Window & { __sharedom_tracker_installed__?: boolean };
  if (w.__sharedom_tracker_installed__) return;
  w.__sharedom_tracker_installed__ = true;

  startConsoleCapture();
  startNetworkCapture();

  window.addEventListener('__sharedom_request_sync__', () => {
    try {
      const payload = JSON.stringify({ logs: getConsoleLogs(), reqs: getNetworkRequests() });
      window.dispatchEvent(new CustomEvent('__sharedom_sync_response__', { detail: payload }));
    } catch {}
  });
})();
