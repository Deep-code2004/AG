import type { UserProfile } from '../types';

const PROFILE_KEY = 'ai-farmer-assistant-userProfile';

export const getUserProfile = (): UserProfile | null => {
    try {
        const item = window.localStorage.getItem(PROFILE_KEY);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Failed to retrieve user profile from localStorage", error);
        return null;
    }
};

export const saveUserProfile = (profile: UserProfile): void => {
    try {
        const existingProfile = getUserProfile() || {};
        const newProfile = { ...existingProfile, ...profile };
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    } catch (error) {
        console.error("Failed to save user profile to localStorage", error);
    }
};
