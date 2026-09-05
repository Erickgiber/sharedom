import { ConsoleLogEntry, LogLevel, NetworkRequestEntry } from './types';

const MAX_ENTRIES = 200;

let isConsoleListening = false;
const capturedLogs: ConsoleLogEntry[] = [];

let originalLog: typeof console.log | null = null;
let originalInfo: typeof console.info | null = null;
let originalWarn: typeof console.warn | null = null;
let originalError: typeof console.error | null = null;
let originalDebug: typeof console.debug | null = null;

const MAX_STR_LEN = 300;

function truncate(str: string, max: number): string {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}

function safeStringify(arg: unknown): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return truncate(arg, MAX_STR_LEN);
    if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'symbol' || typeof arg === 'bigint') {
        return String(arg);
    }
    if (typeof arg === 'function') return `ƒ ${arg.name || 'anonymous'}()`;
    if (arg instanceof Error) {
        return truncate(`${arg.name}: ${arg.message}`, MAX_STR_LEN);
    }
    if (arg && typeof (arg as any).nodeType === 'number') {
        const el = arg as Element;
        return `<${el.tagName ? el.tagName.toLowerCase() : 'node'}${el.id ? '#' + el.id : ''}>`;
    }
    if (arg && typeof (arg as any).type === 'string' && 'target' in (arg as any)) {
        return `[Event: ${(arg as any).type}]`;
    }
    if (typeof arg === 'object') {
        try {
            const keys = Object.keys(arg as object);
            if (keys.length === 0) return '{}';
            const previewKeys = keys.slice(0, 5);
            const parts: string[] = [];
            for (const k of previewKeys) {
                try {
                    const desc = Object.getOwnPropertyDescriptor(arg, k);
                    if (desc && 'value' in desc) {
                        const val = desc.value;
                        let valStr = '';
                        if (val === null) valStr = 'null';
                        else if (val === undefined) valStr = 'undefined';
                        else if (typeof val === 'object') valStr = '{…}';
                        else if (typeof val === 'string') valStr = `"${truncate(val, 25)}"`;
                        else valStr = String(val);
                        parts.push(`${k}: ${valStr}`);
                    }
                } catch {}
            }
            const extra = keys.length > 5 ? ', …' : '';
            return truncate(`{ ${parts.join(', ')}${extra} }`, MAX_STR_LEN);
        } catch {
            return Object.prototype.toString.call(arg);
        }
    }
    return String(arg);
}

function formatTrackerArgs(args: unknown[]): string {
    if (args.length === 0) return '';
    const first = args[0];
    if (typeof first === 'string' && first.includes('%c')) {
        let text = first.replace(/%c/g, '').trim();
        const nonCssArgs: unknown[] = [];
        for (let i = 1; i < args.length; i++) {
            const a = args[i];
            if (typeof a === 'string' && (a.includes(':') || a.includes('color') || a.includes('font') || a.includes('background'))) {
                continue;
            }
            nonCssArgs.push(a);
        }
        if (nonCssArgs.length > 0) {
            text += ' ' + nonCssArgs.map(safeStringify).join(' ');
        }
        return text;
    }
    return args.map(safeStringify).join(' ');
}

function pushLog(level: LogLevel, args: unknown[]): void {
    const message = formatTrackerArgs(args);
    const last = capturedLogs[capturedLogs.length - 1];

    if (last && last.level === level && last.message === message) {
        last.count = (last.count || 1) + 1;
        last.timestamp = Date.now();
        return;
    }

    if (capturedLogs.length >= MAX_ENTRIES) {
        capturedLogs.shift();
    }

    capturedLogs.push({
        level,
        message,
        timestamp: Date.now(),
        count: 1,
    });
}

let originalErrorHandler: ((event: ErrorEvent) => void) | null = null;
let originalRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

export function startConsoleCapture(): () => void {
    if (typeof window === 'undefined' || typeof console === 'undefined') {
        return () => {};
    }

    if (isConsoleListening) {
        return stopConsoleCapture;
    }

    isConsoleListening = true;

    originalLog = console.log;
    originalInfo = console.info;
    originalWarn = console.warn;
    originalError = console.error;
    originalDebug = console.debug;

    console.log = (...args: unknown[]) => {
        pushLog('log', args);
        originalLog?.apply(console, args);
    };

    console.info = (...args: unknown[]) => {
        pushLog('info', args);
        originalInfo?.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
        pushLog('warn', args);
        originalWarn?.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
        pushLog('error', args);
        originalError?.apply(console, args);
    };

    console.debug = (...args: unknown[]) => {
        pushLog('debug', args);
        originalDebug?.apply(console, args);
    };

    originalErrorHandler = (event: ErrorEvent) => {
        try {
            const err = event.error;
            const message = err
                ? (err.stack || `${err.name || 'Error'}: ${err.message || event.message}`)
                : (event.message || 'Script error');
            if (message) {
                pushLog('error', [message]);
            }
        } catch {}
    };

    originalRejectionHandler = (event: PromiseRejectionEvent) => {
        try {
            const reason = event.reason;
            const message = reason instanceof Error
                ? (reason.stack || `${reason.name}: ${reason.message}`)
                : (typeof reason === 'object' && reason !== null ? safeStringify(reason) : String(reason));
            if (message) {
                pushLog('error', [`Unhandled Rejection: ${message}`]);
            }
        } catch {}
    };

    window.addEventListener('error', originalErrorHandler, true);
    window.addEventListener('unhandledrejection', originalRejectionHandler, true);

    return stopConsoleCapture;
}

export function stopConsoleCapture(): void {
    if (!isConsoleListening) return;

    if (originalLog) console.log = originalLog;
    if (originalInfo) console.info = originalInfo;
    if (originalWarn) console.warn = originalWarn;
    if (originalError) console.error = originalError;
    if (originalDebug) console.debug = originalDebug;

    originalLog = null;
    originalInfo = null;
    originalWarn = null;
    originalError = null;
    originalDebug = null;

    if (originalErrorHandler) {
        window.removeEventListener('error', originalErrorHandler, true);
        originalErrorHandler = null;
    }
    if (originalRejectionHandler) {
        window.removeEventListener('unhandledrejection', originalRejectionHandler, true);
        originalRejectionHandler = null;
    }

    isConsoleListening = false;
}

export function getConsoleLogs(): ConsoleLogEntry[] {
    return [...capturedLogs];
}

export function clearConsoleLogs(): void {
    capturedLogs.length = 0;
}

let isNetworkListening = false;
const capturedRequests: NetworkRequestEntry[] = [];

let originalFetch: typeof window.fetch | null = null;
let originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;

function extractEndpointName(urlStr: string): string {
    if (!urlStr) return '';
    if (urlStr.startsWith('data:')) {
        const commaIdx = urlStr.indexOf(',');
        const meta = commaIdx > -1 ? urlStr.slice(0, commaIdx) : 'data:...';
        return `${meta} (data URL)`;
    }
    if (urlStr.startsWith('blob:')) {
        return truncate(urlStr, 80);
    }
    try {
        const parsed = new URL(urlStr, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
        const path = parsed.pathname;
        if (!path || path === '/') {
            return truncate(parsed.host || urlStr, 80);
        }
        return truncate(path + (parsed.search ? parsed.search : ''), 80);
    } catch {
        return truncate(urlStr, 80);
    }
}

function pushRequest(entry: NetworkRequestEntry): void {
    if (capturedRequests.length >= MAX_ENTRIES) {
        capturedRequests.shift();
    }
    let sanitizedUrl = entry.url;
    if (sanitizedUrl && sanitizedUrl.startsWith('data:')) {
        const commaIdx = sanitizedUrl.indexOf(',');
        const meta = commaIdx > -1 ? sanitizedUrl.slice(0, commaIdx) : 'data:...';
        const byteLen = commaIdx > -1 ? sanitizedUrl.length - commaIdx : 0;
        const sizeStr = byteLen > 1024 ? `${Math.round(byteLen / 1024)} KB` : `${byteLen} B`;
        sanitizedUrl = `${meta};base64,... (${sizeStr})`;
    } else if (sanitizedUrl) {
        sanitizedUrl = truncate(sanitizedUrl, 250);
    }
    capturedRequests.push({
        ...entry,
        url: sanitizedUrl,
        name: truncate(entry.name, 80),
    });
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
        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const start = performance.now();
            const input = args[0];
            const init = args[1];

            let url = '';
            let method = (init?.method || 'GET').toUpperCase();

            if (typeof input === 'string') {
                url = input;
            } else if (input instanceof URL) {
                url = input.href;
            } else if (input && typeof input === 'object' && 'url' in input) {
                url = (input as Request).url;
                if (!init?.method && (input as Request).method) {
                    method = (input as Request).method.toUpperCase();
                }
            }

            const timestamp = Date.now();
            const name = extractEndpointName(url);

            try {
                const response = await originalFetch!.apply(window, args);
                const duration = Math.round(performance.now() - start);

                pushRequest({
                    method,
                    url,
                    name,
                    status: response.status,
                    statusText: response.statusText || (response.ok ? 'OK' : ''),
                    type: 'fetch',
                    duration,
                    timestamp,
                });

                return response;
            } catch (err) {
                const duration = Math.round(performance.now() - start);
                pushRequest({
                    method,
                    url,
                    name,
                    status: 0,
                    statusText: 'Failed',
                    type: 'fetch',
                    duration,
                    timestamp,
                });
                throw err;
            }
        };
    }

    if (typeof XMLHttpRequest !== 'undefined') {
        originalXhrOpen = XMLHttpRequest.prototype.open;
        originalXhrSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (
            method: string,
            url: string | URL,
            ...rest: [boolean?, string?, string?]
        ) {
            (this as any).__sharedom_meta = {
                method: String(method).toUpperCase(),
                url: typeof url === 'string' ? url : url.href,
            };
            return originalXhrOpen!.apply(this, [method, url, ...rest] as any);
        };

        XMLHttpRequest.prototype.send = function (...args: Parameters<typeof XMLHttpRequest.prototype.send>) {
            const meta = (this as any).__sharedom_meta;
            if (meta) {
                const start = performance.now();
                const timestamp = Date.now();

                this.addEventListener('loadend', () => {
                    const duration = Math.round(performance.now() - start);
                    const name = extractEndpointName(meta.url);
                    pushRequest({
                        method: meta.method || 'GET',
                        url: meta.url,
                        name,
                        status: this.status,
                        statusText: this.statusText,
                        type: 'xhr',
                        duration,
                        timestamp,
                    });
                });
            }

            return originalXhrSend!.apply(this, args);
        };
    }

    return stopNetworkCapture;
}

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

    isNetworkListening = false;
}

export function getNetworkRequests(): NetworkRequestEntry[] {
    if (capturedRequests.length > 0) {
        return [...capturedRequests];
    }

    if (typeof window !== 'undefined' && typeof window.performance?.getEntriesByType === 'function') {
        try {
            const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            if (resources.length > 0) {
                return resources.slice(-MAX_ENTRIES).map((res) => {
                    const statusVal = (res as any).responseStatus;
                    return {
                        method: 'GET',
                        url: res.name,
                        name: extractEndpointName(res.name),
                        status: statusVal !== undefined && statusVal !== 0 ? statusVal : 200,
                        statusText: statusVal ? `HTTP ${statusVal}` : 'OK',
                        type: res.initiatorType || 'resource',
                        duration: Math.round(res.duration),
                        timestamp: Math.round(performance.timeOrigin + res.startTime),
                    };
                });
            }
        } catch {}
    }

    return [];
}

export function clearNetworkRequests(): void {
    capturedRequests.length = 0;
}
