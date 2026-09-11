import { TRACKER_SOURCE } from './tracker-source.generated';
import type {
    ConsoleCaptureOptions,
    ConsoleLogEntry,
    NetworkCaptureOptions,
    NetworkRequestEntry,
} from './types';

export type { ConsoleLogEntry, NetworkRequestEntry } from './types';

/**
 * Structural type satisfied by both a Playwright `Page`/`BrowserContext` and a Puppeteer `Page`.
 * Only the three members used by this module are required.
 */
export interface AutomationPage {
    evaluate(expression: string): Promise<unknown>;
    /** Playwright. */
    addInitScript?(script: { content: string }): Promise<void>;
    /** Puppeteer. */
    evaluateOnNewDocument?(script: string): Promise<unknown>;
}

export interface ShareDOMTestSession {
    /** Every console entry recorded since the document started loading. */
    getLogs(): Promise<ConsoleLogEntry[]>;
    /** Console entries with level `error`, including failures Chrome only prints itself. */
    getErrors(): Promise<ConsoleLogEntry[]>;
    /** Every request seen through fetch, XHR and resource timings. */
    getRequests(): Promise<NetworkRequestEntry[]>;
    /** Requests that failed to connect (status 0) or answered with status >= 400. */
    getFailedRequests(): Promise<NetworkRequestEntry[]>;
    /** Drops everything recorded so far, e.g. between test steps. */
    clear(): Promise<void>;
    /** Console table rendered as PNG data URLs (one per page of entries). */
    captureConsoleImages(options?: ConsoleCaptureOptions): Promise<string[]>;
    /** Network table rendered as PNG data URLs (one per page of entries). */
    captureNetworkImages(options?: NetworkCaptureOptions): Promise<string[]>;
    /** Human and agent readable summary of everything recorded. */
    report(): Promise<string>;
    /** Throws with the full report when any console error was recorded. */
    assertNoErrors(): Promise<void>;
    /** Throws with the full report when any request failed. */
    assertNoFailedRequests(): Promise<void>;
}

const BRIDGE = 'window.__sharedom__';
const MISSING_BRIDGE =
    '[sharedom/testing]: tracker is not installed in this document. ' +
    'Call attachShareDOM(page) before navigating.';

function bridgeCall(method: string, argument?: unknown): string {
    const args = argument === undefined ? '' : JSON.stringify(argument);
    return `(() => { if (!${BRIDGE}) throw new Error(${JSON.stringify(MISSING_BRIDGE)}); return ${BRIDGE}.${method}(${args}); })()`;
}

async function readJson<T>(page: AutomationPage, expression: string, fallback: T): Promise<T> {
    const raw = await page.evaluate(`JSON.stringify(${expression})`);
    if (typeof raw !== 'string' || raw.length === 0) return fallback;
    return JSON.parse(raw) as T;
}

function isFailedRequest(request: NetworkRequestEntry): boolean {
    const status = Number(request.status);
    // A non numeric status means the browser did not expose it (cross-origin timing), not a failure.
    if (!Number.isFinite(status)) return false;
    return status === 0 || status >= 400;
}

function formatTime(timestamp: number): string {
    try {
        return new Date(timestamp).toISOString().slice(11, 19);
    } catch {
        return '--:--:--';
    }
}

/** Compact text summary designed to be pasted into an issue or handed to an agent. */
export function formatReport(logs: ConsoleLogEntry[], requests: NetworkRequestEntry[]): string {
    const errors = logs.filter((log) => log.level === 'error');
    const warnings = logs.filter((log) => log.level === 'warn');
    const failed = requests.filter(isFailedRequest);

    const lines = [
        `ShareDOM capture — ${logs.length} logs (${errors.length} errors, ${warnings.length} warnings), ` +
            `${requests.length} requests (${failed.length} failed)`,
    ];

    if (errors.length > 0) {
        lines.push('', 'Console errors:');
        for (const error of errors) {
            const repeated = error.count && error.count > 1 ? ` (x${error.count})` : '';
            lines.push(`  [${formatTime(error.timestamp)}] ${error.message}${repeated}`);
        }
    }

    if (failed.length > 0) {
        lines.push('', 'Failed requests:');
        for (const request of failed) {
            const duration = request.duration !== undefined ? ` (${request.duration} ms)` : '';
            lines.push(
                `  ${request.method} ${request.url} → ${request.status} ${request.statusText || ''}${duration}`.trim()
            );
        }
    }

    return lines.join('\n');
}

/** Decodes a `data:` URL returned by the capture helpers into raw bytes ready to be written. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) {
        throw new Error('[sharedom/testing]: not a data URL.');
    }
    const binary = atob(dataUrl.slice(commaIdx + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Installs the ShareDOM tracker in `page` at document start and returns a session to read back
 * console and network activity, render it, or assert on it.
 *
 * ```ts
 * const sharedom = await attachShareDOM(page);
 * await page.goto('https://example.com');
 * await sharedom.assertNoErrors();
 * ```
 */
export async function attachShareDOM(page: AutomationPage): Promise<ShareDOMTestSession> {
    if (typeof page.addInitScript === 'function') {
        await page.addInitScript({ content: TRACKER_SOURCE });
    } else if (typeof page.evaluateOnNewDocument === 'function') {
        await page.evaluateOnNewDocument(TRACKER_SOURCE);
    } else {
        throw new Error(
            '[sharedom/testing]: page must expose addInitScript() (Playwright) or ' +
                'evaluateOnNewDocument() (Puppeteer).'
        );
    }

    try {
        // Covers a document that is already open: resource timings are replayed on install.
        await page.evaluate(TRACKER_SOURCE);
    } catch {
        // No usable execution context yet (blank or navigating page); the init script covers it.
    }

    const getLogs = () => readJson<ConsoleLogEntry[]>(page, `(${BRIDGE} ? ${BRIDGE}.getLogs() : [])`, []);
    const getRequests = () =>
        readJson<NetworkRequestEntry[]>(page, `(${BRIDGE} ? ${BRIDGE}.getRequests() : [])`, []);

    const report = async (): Promise<string> => {
        const [logs, requests] = await Promise.all([getLogs(), getRequests()]);
        return formatReport(logs, requests);
    };

    return {
        getLogs,
        getRequests,
        getErrors: async () => (await getLogs()).filter((log) => log.level === 'error'),
        getFailedRequests: async () => (await getRequests()).filter(isFailedRequest),
        clear: async () => {
            await page.evaluate(bridgeCall('clear'));
        },
        captureConsoleImages: async (options = {}) =>
            (await page.evaluate(bridgeCall('captureConsolePages', options))) as string[],
        captureNetworkImages: async (options = {}) =>
            (await page.evaluate(bridgeCall('captureNetworkPages', options))) as string[],
        report,
        assertNoErrors: async () => {
            const errors = await getLogs().then((logs) => logs.filter((log) => log.level === 'error'));
            if (errors.length > 0) {
                throw new Error(`[sharedom/testing]: ${errors.length} console error(s)\n${await report()}`);
            }
        },
        assertNoFailedRequests: async () => {
            const failed = await getRequests().then((requests) => requests.filter(isFailedRequest));
            if (failed.length > 0) {
                throw new Error(`[sharedom/testing]: ${failed.length} failed request(s)\n${await report()}`);
            }
        },
    };
}
