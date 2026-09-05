import { ZipFileInput } from './types';

// Precomputed CRC32 lookup table (polynomial 0xEDB88320)
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c;
}

/**
 * Computes standard 32-bit CRC checksum for byte array.
 */
export function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
        crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Converts a JavaScript Date to MS-DOS date and time format used in ZIP headers.
 */
function toDosDateTime(date: Date = new Date()): { time: number; date: number } {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);
    const dosTime = (hours << 11) | (minutes << 5) | seconds;

    const year = Math.max(1980, date.getFullYear()) - 1980;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dosDate = (year << 9) | (month << 5) | day;

    return { time: dosTime, date: dosDate };
}

/**
 * Converts a Base64 data URL, ArrayBuffer, or Uint8Array into a standard Uint8Array.
 */
export function normalizeZipData(data: Uint8Array | ArrayBuffer | string): Uint8Array {
    if (data instanceof Uint8Array) {
        return data;
    }
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    if (typeof data === 'string') {
        let base64 = data;
        const commaIndex = data.indexOf(',');
        if (commaIndex !== -1 && data.startsWith('data:')) {
            base64 = data.slice(commaIndex + 1);
        }
        if (typeof atob === 'function') {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        } else {
            const maybeBuffer = (globalThis as unknown as { Buffer?: { from(s: string, e: string): Uint8Array } }).Buffer;
            if (maybeBuffer) {
                return new Uint8Array(maybeBuffer.from(base64, 'base64'));
            }
        }
    }
    return new Uint8Array(0);
}

const textEncoder = new TextEncoder();

/**
 * Builds a valid PKZIP 2.0 archive (.zip) from a list of files with zero external dependencies.
 * Uses Store compression (method 0), perfectly optimized for PNG, JPEG, and WebP images.
 */
export function buildZip(files: ZipFileInput[]): Uint8Array {
    const { time: dosTime, date: dosDate } = toDosDateTime(new Date());

    interface ProcessedEntry {
        nameBytes: Uint8Array;
        dataBytes: Uint8Array;
        crc: number;
        localHeaderOffset: number;
    }

    const processed: ProcessedEntry[] = [];
    let totalLocalHeadersSize = 0;

    for (const file of files) {
        const nameBytes = textEncoder.encode(file.name);
        const dataBytes = normalizeZipData(file.data);
        const crc = crc32(dataBytes);

        // 30 bytes fixed local header + nameBytes length + file data length
        const localHeaderSize = 30 + nameBytes.length + dataBytes.length;
        processed.push({
            nameBytes,
            dataBytes,
            crc,
            localHeaderOffset: totalLocalHeadersSize,
        });
        totalLocalHeadersSize += localHeaderSize;
    }

    // Calculate Central Directory size: 46 bytes fixed per file + name length
    let centralDirSize = 0;
    for (const entry of processed) {
        centralDirSize += 46 + entry.nameBytes.length;
    }

    // End of Central Directory record: 22 bytes fixed
    const totalZipSize = totalLocalHeadersSize + centralDirSize + 22;
    const buffer = new Uint8Array(totalZipSize);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    let offset = 0;

    // 1. Write Local File Headers and Data
    for (const entry of processed) {
        // Local file header signature: 0x04034b50 ("PK\x03\x04")
        view.setUint32(offset, 0x04034b50, true);
        view.setUint16(offset + 4, 20, true);       // Version needed: 2.0
        view.setUint16(offset + 6, 0x0800, true);   // Flags: UTF-8 filename (bit 11)
        view.setUint16(offset + 8, 0, true);        // Compression: 0 (Store)
        view.setUint16(offset + 10, dosTime, true); // Mod time
        view.setUint16(offset + 12, dosDate, true); // Mod date
        view.setUint32(offset + 14, entry.crc, true);                // CRC-32
        view.setUint32(offset + 18, entry.dataBytes.length, true);   // Compressed size
        view.setUint32(offset + 22, entry.dataBytes.length, true);   // Uncompressed size
        view.setUint16(offset + 26, entry.nameBytes.length, true);   // Filename length
        view.setUint16(offset + 28, 0, true);                        // Extra field length
        offset += 30;

        buffer.set(entry.nameBytes, offset);
        offset += entry.nameBytes.length;

        buffer.set(entry.dataBytes, offset);
        offset += entry.dataBytes.length;
    }

    const centralDirStartOffset = offset;

    // 2. Write Central Directory Headers
    for (const entry of processed) {
        // Central directory file header signature: 0x02014b50 ("PK\x01\x02")
        view.setUint32(offset, 0x02014b50, true);
        view.setUint16(offset + 4, 20, true);       // Version made by: 2.0
        view.setUint16(offset + 6, 20, true);       // Version needed: 2.0
        view.setUint16(offset + 8, 0x0800, true);   // Flags: UTF-8 filename (bit 11)
        view.setUint16(offset + 10, 0, true);       // Compression: 0 (Store)
        view.setUint16(offset + 12, dosTime, true); // Mod time
        view.setUint16(offset + 14, dosDate, true); // Mod date
        view.setUint32(offset + 16, entry.crc, true);                // CRC-32
        view.setUint32(offset + 20, entry.dataBytes.length, true);   // Compressed size
        view.setUint32(offset + 24, entry.dataBytes.length, true);   // Uncompressed size
        view.setUint16(offset + 28, entry.nameBytes.length, true);   // Filename length
        view.setUint16(offset + 30, 0, true);       // Extra field length
        view.setUint16(offset + 32, 0, true);       // File comment length
        view.setUint16(offset + 34, 0, true);       // Disk number start
        view.setUint16(offset + 36, 0, true);       // Internal file attributes
        view.setUint32(offset + 38, 0, true);       // External file attributes
        view.setUint32(offset + 42, entry.localHeaderOffset, true); // Relative offset of local header
        offset += 46;

        buffer.set(entry.nameBytes, offset);
        offset += entry.nameBytes.length;
    }

    // 3. Write End of Central Directory Record (EOCD)
    // EOCD signature: 0x06054b50 ("PK\x05\x06")
    view.setUint32(offset, 0x06054b50, true);
    view.setUint16(offset + 4, 0, true);                    // Number of this disk
    view.setUint16(offset + 6, 0, true);                    // Disk where CD starts
    view.setUint16(offset + 8, processed.length, true);     // Total CD records on this disk
    view.setUint16(offset + 10, processed.length, true);    // Total CD records
    view.setUint32(offset + 12, centralDirSize, true);       // Size of central directory
    view.setUint32(offset + 16, centralDirStartOffset, true);// Offset of start of CD
    view.setUint16(offset + 20, 0, true);                   // ZIP comment length

    return buffer;
}

/**
 * Downloads a ZIP file containing the specified entries directly in browser environments.
 */
export function downloadZip(files: ZipFileInput[], filename = 'archive.zip'): void {
    if (typeof document === 'undefined') {
        throw new Error('[sharedom]: downloadZip() requires a browser environment.');
    }

    const zipBytes = buildZip(files);
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);

    try {
        const link = document.createElement('a');
        link.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
        link.href = url;
        link.click();
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
