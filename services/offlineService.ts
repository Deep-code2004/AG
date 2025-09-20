import type { ChatMessage, HarvestSaleLog } from '../types';
import { fileToBase64 } from '../utils/fileToBase64';
import { languages } from '../i18n';

type LanguageCode = keyof typeof languages;

const CACHE_PREFIX = 'ai-farmer-assistant-';

// --- Generic Data Caching ---
export const setCachedData = (key: string, data: any) => {
    try {
        const cacheEntry = {
            timestamp: new Date().toISOString(),
            data: data,
        };
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry));
    } catch (e) {
        console.error(`Failed to cache data for key: ${key}`, e);
    }
};

export const getCachedData = <T>(key: string): { data: T; timestamp: string } | null => {
    try {
        const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!item) return null;
        return JSON.parse(item);
    } catch (e) {
        console.error(`Failed to retrieve cached data for key: ${key}`, e);
        return null;
    }
};

// --- Chat Specific Caching ---
const CHAT_HISTORY_KEY = 'chatHistory';
const CHAT_OUTBOX_KEY = 'chatOutbox';

export const getChatHistory = (): ChatMessage[] => {
    return getCachedData<ChatMessage[]>(CHAT_HISTORY_KEY)?.data || [];
};

export const saveChatHistory = (messages: ChatMessage[]) => {
    setCachedData(CHAT_HISTORY_KEY, messages);
    // Dispatch a storage event so other tabs/components can update
    window.dispatchEvent(new StorageEvent('storage', {
        key: `${CACHE_PREFIX}${CHAT_HISTORY_KEY}`,
    }));
};

export interface QueuedMessage {
    id: string;
    prompt: string;
    fileData: string | null; // Base64 string
    fileName: string | null;
    fileMimeType: string | null;
    lang: LanguageCode;
}

export const addMessageToQueue = async (message: { prompt: string, file: File | null, id: string, lang: LanguageCode }) => {
    const outbox = getCachedData<QueuedMessage[]>(CHAT_OUTBOX_KEY)?.data || [];
    let fileData = null;
    if (message.file) {
        try {
            fileData = await fileToBase64(message.file);
        } catch (e) {
            console.error("Could not convert file to Base64 for offline queue", e);
        }
    }
    
    const queuedMessage: QueuedMessage = {
        id: message.id,
        prompt: message.prompt,
        fileData: fileData,
        fileName: message.file?.name || null,
        fileMimeType: message.file?.type || null,
        lang: message.lang,
    };

    outbox.push(queuedMessage);
    setCachedData(CHAT_OUTBOX_KEY, outbox);
};

export const getMessageQueue = (): QueuedMessage[] => {
    return getCachedData<QueuedMessage[]>(CHAT_OUTBOX_KEY)?.data || [];
};

export const clearMessageQueue = () => {
    localStorage.removeItem(`${CACHE_PREFIX}${CHAT_OUTBOX_KEY}`);
};

// --- Rewards Specific Caching ---
const TOTAL_POINTS_KEY = 'rewards-totalPoints';
const HARVEST_LOG_KEY = 'rewards-harvestLog';

export const getRewardsPoints = (): number => {
    const item = localStorage.getItem(`${CACHE_PREFIX}${TOTAL_POINTS_KEY}`);
    return item ? parseInt(item, 10) : 0;
};

export const saveRewardsPoints = (points: number) => {
    try {
        localStorage.setItem(`${CACHE_PREFIX}${TOTAL_POINTS_KEY}`, points.toString());
    } catch (e) {
        console.error("Failed to save total points", e);
    }
};

export const getHarvestLog = (): HarvestSaleLog[] => {
    return getCachedData<HarvestSaleLog[]>(HARVEST_LOG_KEY)?.data || [];
};

export const addSaleToHarvestLog = (sale: HarvestSaleLog) => {
    const log = getHarvestLog();
    log.unshift(sale); // Add new sales to the top of the list
    setCachedData(HARVEST_LOG_KEY, log);
};