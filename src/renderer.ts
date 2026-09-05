import { ConsoleLogEntry, NetworkRequestEntry, Language } from './types';
import { getTranslations } from './i18n';

function formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
}

function formatDateHeader(timestamp: number): string {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${h}:${m}:${s}`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const BASE_STYLES = `
.sharedom-card {
    box-sizing: border-box;
    width: 880px;
    background: linear-gradient(180deg, #0f172a 0%, #090d16 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
}
.sharedom-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.sharedom-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}
.sharedom-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(124, 58, 237, 0.3));
    border: 1px solid rgba(167, 139, 250, 0.3);
}
.sharedom-title {
    font-size: 18px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.02em;
    margin: 0;
    line-height: 1.2;
}
.sharedom-subtitle {
    font-size: 12px;
    color: #94a3b8;
    margin: 3px 0 0 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.sharedom-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}
.sharedom-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
}
.sharedom-badge-neutral {
    background: rgba(148, 163, 184, 0.12);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.2);
}
.sharedom-badge-success {
    background: rgba(16, 185, 129, 0.12);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.25);
}
.sharedom-badge-warning {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.25);
}
.sharedom-badge-danger {
    background: rgba(244, 63, 94, 0.12);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.25);
}
.sharedom-badge-info {
    background: rgba(56, 189, 248, 0.12);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
}
.sharedom-badge-brand {
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.25), rgba(124, 58, 237, 0.35));
    color: #c4b5fd;
    border: 1px solid rgba(167, 139, 250, 0.4);
    font-weight: 700;
}
.sharedom-table-wrap {
    width: 100%;
    overflow-x: hidden;
}
.sharedom-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 4px;
    font-size: 12px;
}
.sharedom-table th {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    padding: 8px 12px;
    text-align: left;
    background: rgba(255, 255, 255, 0.03);
}
.sharedom-table th:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
}
.sharedom-table th:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
}
.sharedom-table td {
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.02);
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    vertical-align: middle;
}
.sharedom-table tr:hover td {
    background: rgba(255, 255, 255, 0.04);
}
.sharedom-table td:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-left: 1px solid rgba(255, 255, 255, 0.03);
    color: #64748b;
    font-family: ui-monospace, monospace;
    font-size: 11px;
    text-align: center;
    width: 32px;
}
.sharedom-table td:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border-right: 1px solid rgba(255, 255, 255, 0.03);
}
.sharedom-pill {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-align: center;
    line-height: 1.2;
}
.sharedom-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.sharedom-msg {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #f1f5f9;
    word-break: break-word;
    white-space: pre-wrap;
    line-height: 1.45;
}
.sharedom-count-bubble {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 6px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 10px;
    font-weight: 700;
}
.sharedom-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background: rgba(255, 255, 255, 0.015);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #94a3b8;
    text-align: center;
}
.sharedom-empty-icon {
    margin-bottom: 12px;
    opacity: 0.7;
}
`;

export interface TableRenderOptions {
    language?: Language;
    title?: string;
    maxEntries?: number;
    pageIndex?: number;
    totalPages?: number;
    startIndex?: number;
    totalItems?: number;
}

export function chunkItems<T>(items: T[], size: number): T[][] {
    if (!items || items.length === 0) return [[]];
    if (size <= 0 || items.length <= size) return [items];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export function createConsoleLogsElement(
    logs: ConsoleLogEntry[] = [],
    options?: TableRenderOptions
): HTMLElement {
    const t = getTranslations(options?.language);
    const max = options?.maxEntries || 100;
    const sliced = logs.slice(-max);

    let errorCount = 0;
    let warnCount = 0;
    let infoCount = 0;

    sliced.forEach((l) => {
        if (l.level === 'error') errorCount += (l.count || 1);
        else if (l.level === 'warn') warnCount += (l.count || 1);
        else infoCount += (l.count || 1);
    });

    const totalLogs = errorCount + warnCount + infoCount;
    const now = Date.now();

    const container = document.createElement('div');
    container.className = 'sharedom-card';

    const styleEl = document.createElement('style');
    styleEl.textContent = BASE_STYLES;
    container.appendChild(styleEl);

    const header = document.createElement('div');
    header.className = 'sharedom-header';
    header.innerHTML = `
        <div class="sharedom-header-left">
            <div class="sharedom-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
            </div>
            <div>
                <h3 class="sharedom-title">${escapeHtml(options?.title || t.consoleTitle)}</h3>
                <div class="sharedom-subtitle">${formatDateHeader(now)}</div>
            </div>
        </div>
        <div class="sharedom-header-right">
            ${options?.totalPages && options.totalPages > 1 ? `<span class="sharedom-badge" style="background: rgba(167, 139, 250, 0.15); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.3); font-weight: 600;">${t.page} ${options.pageIndex || 1} / ${options.totalPages}</span>` : ''}
            <span class="sharedom-badge sharedom-badge-neutral">${options?.totalItems || totalLogs} ${t.totalLogs}</span>
            ${errorCount > 0 ? `<span class="sharedom-badge sharedom-badge-danger">${errorCount} ${t.errors}</span>` : ''}
            ${warnCount > 0 ? `<span class="sharedom-badge sharedom-badge-warning">${warnCount} ${t.warnings}</span>` : ''}
            <span class="sharedom-badge sharedom-badge-brand">${t.watermark}</span>
        </div>
    `;
    container.appendChild(header);

    if (sliced.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sharedom-empty-state';
        empty.innerHTML = `
            <div class="sharedom-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <div style="font-size: 14px; font-weight: 500;">${t.emptyConsole}</div>
        `;
        container.appendChild(empty);
        return container;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'sharedom-table-wrap';

    let rowsHtml = '';
    sliced.forEach((log, index) => {
        let pillClass = 'sharedom-badge-neutral';
        const levelUpper = log.level.toUpperCase();
        if (log.level === 'error') pillClass = 'sharedom-badge-danger';
        else if (log.level === 'warn') pillClass = 'sharedom-badge-warning';
        else if (log.level === 'info') pillClass = 'sharedom-badge-info';

        const countBubble = (log.count && log.count > 1)
            ? `<span class="sharedom-count-bubble">×${log.count}</span>`
            : '';

        const rowNum = (options?.startIndex || 0) + index + 1;
        rowsHtml += `
            <tr>
                <td>${rowNum}</td>
                <td style="width: 76px;">
                    <span class="sharedom-pill ${pillClass}">${levelUpper}</span>
                </td>
                <td>
                    <div class="sharedom-msg">${escapeHtml(log.message)}${countBubble}</div>
                </td>
                <td class="sharedom-mono" style="width: 90px; text-align: right; color: #64748b; font-size: 11px;">
                    ${formatTime(log.timestamp)}
                </td>
            </tr>
        `;
    });

    tableWrap.innerHTML = `
        <table class="sharedom-table">
            <thead>
                <tr>
                    <th style="width: 32px; text-align: center;">${t.colIndex}</th>
                    <th style="width: 76px;">${t.colLevel}</th>
                    <th>${t.colMessage}</th>
                    <th style="width: 90px; text-align: right;">${t.colTime}</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;

    container.appendChild(tableWrap);
    return container;
}

export function createNetworkRequestsElement(
    requests: NetworkRequestEntry[] = [],
    options?: TableRenderOptions
): HTMLElement {
    const t = getTranslations(options?.language);
    const max = options?.maxEntries || 100;
    const sliced = requests.slice(-max);

    let successCount = 0;
    let failedCount = 0;

    sliced.forEach((r) => {
        const numStatus = Number(r.status);
        if (numStatus >= 200 && numStatus < 400) {
            successCount++;
        } else {
            failedCount++;
        }
    });

    const totalRequests = sliced.length;
    const now = Date.now();

    const container = document.createElement('div');
    container.className = 'sharedom-card';

    const styleEl = document.createElement('style');
    styleEl.textContent = BASE_STYLES;
    container.appendChild(styleEl);

    const header = document.createElement('div');
    header.className = 'sharedom-header';
    header.innerHTML = `
        <div class="sharedom-header-left">
            <div class="sharedom-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
            </div>
            <div>
                <h3 class="sharedom-title">${escapeHtml(options?.title || t.networkTitle)}</h3>
                <div class="sharedom-subtitle">${formatDateHeader(now)}</div>
            </div>
        </div>
        <div class="sharedom-header-right">
            ${options?.totalPages && options.totalPages > 1 ? `<span class="sharedom-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 600;">${t.page} ${options.pageIndex || 1} / ${options.totalPages}</span>` : ''}
            <span class="sharedom-badge sharedom-badge-neutral">${options?.totalItems || totalRequests} ${t.totalRequests}</span>
            <span class="sharedom-badge sharedom-badge-success">${successCount} ${t.success}</span>
            ${failedCount > 0 ? `<span class="sharedom-badge sharedom-badge-danger">${failedCount} ${t.failed}</span>` : ''}
            <span class="sharedom-badge sharedom-badge-brand">${t.watermark}</span>
        </div>
    `;
    container.appendChild(header);

    if (sliced.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sharedom-empty-state';
        empty.innerHTML = `
            <div class="sharedom-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
            </div>
            <div style="font-size: 14px; font-weight: 500;">${t.emptyNetwork}</div>
        `;
        container.appendChild(empty);
        return container;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'sharedom-table-wrap';

    let rowsHtml = '';
    sliced.forEach((req, index) => {
        let methodClass = 'sharedom-badge-neutral';
        const m = (req.method || 'GET').toUpperCase();
        if (m === 'GET') methodClass = 'sharedom-badge-info';
        else if (m === 'POST') methodClass = 'sharedom-badge-success';
        else if (m === 'PUT') methodClass = 'sharedom-badge-warning';
        else if (m === 'DELETE') methodClass = 'sharedom-badge-danger';
        else if (m === 'PATCH') methodClass = 'sharedom-badge-brand';

        let statusClass = 'sharedom-badge-neutral';
        const numStatus = Number(req.status);
        if (numStatus >= 200 && numStatus < 300) statusClass = 'sharedom-badge-success';
        else if (numStatus >= 300 && numStatus < 400) statusClass = 'sharedom-badge-info';
        else if (numStatus >= 400 && numStatus < 500) statusClass = 'sharedom-badge-warning';
        else if (numStatus >= 500 || numStatus === 0) statusClass = 'sharedom-badge-danger';

        const statusDisplay = numStatus > 0
            ? `${numStatus} ${req.statusText || ''}`.trim()
            : (req.statusText || 'Failed');

        const durationStr = req.duration !== undefined ? `${req.duration} ms` : '-';

        const rowNum = (options?.startIndex || 0) + index + 1;
        rowsHtml += `
            <tr>
                <td>${rowNum}</td>
                <td style="width: 72px;">
                    <span class="sharedom-pill ${methodClass}">${escapeHtml(m)}</span>
                </td>
                <td>
                    <div style="font-weight: 600; color: #f1f5f9; font-size: 12.5px; margin-bottom: 2px;">
                        ${escapeHtml(req.name)}
                    </div>
                    <div class="sharedom-mono" style="color: #64748b; font-size: 11px; word-break: break-all; max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(req.url)}
                    </div>
                </td>
                <td style="width: 100px;">
                    <span class="sharedom-pill ${statusClass}">${escapeHtml(statusDisplay)}</span>
                </td>
                <td style="width: 60px; font-size: 11px; color: #94a3b8; text-transform: uppercase;">
                    ${escapeHtml(req.type || 'fetch')}
                </td>
                <td class="sharedom-mono" style="width: 70px; text-align: right; color: #cbd5e1; font-size: 11px;">
                    ${durationStr}
                </td>
                <td class="sharedom-mono" style="width: 90px; text-align: right; color: #64748b; font-size: 11px;">
                    ${formatTime(req.timestamp)}
                </td>
            </tr>
        `;
    });

    tableWrap.innerHTML = `
        <table class="sharedom-table">
            <thead>
                <tr>
                    <th style="width: 32px; text-align: center;">${t.colIndex}</th>
                    <th style="width: 72px;">${t.colMethod}</th>
                    <th>${t.colNameUrl}</th>
                    <th style="width: 100px;">${t.colStatus}</th>
                    <th style="width: 60px;">${t.colType}</th>
                    <th style="width: 70px; text-align: right;">${t.colDuration}</th>
                    <th style="width: 90px; text-align: right;">${t.colTime}</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;

    container.appendChild(tableWrap);
    return container;
}
