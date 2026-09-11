import { Language } from './types';

let currentLibraryLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
    if (tableTranslations[lang]) {
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
    zh: {
        consoleTitle: '控制台日志',
        networkTitle: '网络请求',
        colIndex: '#',
        colLevel: '级别',
        colMessage: '消息',
        colTime: '时间',
        colMethod: '方法',
        colNameUrl: '名称 / URL',
        colStatus: '状态',
        colType: '类型',
        colDuration: '耗时',
        emptyConsole: '没有记录到控制台日志',
        emptyNetwork: '没有记录到网络请求',
        totalLogs: '条日志',
        errors: '个错误',
        warnings: '个警告',
        totalRequests: '个请求',
        success: '成功',
        failed: '失败',
        watermark: 'sharedom',
        page: '页码',
        of: '/',
    },
    ja: {
        consoleTitle: 'コンソールログ',
        networkTitle: 'ネットワークリクエスト',
        colIndex: '#',
        colLevel: 'レベル',
        colMessage: 'メッセージ',
        colTime: '時刻',
        colMethod: 'メソッド',
        colNameUrl: '名前 / URL',
        colStatus: 'ステータス',
        colType: '種類',
        colDuration: '所要時間',
        emptyConsole: 'コンソールログはありません',
        emptyNetwork: 'ネットワークリクエストはありません',
        totalLogs: '件のログ',
        errors: '件のエラー',
        warnings: '件の警告',
        totalRequests: '件のリクエスト',
        success: '成功',
        failed: '失敗',
        watermark: 'sharedom',
        page: 'ページ',
        of: '/',
    },
    pt: {
        consoleTitle: 'Registros do Console',
        networkTitle: 'Requisições de Rede',
        colIndex: '#',
        colLevel: 'Nível',
        colMessage: 'Mensagem',
        colTime: 'Hora',
        colMethod: 'Método',
        colNameUrl: 'Nome / URL',
        colStatus: 'Status',
        colType: 'Tipo',
        colDuration: 'Duração',
        emptyConsole: 'Nenhum registro de console gravado',
        emptyNetwork: 'Nenhuma requisição de rede gravada',
        totalLogs: 'registros',
        errors: 'erros',
        warnings: 'avisos',
        totalRequests: 'requisições',
        success: 'sucesso',
        failed: 'falhas',
        watermark: 'sharedom',
        page: 'Página',
        of: 'de',
    },
    de: {
        consoleTitle: 'Konsolenprotokolle',
        networkTitle: 'Netzwerkanfragen',
        colIndex: '#',
        colLevel: 'Stufe',
        colMessage: 'Nachricht',
        colTime: 'Zeit',
        colMethod: 'Methode',
        colNameUrl: 'Name / URL',
        colStatus: 'Status',
        colType: 'Typ',
        colDuration: 'Dauer',
        emptyConsole: 'Keine Konsolenprotokolle aufgezeichnet',
        emptyNetwork: 'Keine Netzwerkanfragen aufgezeichnet',
        totalLogs: 'Protokolle',
        errors: 'Fehler',
        warnings: 'Warnungen',
        totalRequests: 'Anfragen',
        success: 'erfolgreich',
        failed: 'fehlgeschlagen',
        watermark: 'sharedom',
        page: 'Seite',
        of: 'von',
    },
    ko: {
        consoleTitle: '콘솔 로그',
        networkTitle: '네트워크 요청',
        colIndex: '#',
        colLevel: '수준',
        colMessage: '메시지',
        colTime: '시간',
        colMethod: '메서드',
        colNameUrl: '이름 / URL',
        colStatus: '상태',
        colType: '유형',
        colDuration: '소요 시간',
        emptyConsole: '기록된 콘솔 로그가 없습니다',
        emptyNetwork: '기록된 네트워크 요청이 없습니다',
        totalLogs: '로그',
        errors: '오류',
        warnings: '경고',
        totalRequests: '요청',
        success: '성공',
        failed: '실패',
        watermark: 'sharedom',
        page: '페이지',
        of: '/',
    },
    ru: {
        consoleTitle: 'Логи консоли',
        networkTitle: 'Сетевые запросы',
        colIndex: '#',
        colLevel: 'Уровень',
        colMessage: 'Сообщение',
        colTime: 'Время',
        colMethod: 'Метод',
        colNameUrl: 'Имя / URL',
        colStatus: 'Статус',
        colType: 'Тип',
        colDuration: 'Длительность',
        emptyConsole: 'Логи консоли не записаны',
        emptyNetwork: 'Сетевые запросы не записаны',
        totalLogs: 'логов',
        errors: 'ошибок',
        warnings: 'предупреждений',
        totalRequests: 'запросов',
        success: 'успешно',
        failed: 'с ошибкой',
        watermark: 'sharedom',
        page: 'Страница',
        of: 'из',
    },
};

export function getTranslations(lang?: Language): TableTranslations {
    const selected = lang || currentLibraryLanguage;
    return tableTranslations[selected] || tableTranslations.en;
}
