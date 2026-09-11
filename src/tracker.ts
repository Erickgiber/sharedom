import { ConsoleLogEntry, HttpMethod, LogLevel, NetworkRequestEntry } from './types';

const MAX_ENTRIES = 200;
const MAX_STR_LEN = 300;
const MAX_URL_LEN = 250;
const MAX_NAME_LEN = 80;
const MAX_OBJ_KEYS = 5;
const MAX_ARRAY_ITEMS = 4;
const MAX_TRACKED_URLS = 500;

const MAX_LOGS_PER_SECOND = 25;
const MAX_LOGS_PER_SECOND_HIDDEN = 5;
const MAX_REQUESTS_PER_SECOND = 30;
const MAX_REQUESTS_PER_SECOND_HIDDEN = 10;
const MAX_ERRORS_PER_SECOND = 200;

/** Shown when the browser does not expose the real value (cross-origin timings, replayed entries). */
const UNKNOWN_VALUE = '—';

const STATUS_TEXT: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
};

function truncate(str: string, max: number): string {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}

function nowSecond(): number {
    return Math.floor(Date.now() / 1000);
}

function isDocumentHidden(): boolean {
    return typeof document !== 'undefined' && document.hidden === true;
}

function timeOrigin(): number {
    return typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number'
        ? performance.timeOrigin
        : Date.now();
}

function elapsed(start: number): number {
    return typeof performance !== 'undefined' ? Math.round(performance.now() - start) : 0;
}

/** Non-recursive serializer: never walks circular graphs, DOM trees or large objects. */
function safeStringify(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return truncate(value, MAX_STR_LEN);
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;

    if (value instanceof Error) {
        return truncate(value.stack || `${value.name}: ${value.message}`, MAX_STR_LEN);
    }

    if (isNodeLike(value)) {
        try {
            if (value.nodeType === 1) {
                const el = value as Element;
                const id = el.id ? `#${el.id}` : '';
                const className = typeof el.className === 'string' ? el.className.trim() : '';
                const cls = className ? `.${className.split(/\s+/)[0]}` : '';
                return `<${el.tagName.toLowerCase()}${id}${cls}>`;
            }
            return `[Node: ${value.nodeName}]`;
        } catch {
            return '[Node]';
        }
    }

    if (isEventLike(value)) return `[Event: ${value.type}]`;
    if (typeof window !== 'undefined' && value === window) return '[Window]';
    if (typeof document !== 'undefined' && value === document) return '[Document]';

    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.slice(0, MAX_ARRAY_ITEMS).map(previewValue);
        const extra = value.length > MAX_ARRAY_ITEMS ? `, +${value.length - MAX_ARRAY_ITEMS} more` : '';
        return truncate(`[${items.join(', ')}${extra}]`, MAX_STR_LEN);
    }

    if (typeof value === 'object') {
        try {
            const proto = Object.getPrototypeOf(value);
            const isPlain = proto === null || proto === Object.prototype;
            const constructorName = value.constructor?.name;
            if (!isPlain && constructorName && constructorName !== 'Object') {
                return `[${constructorName}]`;
            }

            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';

            const parts: string[] = [];
            for (const key of keys.slice(0, MAX_OBJ_KEYS)) {
                try {
                    const desc = Object.getOwnPropertyDescriptor(value, key);
                    // Getters are never invoked: they may have side effects or throw.
                    if (desc && 'value' in desc) {
                        parts.push(`${key}: ${previewValue(desc.value)}`);
                    } else if (desc && desc.get) {
                        parts.push(`${key}: (getter)`);
                    }
                } catch {}
            }
            const extra = keys.length > MAX_OBJ_KEYS ? ', …' : '';
            return truncate(`{ ${parts.join(', ')}${extra} }`, MAX_STR_LEN);
        } catch {
            return Object.prototype.toString.call(value);
        }
    }

    return String(value);
}

function previewValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return '{…}';
    if (typeof value === 'string') return `"${truncate(value, 25)}"`;
    return String(value);
}

function isNodeLike(value: unknown): value is Node {
    return typeof value === 'object' && value !== null && typeof (value as Node).nodeType === 'number';
}

function isEventLike(value: unknown): value is Event {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Event).type === 'string' &&
        'target' in value
    );
}

function formatTrackerArgs(args: unknown[]): string {
    if (!args || args.length === 0) return '';

    const first = args[0];
    if (typeof first === 'string' && first.includes('%c')) {
        let text = first.replace(/%c/g, '').trim();
        const nonCssArgs: unknown[] = [];
        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            const looksLikeCss =
                typeof arg === 'string' &&
                (arg.includes(':') ||
                    arg.includes('color') ||
                    arg.includes('font') ||
                    arg.includes('background'));
            if (looksLikeCss) continue;
            nonCssArgs.push(arg);
        }
        if (nonCssArgs.length > 0) {
            text += ' ' + nonCssArgs.map(safeStringify).join(' ');
        }
        return truncate(text, MAX_STR_LEN);
    }

    return truncate(args.map(safeStringify).join(' '), MAX_STR_LEN);
}

const capturedLogs: ConsoleLogEntry[] = [];

let logSecond = 0;
let logsInSecond = 0;
let suppressedLogs = 0;

/**
 * Flood protection for logging loops and animation spam. Errors are never dropped:
 * they are the entries a developer is actually looking for.
 */
function shouldThrottleLog(level: LogLevel): boolean {
    const second = nowSecond();
    if (second !== logSecond) {
        logSecond = second;
        if (suppressedLogs > 0) {
            const suppressed = suppressedLogs;
            suppressedLogs = 0;
            pushLog('warn', `(${suppressed} logs suppressed to preserve browser performance)`);
        }
        logsInSecond = 0;
    }

    logsInSecond++;

    // Errors survive the normal limit because they are what a developer is looking for, but an
    // error loop must not be able to serialize thousands of entries per second either.
    const maxAllowed =
        level === 'error'
            ? MAX_ERRORS_PER_SECOND
            : isDocumentHidden()
              ? MAX_LOGS_PER_SECOND_HIDDEN
              : MAX_LOGS_PER_SECOND;

    if (logsInSecond > maxAllowed) {
        suppressedLogs++;
        return true;
    }
    return false;
}

function pushLog(level: LogLevel, message: string, timestamp: number = Date.now()): void {
    const last = capturedLogs[capturedLogs.length - 1];
    if (last && last.level === level && last.message === message) {
        last.count = (last.count || 1) + 1;
        last.timestamp = timestamp;
        return;
    }

    if (capturedLogs.length >= MAX_ENTRIES) {
        capturedLogs.shift();
    }

    capturedLogs.push({ level, message, timestamp, count: 1 });
}

function recordLog(level: LogLevel, args: unknown[]): void {
    try {
        if (shouldThrottleLog(level)) return;
        const message = formatTrackerArgs(args);
        pushLog(level, message || `(${level})`);
    } catch {}
}

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'table'] as const;
type ConsoleMethod = (typeof CONSOLE_METHODS)[number];
type ConsoleFn = (...args: unknown[]) => void;

const LEVEL_BY_METHOD: Record<ConsoleMethod, LogLevel> = {
    log: 'log',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug',
    trace: 'debug',
    dir: 'log',
    table: 'log',
};

let isConsoleListening = false;
let isRecordingLog = false;
const originalConsole = new Map<ConsoleMethod, ConsoleFn>();

let errorHandler: ((event: ErrorEvent) => void) | null = null;
let rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

type ResourceElement = Element & { src?: string; href?: string };

function resourceUrlFromErrorEvent(event: ErrorEvent): string {
    const target = event.target;
    if (!target || (typeof window !== 'undefined' && target === window)) return '';
    const element = target as ResourceElement;
    if (typeof element.tagName !== 'string') return '';
    return element.src || element.href || '';
}

export function startConsoleCapture(): () => void {
    if (typeof window === 'undefined' || typeof console === 'undefined') {
        return () => {};
    }
    if (isConsoleListening) {
        return stopConsoleCapture;
    }

    isConsoleListening = true;

    const consoleRef = console as unknown as Record<ConsoleMethod, ConsoleFn | undefined>;
    for (const method of CONSOLE_METHODS) {
        const original = consoleRef[method];
        if (typeof original !== 'function') continue;

        originalConsole.set(method, original);
        consoleRef[method] = function (...args: unknown[]) {
            // Re-entrancy guard: a page logging from inside a serializer must not recurse.
            if (!isRecordingLog) {
                isRecordingLog = true;
                try {
                    recordLog(LEVEL_BY_METHOD[method], args);
                } finally {
                    isRecordingLog = false;
                }
            }
            return original.apply(console, args);
        };
    }

    errorHandler = (event: ErrorEvent) => {
        try {
            // Resource failures (img/script/link) surface as error events without an Error object.
            const resourceUrl = resourceUrlFromErrorEvent(event);
            if (resourceUrl) {
                pushLog('error', `Failed to load resource: ${truncate(resourceUrl, MAX_URL_LEN)}`);
                return;
            }

            const error = event.error;
            const message = error
                ? error.stack || `${error.name || 'Error'}: ${error.message || event.message}`
                : event.message || 'Script error';
            if (message) {
                pushLog('error', truncate(message, MAX_STR_LEN));
            }
        } catch {}
    };

    rejectionHandler = (event: PromiseRejectionEvent) => {
        try {
            const reason: unknown = event.reason;
            const message =
                reason instanceof Error
                    ? reason.stack || `${reason.name}: ${reason.message}`
                    : safeStringify(reason);
            if (message) {
                pushLog('error', truncate(`Unhandled Rejection: ${message}`, MAX_STR_LEN));
            }
        } catch {}
    };

    window.addEventListener('error', errorHandler, true);
    window.addEventListener('unhandledrejection', rejectionHandler, true);

    return stopConsoleCapture;
}

export function stopConsoleCapture(): void {
    if (!isConsoleListening) return;

    const consoleRef = console as unknown as Record<ConsoleMethod, ConsoleFn | undefined>;
    originalConsole.forEach((original, method) => {
        consoleRef[method] = original;
    });
    originalConsole.clear();

    if (errorHandler) {
        window.removeEventListener('error', errorHandler, true);
        errorHandler = null;
    }
    if (rejectionHandler) {
        window.removeEventListener('unhandledrejection', rejectionHandler, true);
        rejectionHandler = null;
    }

    isConsoleListening = false;
}

export function getConsoleLogs(): ConsoleLogEntry[] {
    return [...capturedLogs].sort((a, b) => a.timestamp - b.timestamp);
}

export function clearConsoleLogs(): void {
    capturedLogs.length = 0;
    suppressedLogs = 0;
}

const capturedRequests: NetworkRequestEntry[] = [];
/** Absolute URLs already recorded through the fetch/XHR hooks, to avoid duplicating timing entries. */
const hookedUrls = new Set<string>();

let isNetworkListening = false;
let requestSecond = 0;
let requestsInSecond = 0;

let originalFetch: typeof window.fetch | null = null;
let originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;
let resourceObserver: PerformanceObserver | null = null;

function absoluteUrl(rawUrl: string): string {
    try {
        return new URL(rawUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
            .href;
    } catch {
        return rawUrl;
    }
}

/** Strips multi-megabyte Base64 payloads out of data URLs and clamps every string. */
function sanitizeUrl(rawUrl: string): { url: string; name: string } {
    if (!rawUrl) return { url: '', name: '' };

    if (rawUrl.startsWith('data:')) {
        const commaIdx = rawUrl.indexOf(',');
        const meta = commaIdx > -1 ? rawUrl.slice(0, commaIdx) : 'data:...';
        const byteLen = commaIdx > -1 ? rawUrl.length - commaIdx : 0;
        const sizeStr = byteLen > 1024 ? `${Math.round(byteLen / 1024)} KB` : `${byteLen} B`;
        return { url: `${meta};base64,... (${sizeStr})`, name: `${meta} (${sizeStr})` };
    }

    if (rawUrl.startsWith('blob:')) {
        return { url: truncate(rawUrl, MAX_URL_LEN), name: truncate(rawUrl, MAX_NAME_LEN) };
    }

    let name = rawUrl;
    try {
        const parsed = new URL(
            rawUrl,
            typeof window !== 'undefined' ? window.location.href : 'http://localhost'
        );
        name = parsed.pathname + (parsed.search || '') || parsed.host || rawUrl;
    } catch {}

    return { url: truncate(rawUrl, MAX_URL_LEN), name: truncate(name, MAX_NAME_LEN) };
}

function shouldThrottleRequest(): boolean {
    const second = nowSecond();
    if (second !== requestSecond) {
        requestSecond = second;
        requestsInSecond = 0;
    }
    requestsInSecond++;
    const maxAllowed = isDocumentHidden() ? MAX_REQUESTS_PER_SECOND_HIDDEN : MAX_REQUESTS_PER_SECOND;
    return requestsInSecond > maxAllowed;
}

function pushRequest(entry: NetworkRequestEntry): void {
    if (capturedRequests.length >= MAX_ENTRIES) {
        capturedRequests.shift();
    }
    capturedRequests.push(entry);
}

function rememberHookedUrl(url: string): void {
    // Data URLs carry their whole payload in the string and never produce a timing entry to dedupe.
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;

    if (hookedUrls.size >= MAX_TRACKED_URLS) {
        hookedUrls.clear();
    }
    hookedUrls.add(url.slice(0, MAX_URL_LEN));
}

function statusText(status: number, fallback?: string): string {
    if (fallback) return fallback;
    return STATUS_TEXT[status] || `HTTP ${status}`;
}

/**
 * Chrome reports failed requests in the console itself, not through console.error, so no console
 * hook can ever see them. They are rebuilt here from the network layer, DevTools style.
 */
function reportFailedRequest(
    method: HttpMethod,
    rawUrl: string,
    status: number,
    text: string,
    timestamp: number
): void {
    if (status < 400) return;
    const url = truncate(absoluteUrl(rawUrl), MAX_URL_LEN);
    pushLog('error', `${method} ${url} ${status} (${statusText(status, text)})`, timestamp);
}

function reportRequestError(method: HttpMethod, rawUrl: string, reason: unknown, timestamp: number): void {
    const url = truncate(absoluteUrl(rawUrl), MAX_URL_LEN);
    const detail = reason instanceof Error ? reason.message : String(reason || 'network error');
    pushLog('error', `${method} ${url} failed: ${truncate(detail, MAX_STR_LEN)}`, timestamp);
}

interface HookedRequest {
    method: HttpMethod;
    rawUrl: string;
    status: number;
    statusText: string;
    type: string;
    duration: number;
    timestamp: number;
}

function recordHookedRequest(request: HookedRequest): void {
    rememberHookedUrl(absoluteUrl(request.rawUrl));
    if (shouldThrottleRequest()) return;

    const { url, name } = sanitizeUrl(request.rawUrl);
    pushRequest({
        method: request.method,
        url,
        name,
        status: request.status,
        statusText: request.statusText,
        type: request.type,
        duration: request.duration,
        timestamp: request.timestamp,
    });
}

type TimingEntry = PerformanceEntry & {
    initiatorType?: string;
    responseStatus?: number;
    duration: number;
    startTime: number;
};

/**
 * Resource timings cover everything the fetch/XHR hooks cannot see: documents, images, scripts,
 * styles, and — thanks to the buffered flag — requests issued before the tracker was installed.
 */
function entryToRequest(entry: TimingEntry): NetworkRequestEntry | null {
    const rawUrl = entry.name;
    if (!rawUrl || hookedUrls.has(rawUrl.slice(0, MAX_URL_LEN))) return null;

    const isNavigation = entry.entryType === 'navigation';
    const initiatorType = isNavigation ? 'document' : entry.initiatorType || 'resource';
    // Cross-origin responses hide their status unless Timing-Allow-Origin is set.
    const status =
        typeof entry.responseStatus === 'number' && entry.responseStatus > 0
            ? entry.responseStatus
            : UNKNOWN_VALUE;
    // Resource timings never expose the HTTP verb; only same-shape requests can be assumed GET.
    const method: HttpMethod =
        initiatorType === 'fetch' || initiatorType === 'xmlhttprequest' ? UNKNOWN_VALUE : 'GET';
    const { url, name } = sanitizeUrl(rawUrl);

    return {
        method,
        url,
        name,
        status,
        statusText: typeof status === 'number' ? statusText(status) : UNKNOWN_VALUE,
        type: initiatorType,
        duration: Math.round(entry.duration),
        timestamp: Math.round(timeOrigin() + entry.startTime),
    };
}

function recordTimingEntry(entry: TimingEntry): void {
    const request = entryToRequest(entry);
    if (!request) return;
    pushRequest(request);
    if (typeof request.status === 'number') {
        reportFailedRequest(request.method, entry.name, request.status, '', request.timestamp);
    }
}

function startResourceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
        resourceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                recordTimingEntry(entry as TimingEntry);
            }
        });
    } catch {
        resourceObserver = null;
        return;
    }

    for (const type of ['navigation', 'resource'] as const) {
        try {
            resourceObserver.observe({ type, buffered: true });
        } catch {}
    }
}

export function startNetworkCapture(): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }
    if (isNetworkListening) {
        return stopNetworkCapture;
    }

    isNetworkListening = true;

    if (typeof window.fetch === 'function') {
        originalFetch = window.fetch;
        window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
            const start = typeof performance !== 'undefined' ? performance.now() : 0;
            const timestamp = Date.now();
            const [input, init] = args;

            let rawUrl = '';
            let method: HttpMethod = 'GET';
            try {
                if (typeof input === 'string') {
                    rawUrl = input;
                } else if (input instanceof URL) {
                    rawUrl = input.href;
                } else if (input && typeof input === 'object' && 'url' in input) {
                    rawUrl = input.url;
                    if (input.method) method = input.method;
                }
                if (init?.method) method = init.method;
                method = String(method).toUpperCase();
            } catch {}

            return originalFetch!.apply(window, args).then(
                (response) => {
                    recordHookedRequest({
                        method,
                        rawUrl,
                        status: response.status,
                        statusText: response.statusText || (response.ok ? 'OK' : ''),
                        type: 'fetch',
                        duration: elapsed(start),
                        timestamp,
                    });
                    reportFailedRequest(method, rawUrl, response.status, response.statusText, timestamp);
                    return response;
                },
                (error: unknown) => {
                    recordHookedRequest({
                        method,
                        rawUrl,
                        status: 0,
                        statusText: 'Failed',
                        type: 'fetch',
                        duration: elapsed(start),
                        timestamp,
                    });
                    reportRequestError(method, rawUrl, error, timestamp);
                    throw error;
                }
            );
        };
    }

    if (typeof XMLHttpRequest !== 'undefined') {
        originalXhrOpen = XMLHttpRequest.prototype.open;
        originalXhrSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (
            this: TrackedXhr,
            method: string,
            url: string | URL,
            ...rest: unknown[]
        ) {
            try {
                this.__sharedomMeta = {
                    method: String(method || 'GET').toUpperCase(),
                    rawUrl: typeof url === 'string' ? url : url.href,
                };
            } catch {}
            return (originalXhrOpen as XhrOpen).apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function (
            this: TrackedXhr,
            ...args: Parameters<XMLHttpRequest['send']>
        ) {
            const meta = this.__sharedomMeta;
            if (meta) {
                const start = typeof performance !== 'undefined' ? performance.now() : 0;
                const timestamp = Date.now();
                this.addEventListener(
                    'loadend',
                    () => {
                        try {
                            const failed = this.status === 0;
                            recordHookedRequest({
                                method: meta.method,
                                rawUrl: meta.rawUrl,
                                status: this.status,
                                statusText: this.statusText || (failed ? 'Failed' : ''),
                                type: 'xhr',
                                duration: elapsed(start),
                                timestamp,
                            });
                            if (failed) {
                                reportRequestError(meta.method, meta.rawUrl, 'network error', timestamp);
                            } else {
                                reportFailedRequest(
                                    meta.method,
                                    meta.rawUrl,
                                    this.status,
                                    this.statusText,
                                    timestamp
                                );
                            }
                        } catch {}
                        delete this.__sharedomMeta;
                    },
                    { once: true }
                );
            }
            return originalXhrSend!.apply(this, args);
        };
    }

    startResourceObserver();

    return stopNetworkCapture;
}

type XhrOpen = (method: string, url: string | URL, ...rest: unknown[]) => void;
type TrackedXhr = XMLHttpRequest & { __sharedomMeta?: { method: HttpMethod; rawUrl: string } };

export function stopNetworkCapture(): void {
    if (!isNetworkListening) return;

    if (originalFetch && typeof window !== 'undefined') {
        window.fetch = originalFetch;
        originalFetch = null;
    }
    if (originalXhrOpen && typeof XMLHttpRequest !== 'undefined') {
        XMLHttpRequest.prototype.open = originalXhrOpen;
        originalXhrOpen = null;
    }
    if (originalXhrSend && typeof XMLHttpRequest !== 'undefined') {
        XMLHttpRequest.prototype.send = originalXhrSend;
        originalXhrSend = null;
    }
    if (resourceObserver) {
        try {
            resourceObserver.disconnect();
        } catch {}
        resourceObserver = null;
    }

    isNetworkListening = false;
}

export function getNetworkRequests(): NetworkRequestEntry[] {
    const requests = [...capturedRequests];

    // Without an active capture there are no hooks running: rebuild from the timing buffer.
    if (!isNetworkListening && requests.length === 0 && typeof performance !== 'undefined') {
        try {
            const entries = [
                ...performance.getEntriesByType('navigation'),
                ...performance.getEntriesByType('resource'),
            ] as TimingEntry[];
            for (const entry of entries.slice(-MAX_ENTRIES)) {
                const request = entryToRequest(entry);
                if (request) requests.push(request);
            }
        } catch {}
    }

    return requests.sort((a, b) => a.timestamp - b.timestamp);
}

export function clearNetworkRequests(): void {
    capturedRequests.length = 0;
    hookedUrls.clear();
}
