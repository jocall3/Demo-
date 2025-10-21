// types/adStudio.ts

// SECTION: Type Definitions for a real-world application
// =======================================================

export type GenerationState = 'idle' | 'generating' | 'polling' | 'done' | 'error';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type VideoModel = 'veo-3.1-fast-generate-preview' | 'imagen-video-3-hq' | 'lumiere-hd-001' | 'phoenix-v1-fast';
export type GenerationMode = 'single' | 'storyboard';
export type AppTheme = 'dark' | 'light';

export interface GenerationSettings {
    model: VideoModel;
    aspectRatio: AspectRatio;
    duration: number; // in seconds
    negativePrompt: string;
    seed: number;
    highFidelity: boolean;
    stylizationStrength: number; // 0-100
}

export interface StoryboardScene {
    id: string;
    prompt: string;
    duration: number; // Scene-specific duration
}

export interface VideoAsset {
    id: string;
    projectId: string;
    url: string; // Could be a blob URL or a remote URL
    thumbnailUrl?: string;
    prompt: string;
    creationDate: string;
    settings: GenerationSettings;
    generationMode: GenerationMode;
    storyboard?: StoryboardScene[];
    isFavorite: boolean;
}

export interface AdProject {
    id: string;
    name: string;
    creationDate: string;
    lastModified: string;
    assets: VideoAsset[];
}

export interface AppConfig {
    apiKey: string | null;
    theme: AppTheme;
    autoSave: boolean;
    defaultSettings: GenerationSettings;
}

// SECTION: Reducer Types for Complex State Management
// =============================================

export type AppState = {
    projects: AdProject[];
    currentProjectId: string | null;
    isLoading: boolean;
    error: string | null;
    config: AppConfig;
};

export type AppAction =
    | { type: 'SET_PROJECTS'; payload: AdProject[] }
    | { type: 'SET_CURRENT_PROJECT'; payload: string | null }
    | { type: 'ADD_PROJECT'; payload: AdProject }
    | { type: 'UPDATE_PROJECT'; payload: AdProject }
    | { type: 'REMOVE_PROJECT'; payload: string }
    | { type: 'ADD_ASSET'; payload: { projectId: string; asset: VideoAsset } }
    | { type: 'REMOVE_ASSET'; payload: { projectId: string; assetId: string } }
    | { type: 'UPDATE_ASSET'; payload: { projectId: string; asset: VideoAsset } }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'UPDATE_CONFIG'; payload: Partial<AppConfig> };