export const STORAGE_KEY = 'AIRLINE_TYCOON_GEMINI_KEY';

export const getStoredApiKey = (): string | null => {
    return localStorage.getItem(STORAGE_KEY);
};

export const setStoredApiKey = (apiKey: string): void => {
    localStorage.setItem(STORAGE_KEY, apiKey);
};

export const clearStoredApiKey = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};
