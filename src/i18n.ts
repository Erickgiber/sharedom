import { Language } from './types';

let currentLibraryLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
    if (lang === 'en' || lang === 'es') {
        currentLibraryLanguage = lang;
    }
}

export function getLanguage(): Language {
    return currentLibraryLanguage;
}

export interface TableTranslations {
    consoleTitle: string;
    networkTitle: string;
    colIndex: string;
    colLevel: string;
    colMessage: string;
    colTime: string;
    colMethod: string;
    colNameUrl: string;
    colStatus: string;
    colType: string;
    colDuration: string;
    emptyConsole: string;
    emptyNetwork: string;
    totalLogs: string;
    errors: string;
    warnings: string;
    totalRequests: string;
    success: string;
    failed: string;
    watermark: string;
    page: string;
    of: string;
}

export const tableTranslations: Record<Language, TableTranslations> = {
    en: {
        consoleTitle: 'Console Logs',
        networkTitle: 'Network Requests',
        colIndex: '#',
        colLevel: 'Level',
        colMessage: 'Message',
        colTime: 'Time',
        colMethod: 'Method',
        colNameUrl: 'Name / URL',
        colStatus: 'Status',
        colType: 'Type',
        colDuration: 'Duration',
        emptyConsole: 'No console logs recorded',
        emptyNetwork: 'No network requests recorded',
        totalLogs: 'logs',
        errors: 'errors',
        warnings: 'warnings',
        totalRequests: 'requests',
        success: 'success',
        failed: 'failed',
        watermark: 'sharedom',
        page: 'Page',
        of: 'of',
    },
    es: {
        consoleTitle: 'Registros de Consola',
        networkTitle: 'Peticiones de Red',
        colIndex: '#',
        colLevel: 'Nivel',
        colMessage: 'Mensaje',
        colTime: 'Hora',
        colMethod: 'Método',
        colNameUrl: 'Nombre / URL',
        colStatus: 'Estado',
        colType: 'Tipo',
        colDuration: 'Duración',
        emptyConsole: 'No hay registros de consola grabados',
        emptyNetwork: 'No hay peticiones de red grabadas',
        totalLogs: 'registros',
        errors: 'errores',
        warnings: 'advertencias',
        totalRequests: 'peticiones',
        success: 'éxito',
        failed: 'fallidas',
        watermark: 'sharedom',
        page: 'Página',
        of: 'de',
    },
};

export function getTranslations(lang?: Language): TableTranslations {
    const selected = lang || currentLibraryLanguage;
    return tableTranslations[selected] || tableTranslations.en;
}
