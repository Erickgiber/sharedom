import { captureConsoleLogsPages, captureNetworkRequestsPages } from './index';
import {
    clearConsoleLogs,
    clearNetworkRequests,
    getConsoleLogs,
    getNetworkRequests,
    startConsoleCapture,
    startNetworkCapture,
} from './tracker';
import { ConsoleCaptureOptions, ConsoleLogEntry, NetworkCaptureOptions, NetworkRequestEntry } from './types';

/**
 * Bridge exposed on `window.__sharedom__` by the standalone tracker bundle.
 * It is what `sharedom/testing` drives from Playwright or Puppeteer.
 */
export interface ShareDOMBridge {
    getLogs(): ConsoleLogEntry[];
    getRequests(): NetworkRequestEntry[];
    clear(): void;
    captureConsolePages(options?: ConsoleCaptureOptions): Promise<string[]>;
    captureNetworkPages(options?: NetworkCaptureOptions): Promise<string[]>;
}

declare global {
    interface Window {
        __sharedom__?: ShareDOMBridge;
    }
}

(() => {
    if (typeof window === 'undefined' || window.__sharedom__) return;

    startConsoleCapture();
    startNetworkCapture();

    window.__sharedom__ = {
        getLogs: () => getConsoleLogs(),
        getRequests: () => getNetworkRequests(),
        clear: () => {
            clearConsoleLogs();
            clearNetworkRequests();
        },
        captureConsolePages: (options) => captureConsoleLogsPages(options),
        captureNetworkPages: (options) => captureNetworkRequestsPages(options),
    };
})();
