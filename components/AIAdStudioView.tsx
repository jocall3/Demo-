// components/AIAdStudioView.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef, Reducer, useReducer } from 'react';
import { GoogleGenAI } from "@google/genai";
import Card from './Card';

const pollingMessages = [ "Initializing Veo 2.0 model...", "Analyzing prompt semantics...", "Generating initial keyframes...", "Rendering motion vectors...", "Upscaling to high resolution...", "Adding audio layer...", "Finalizing video file..." ];

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

// SECTION: Mock API and Data Layer
// ===================================
// In a real application, this would be in a separate file and make real network requests.
// For this exercise, it's included here to simulate a backend.

export class MockBackendAPI {
    private projects: AdProject[] = [];
    private latency: number = 500; // ms

    constructor() {
        this.loadFromLocalStorage();
    }

    private async simulateLatency(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, this.latency));
    }

    private saveToLocalStorage(): void {
        try {
            localStorage.setItem('ai_ad_studio_projects', JSON.stringify(this.projects));
        } catch (error) {
            console.error("Failed to save projects to local storage:", error);
        }
    }

    private loadFromLocalStorage(): void {
        try {
            const storedProjects = localStorage.getItem('ai_ad_studio_projects');
            if (storedProjects) {
                this.projects = JSON.parse(storedProjects);
            } else {
                // Initialize with some default data if nothing is stored
                const defaultProject: AdProject = {
                    id: `proj_${Date.now()}`,
                    name: 'My First Campaign',
                    creationDate: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    assets: [],
                };
                this.projects.push(defaultProject);
                this.saveToLocalStorage();
            }
        } catch (error) {
            console.error("Failed to load projects from local storage:", error);
            this.projects = [];
        }
    }
    
    public async getProjects(): Promise<AdProject[]> {
        await this.simulateLatency();
        return JSON.parse(JSON.stringify(this.projects)); // Return a deep copy
    }
    
    public async createProject(name: string): Promise<AdProject> {
        await this.simulateLatency();
        const newProject: AdProject = {
            id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            creationDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            assets: [],
        };
        this.projects.push(newProject);
        this.saveToLocalStorage();
        return { ...newProject };
    }
    
    public async renameProject(id: string, newName: string): Promise<AdProject | null> {
        await this.simulateLatency();
        const project = this.projects.find(p => p.id === id);
        if (project) {
            project.name = newName;
            project.lastModified = new Date().toISOString();
            this.saveToLocalStorage();
            return { ...project };
        }
        return null;
    }
    
    public async deleteProject(id: string): Promise<boolean> {
        await this.simulateLatency();
        const initialLength = this.projects.length;
        this.projects = this.projects.filter(p => p.id !== id);
        this.saveToLocalStorage();
        return this.projects.length < initialLength;
    }
    
    public async addAssetToProject(projectId: string, asset: Omit<VideoAsset, 'id' | 'projectId' | 'creationDate'>): Promise<VideoAsset> {
        await this.simulateLatency();
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        const newAsset: VideoAsset = {
            ...asset,
            id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId,
            creationDate: new Date().toISOString(),
        };
        project.assets.unshift(newAsset); // Add to the beginning
        project.lastModified = new Date().toISOString();
        this.saveToLocalStorage();
        return { ...newAsset };
    }

    public async deleteAsset(projectId: string, assetId: string): Promise<boolean> {
        await this.simulateLatency();
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            const initialLength = project.assets.length;
            project.assets = project.assets.filter(a => a.id !== assetId);
            project.lastModified = new Date().toISOString();
            this.saveToLocalStorage();
            return project.assets.length < initialLength;
        }
        return false;
    }

    public async toggleFavoriteAsset(projectId: string, assetId: string): Promise<VideoAsset | null> {
        await this.simulateLatency();
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            const asset = project.assets.find(a => a.id === assetId);
            if(asset) {
                asset.isFavorite = !asset.isFavorite;
                project.lastModified = new Date().toISOString();
                this.saveToLocalStorage();
                return { ...asset };
            }
        }
        return null;
    }
}

// Instantiate the mock API
export const mockApi = new MockBackendAPI();


// SECTION: Utility Functions
// ==========================

export const generateUniqueId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (isoString: string): string => {
    try {
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Invalid Date';
    }
};

export const getAspectRatioClass = (aspectRatio: AspectRatio): string => {
    switch (aspectRatio) {
        case '16:9': return 'aspect-video';
        case '9:16': return 'aspect-[9/16]';
        case '1:1': return 'aspect-square';
        case '4:5': return 'aspect-[4/5]';
        case '21:9': return 'aspect-[21/9]';
        default: return 'aspect-video';
    }
};

// SECTION: Reducer for Complex State Management
// =============================================

type AppState = {
    projects: AdProject[];
    currentProjectId: string | null;
    isLoading: boolean;
    error: string | null;
    config: AppConfig;
};

type AppAction =
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

const initialState: AppState = {
    projects: [],
    currentProjectId: null,
    isLoading: true,
    error: null,
    config: {
        apiKey: null,
        theme: 'dark',
        autoSave: true,
        defaultSettings: {
            model: 'veo-3.1-fast-generate-preview',
            aspectRatio: '16:9',
            duration: 10,
            negativePrompt: 'blurry, low quality, watermark, text',
            seed: -1, // -1 means random
            highFidelity: true,
            stylizationStrength: 70,
        },
    },
};

const appReducer: Reducer<AppState, AppAction> = (state, action): AppState => {
    switch (action.type) {
        case 'SET_PROJECTS':
            const firstProjectId = action.payload.length > 0 ? action.payload[0].id : null;
            return {
                ...state,
                projects: action.payload,
                currentProjectId: state.currentProjectId || firstProjectId,
                isLoading: false,
            };
        case 'SET_CURRENT_PROJECT':
            return { ...state, currentProjectId: action.payload };
        case 'ADD_PROJECT':
            return { ...state, projects: [...state.projects, action.payload] };
        case 'UPDATE_PROJECT':
            return {
                ...state,
                projects: state.projects.map(p => (p.id === action.payload.id ? action.payload : p)),
            };
        case 'REMOVE_PROJECT':
            const remainingProjects = state.projects.filter(p => p.id !== action.payload);
            const newCurrentProjectId = state.currentProjectId === action.payload 
                ? remainingProjects.length > 0 ? remainingProjects[0].id : null 
                : state.currentProjectId;
            return {
                ...state,
                projects: remainingProjects,
                currentProjectId: newCurrentProjectId,
            };
        case 'ADD_ASSET':
        case 'REMOVE_ASSET':
        case 'UPDATE_ASSET':
            return {
                ...state,
                projects: state.projects.map(p => {
                    if (p.id !== action.payload.projectId) return p;
                    let newAssets: VideoAsset[];
                    if (action.type === 'ADD_ASSET') {
                        newAssets = [action.payload.asset, ...p.assets];
                    } else if (action.type === 'REMOVE_ASSET') {
                        newAssets = p.assets.filter(a => a.id !== action.payload.assetId);
                    } else { // UPDATE_ASSET
                        newAssets = p.assets.map(a => a.id === action.payload.asset.id ? action.payload.asset : a);
                    }
                    return { ...p, assets: newAssets, lastModified: new Date().toISOString() };
                }),
            };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'UPDATE_CONFIG':
            return { ...state, config: { ...state.config, ...action.payload } };
        default:
            return state;
    }
};

// SECTION: Child Components
// ==========================
// In a real app, these would be in separate files.

export const ProjectSidebar: React.FC<{
    projects: AdProject[];
    currentProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateProject: (name: string) => void;
    onDeleteProject: (id: string) => void;
    onRenameProject: (id: string, newName: string) => void;
}> = ({ projects, currentProjectId, onSelectProject, onCreateProject, onDeleteProject, onRenameProject }) => {
    const [newProjectName, setNewProjectName] = useState('');
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renamingText, setRenamingText] = useState('');

    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim());
            setNewProjectName('');
        }
    };

    const handleRename = (id: string) => {
        if (renamingText.trim() && renamingId) {
            onRenameProject(id, renamingText.trim());
        }
        setRenamingId(null);
        setRenamingText('');
    };

    return (
        <div className="bg-gray-800/50 border-r border-gray-700 w-64 p-4 flex flex-col h-full">
            <h3 className="text-xl font-bold text-white mb-4">Projects</h3>
            <div className="flex mb-4">
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                    placeholder="New Campaign Name..."
                    className="flex-grow bg-gray-700 border border-gray-600 rounded-l-md p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button onClick={handleCreateProject} className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-r-md text-sm">+</button>
            </div>
            <ul className="space-y-2 overflow-y-auto flex-grow">
                {projects.map(project => (
                    <li key={project.id}>
                        <div
                            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer ${currentProjectId === project.id ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            onClick={() => onSelectProject(project.id)}
                        >
                            {renamingId === project.id ? (
                                <input
                                    type="text"
                                    value={renamingText}
                                    onChange={(e) => setRenamingText(e.target.value)}
                                    onBlur={() => handleRename(project.id)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleRename(project.id)}
                                    className="bg-gray-600 text-white w-full text-sm p-1 rounded"
                                    autoFocus
                                />
                            ) : (
                                <span className="truncate text-sm">{project.name}</span>
                            )}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setRenamingId(project.id); setRenamingText(project.name); }} className="text-gray-400 hover:text-white text-xs">✏️</button>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm(`Are you sure you want to delete "${project.name}"?`)) onDeleteProject(project.id);}} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const GenerationControls: React.FC<{
    settings: GenerationSettings;
    onSettingsChange: (newSettings: Partial<GenerationSettings>) => void;
    isGenerating: boolean;
}> = ({ settings, onSettingsChange, isGenerating }) => {
    return (
        <Card title="Generation Parameters">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Model Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">AI Model</label>
                    <select
                        value={settings.model}
                        onChange={e => onSettingsChange({ model: e.target.value as VideoModel })}
                        disabled={isGenerating}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm"
                    >
                        <option value="veo-3.1-fast-generate-preview">Veo 2.0 (High Quality)</option>
                        <option value="imagen-video-3-hq">Imagen Video 3 (Creative)</option>
                        <option value="lumiere-hd-001">Lumiere HD (Realistic)</option>
                        <option value="phoenix-v1-fast">Phoenix v1 (Fast Draft)</option>
                    </select>
                </div>
                {/* Aspect Ratio */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
                    <select
                        value={settings.aspectRatio}
                        onChange={e => onSettingsChange({ aspectRatio: e.target.value as AspectRatio })}
                        disabled={isGenerating}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm"
                    >
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="9:16">9:16 (Vertical)</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="4:5">4:5 (Portrait)</option>
                        <option value="21:9">21:9 (Cinematic)</option>
                    </select>
                </div>
                {/* Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Duration (s): {settings.duration}</label>
                    <input
                        type="range"
                        min="2"
                        max="30"
                        step="1"
                        value={settings.duration}
                        onChange={e => onSettingsChange({ duration: parseInt(e.target.value, 10) })}
                        disabled={isGenerating}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                {/* Seed */}
                <div className="lg:col-span-1">
                     <label className="block text-sm font-medium text-gray-300 mb-1">Seed</label>
                     <div className="flex">
                        <input
                            type="number"
                            value={settings.seed === -1 ? '' : settings.seed}
                            onChange={e => onSettingsChange({ seed: parseInt(e.target.value, 10) || -1 })}
                            placeholder="Random"
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-l-lg p-2 text-white text-sm"
                        />
                        <button onClick={() => onSettingsChange({seed: -1})} className="bg-gray-600 hover:bg-gray-500 p-2 rounded-r-lg text-sm" disabled={isGenerating}>🎲</button>
                     </div>
                </div>
                 {/* Stylization Strength */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Stylization Strength: {settings.stylizationStrength}%</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={settings.stylizationStrength}
                        onChange={e => onSettingsChange({ stylizationStrength: parseInt(e.target.value, 10) })}
                        disabled={isGenerating}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                {/* Negative Prompt */}
                <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Negative Prompt</label>
                    <input
                        type="text"
                        value={settings.negativePrompt}
                        onChange={e => onSettingsChange({ negativePrompt: e.target.value })}
                        placeholder="e.g., blurry, text, watermark, ugly"
                        disabled={isGenerating}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm"
                    />
                </div>
                {/* Toggles */}
                <div className="col-span-full">
                    <label className="flex items-center space-x-2 text-sm text-gray-300">
                        <input
                            type="checkbox"
                            checked={settings.highFidelity}
                            onChange={e => onSettingsChange({ highFidelity: e.target.checked })}
                            disabled={isGenerating}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>High Fidelity Mode (Slower, higher quality)</span>
                    </label>
                </div>
            </div>
        </Card>
    );
};

export const AssetGrid: React.FC<{
    assets: VideoAsset[];
    onDelete: (assetId: string) => void;
    onToggleFavorite: (assetId: string) => void;
    onSelect: (asset: VideoAsset) => void;
}> = ({ assets, onDelete, onToggleFavorite, onSelect }) => {
    if (assets.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <p>No video assets in this project yet.</p>
                <p>Generate a new video to get started.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map(asset => (
                <div key={asset.id} className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <video src={asset.url} muted loop className="w-full h-full object-cover" onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()}></video>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => onToggleFavorite(asset.id)} className={`text-xl ${asset.isFavorite ? 'text-yellow-400' : 'text-white/70 hover:text-white'}`}>
                                {asset.isFavorite ? '★' : '☆'}
                            </button>
                            <button onClick={() => onDelete(asset.id)} className="text-white/70 hover:text-red-500">🗑️</button>
                        </div>
                        <div>
                            <p className="text-xs text-white truncate">{asset.prompt}</p>
                            <p className="text-xs text-gray-400">{formatDate(asset.creationDate)}</p>
                            <button onClick={() => onSelect(asset)} className="mt-1 w-full text-xs bg-cyan-600/80 hover:bg-cyan-600/100 text-white py-1 rounded">View Details</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const StoryboardEditor: React.FC<{
    scenes: StoryboardScene[];
    setScenes: React.Dispatch<React.SetStateAction<StoryboardScene[]>>;
    isGenerating: boolean;
}> = ({ scenes, setScenes, isGenerating }) => {
    const addScene = () => {
        setScenes(prev => [...prev, { id: generateUniqueId(), prompt: '', duration: 5 }]);
    };

    const updateScenePrompt = (id: string, prompt: string) => {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, prompt } : s));
    };
    
    const updateSceneDuration = (id: string, duration: number) => {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, duration } : s));
    };

    const removeScene = (id: string) => {
        setScenes(prev => prev.filter(s => s.id !== id));
    };
    
    const totalDuration = useMemo(() => scenes.reduce((acc, scene) => acc + scene.duration, 0), [scenes]);

    return (
        <div className="space-y-4">
            {scenes.map((scene, index) => (
                <div key={scene.id} className="flex items-start space-x-3 p-3 bg-gray-800/60 rounded-lg">
                    <span className="font-bold text-gray-400 mt-2">{index + 1}</span>
                    <div className="flex-grow space-y-2">
                        <textarea
                            value={scene.prompt}
                            onChange={e => updateScenePrompt(scene.id, e.target.value)}
                            placeholder={`Scene ${index + 1} description...`}
                            className="w-full h-20 bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm"
                            disabled={isGenerating}
                        />
                         <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-400">Duration:</label>
                             <input
                                type="range"
                                min="1"
                                max="15"
                                value={scene.duration}
                                onChange={e => updateSceneDuration(scene.id, parseInt(e.target.value, 10))}
                                disabled={isGenerating}
                                className="w-32 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-white w-8">{scene.duration}s</span>
                        </div>
                    </div>
                    <button onClick={() => removeScene(scene.id)} disabled={isGenerating || scenes.length <= 1} className="text-gray-400 hover:text-red-500 disabled:opacity-30 mt-2">🗑️</button>
                </div>
            ))}
            <div className="flex justify-between items-center">
                <button onClick={addScene} disabled={isGenerating} className="py-2 px-4 text-sm bg-cyan-600/50 hover:bg-cyan-600/80 text-white rounded-lg disabled:opacity-50">
                    + Add Scene
                </button>
                <p className="text-sm text-gray-400">Total Estimated Duration: {totalDuration}s</p>
            </div>
        </div>
    );
};

// SECTION: Main Component
// =========================

const AIAdStudioView: React.FC = () => {
    // Original state
    const [prompt, setPrompt] = useState('A neon hologram of a cat driving a futuristic car at top speed through a cyberpunk city.');
    const [generationState, setGenerationState] = useState<GenerationState>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [pollingMessageIndex, setPollingMessageIndex] = useState(0);
    const [pollingIntervalId, setPollingIntervalId] = useState<number | null>(null);

    // New state for the full application
    const [appState, dispatch] = useReducer(appReducer, initialState);
    const [generationSettings, setGenerationSettings] = useState<GenerationSettings>(initialState.config.defaultSettings);
    const [generationMode, setGenerationMode] = useState<GenerationMode>('single');
    const [scenes, setScenes] = useState<StoryboardScene[]>([{ id: generateUniqueId(), prompt: 'A cinematic opening shot of a futuristic city skyline at night.', duration: 5 }]);
    const [selectedAsset, setSelectedAsset] = useState<VideoAsset | null>(null);
    const isGenerating = generationState === 'generating' || generationState === 'polling';
    
    // API Key management
    const apiKeyInputRef = useRef<HTMLInputElement>(null);

    // Derived state
    const currentProject = useMemo(() => {
        return appState.projects.find(p => p.id === appState.currentProjectId);
    }, [appState.projects, appState.currentProjectId]);

    // Effects
    useEffect(() => {
        // Load initial projects from mock API
        mockApi.getProjects().then(projects => {
            dispatch({ type: 'SET_PROJECTS', payload: projects });
        }).catch(err => {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load projects.' });
            console.error(err);
        });

        // Load API key from local storage
        const storedApiKey = process.env.API_KEY || localStorage.getItem('google_genai_api_key');
        if (storedApiKey) {
            dispatch({ type: 'UPDATE_CONFIG', payload: { apiKey: storedApiKey } });
        }
    }, []);

    useEffect(() => {
        // Cleanup interval on component unmount or when polling stops
        return () => {
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
            }
        };
    }, [pollingIntervalId]);

    useEffect(() => {
        // Cleanup blob URL on component unmount or when videoUrl changes
        return () => {
            if (videoUrl && videoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [videoUrl]);
    
    // Project management handlers
    const handleCreateProject = useCallback(async (name: string) => {
        try {
            const newProject = await mockApi.createProject(name);
            dispatch({ type: 'ADD_PROJECT', payload: newProject });
            dispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject.id });
        } catch (err) {
            alert('Failed to create project.');
        }
    }, []);

    const handleDeleteProject = useCallback(async (id: string) => {
        try {
            await mockApi.deleteProject(id);
            dispatch({ type: 'REMOVE_PROJECT', payload: id });
        } catch (err) {
            alert('Failed to delete project.');
        }
    }, []);
    
    const handleRenameProject = useCallback(async (id: string, newName: string) => {
        try {
            const updatedProject = await mockApi.renameProject(id, newName);
            if (updatedProject) {
                dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
            }
        } catch (err) {
            alert('Failed to rename project.');
        }
    }, []);

    // Asset management handlers
    const handleDeleteAsset = useCallback(async (assetId: string) => {
        if (!currentProject) return;
        if (!window.confirm("Are you sure you want to delete this video asset?")) return;
        try {
            await mockApi.deleteAsset(currentProject.id, assetId);
            dispatch({ type: 'REMOVE_ASSET', payload: { projectId: currentProject.id, assetId }});
            if (selectedAsset?.id === assetId) {
                setSelectedAsset(null);
            }
        } catch (err) {
            alert('Failed to delete asset.');
        }
    }, [currentProject, selectedAsset]);
    
    const handleToggleFavorite = useCallback(async (assetId: string) => {
        if (!currentProject) return;
        try {
            const updatedAsset = await mockApi.toggleFavoriteAsset(currentProject.id, assetId);
            if(updatedAsset) {
                dispatch({ type: 'UPDATE_ASSET', payload: { projectId: currentProject.id, asset: updatedAsset }});
            }
        } catch (err) {
            alert('Failed to update favorite status.');
        }
    }, [currentProject]);

    // API Key handler
    const handleApiKeySave = () => {
        const key = apiKeyInputRef.current?.value;
        if (key) {
            localStorage.setItem('google_genai_api_key', key);
            dispatch({ type: 'UPDATE_CONFIG', payload: { apiKey: key } });
            alert("API Key saved. Please refresh the page if you experience issues.");
        }
    };

    // Main Generation Logic (adapted from original)
    const handleGenerate = async () => {
        if (!appState.config.apiKey) {
            setError('API Key is not set. Please add it in the settings.');
            setGenerationState('error');
            return;
        }

        if(!currentProject) {
            setError('No project selected. Please create or select a project first.');
            setGenerationState('error');
            return;
        }

        setGenerationState('generating');
        setError('');
        if (videoUrl && videoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(null);
        setPollingMessageIndex(0);
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
        }
        
        const finalPrompt = generationMode === 'single' ? prompt : scenes.map(s => s.prompt).join(' | ');

        try {
            const ai = new GoogleGenAI({ apiKey: appState.config.apiKey });
            
            // This is a simplified representation. A real API call would include all settings.
            const apiPayload: any = {
                model: generationSettings.model,
                prompt: finalPrompt,
                config: {
                    numberOfVideos: 1,
                    aspectRatio: generationSettings.aspectRatio,
                    resolution: '720p',
                    //... other settings
                },
            };
            console.log("Sending to AI API:", apiPayload);

            let operation = await ai.models.generateVideos(apiPayload);

            setGenerationState('polling');
            
            const intervalId: number = window.setInterval(() => {
                setPollingMessageIndex(prev => (prev + 1) % pollingMessages.length);
            }, 2500);
            setPollingIntervalId(intervalId);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }
            
            clearInterval(intervalId);
            setPollingIntervalId(null);

            if (operation.error) {
                 throw new Error(String(operation.error.message) || 'Video generation failed after polling.');
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

            if (downloadLink) {
                setPollingMessageIndex(pollingMessages.length - 1);
                const videoResponse = await fetch(`${downloadLink}&key=${appState.config.apiKey}`);
                if (!videoResponse.ok) {
                    throw new Error(`Failed to download the generated video. Status: ${videoResponse.statusText}`);
                }
                const videoBlob = await videoResponse.blob();
                const objectURL = URL.createObjectURL(videoBlob);
                setVideoUrl(objectURL);
                setGenerationState('done');

                // Add the new asset to the current project
                const newAssetData = {
                    url: objectURL,
                    prompt: finalPrompt,
                    settings: generationSettings,
                    generationMode,
                    storyboard: generationMode === 'storyboard' ? scenes : undefined,
                    isFavorite: false,
                };

                const newAsset = await mockApi.addAssetToProject(currentProject.id, newAssetData);
                dispatch({ type: 'ADD_ASSET', payload: { projectId: currentProject.id, asset: newAsset } });

            } else {
                throw new Error('Video generation completed, but no download link was found in the response.');
            }

        } catch (err: any) {
            console.error("Video generation failed:", err);
            setError(String(err?.message || 'An error occurred during video generation.'));
            setGenerationState('error');
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
                setPollingIntervalId(null);
            }
        }
    };

    if (appState.isLoading) {
        return <div className="text-white text-center p-10">Loading Ad Studio...</div>;
    }

    if (!appState.config.apiKey) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
                <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
                    <p className="text-gray-400 mb-6">Please enter your Google GenAI API key to use the AI Ad Studio.</p>
                    <div className="space-y-4">
                        <input
                            ref={apiKeyInputRef}
                            type="password"
                            placeholder="Enter your API key here"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white"
                        />
                        <button onClick={handleApiKeySave} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">
                            Save API Key
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-900 text-white">
            <ProjectSidebar 
                projects={appState.projects}
                currentProjectId={appState.currentProjectId}
                onSelectProject={id => dispatch({ type: 'SET_CURRENT_PROJECT', payload: id })}
                onCreateProject={handleCreateProject}
                onDeleteProject={handleDeleteProject}
                onRenameProject={handleRenameProject}
            />
            <main className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white tracking-wider">AI Ad Studio</h2>
                    <div className="text-right">
                        <h3 className="text-lg font-semibold">{currentProject?.name || "No Project Selected"}</h3>
                        <p className="text-sm text-gray-400">Last Modified: {currentProject ? formatDate(currentProject.lastModified) : 'N/A'}</p>
                    </div>
                </div>

                {currentProject ? (
                <>
                <Card title="Generate a Custom Video Ad with Veo 2.0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Controls & Prompt */}
                        <div className="space-y-4">
                             <div className="flex bg-gray-800/50 rounded-lg p-1">
                                <button onClick={() => setGenerationMode('single')} className={`flex-1 py-1 rounded-md text-sm ${generationMode === 'single' ? 'bg-cyan-600' : ''}`}>Single Prompt</button>
                                <button onClick={() => setGenerationMode('storyboard')} className={`flex-1 py-1 rounded-md text-sm ${generationMode === 'storyboard' ? 'bg-cyan-600' : ''}`}>Storyboard</button>
                            </div>
                            
                            {generationMode === 'single' ? (
                                 <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your ad..." className="w-full h-32 bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white" />
                            ) : (
                                <StoryboardEditor scenes={scenes} setScenes={setScenes} isGenerating={isGenerating} />
                            )}
                            
                            <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                {isGenerating ? 'Generating...' : 'Generate Ad'}
                            </button>
                        </div>
                        {/* Right Column: Video Preview */}
                        <div className={` ${getAspectRatioClass(generationSettings.aspectRatio)} mx-auto max-h-[50vh] w-full bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-700`}>
                            {generationState === 'done' && videoUrl ? (
                                <video src={videoUrl} controls autoPlay muted loop className="w-full h-full rounded-lg object-contain" />
                            ) : generationState === 'generating' || generationState === 'polling' ? (
                                <div className="text-center">
                                    <div className="relative w-16 h-16 mx-auto">
                                        <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                                        <div className="absolute inset-2 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <p className="text-white mt-4">{pollingMessages[pollingMessageIndex]}</p>
                                </div>
                            ) : error ? (
                                 <p className="text-red-400 p-4 text-center">{error}</p>
                            ) : (
                                 <p className="text-gray-500">Your generated video will appear here.</p>
                            )}
                        </div>
                    </div>
                </Card>

                <GenerationControls settings={generationSettings} onSettingsChange={ (partial) => setGenerationSettings(s => ({...s, ...partial}))} isGenerating={isGenerating} />
                
                <Card title="Project Asset Library">
                    <AssetGrid 
                        assets={currentProject.assets}
                        onDelete={handleDeleteAsset}
                        onToggleFavorite={handleToggleFavorite}
                        onSelect={setSelectedAsset}
                    />
                </Card>
                </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-lg">Please select or create a project to begin.</p>
                    </div>
                )}
            </main>

            {/* Asset Detail Modal */}
            {selectedAsset && (
                 <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setSelectedAsset(null)}>
                    <div className="bg-gray-800 rounded-lg max-w-4xl w-full p-6 space-y-4 m-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white">Asset Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <video src={selectedAsset.url} controls autoPlay loop muted className="w-full rounded-lg"></video>
                            </div>
                            <div className="text-sm space-y-3 text-gray-300">
                                <p><strong>Prompt:</strong> {selectedAsset.prompt}</p>
                                <p><strong>Generated:</strong> {formatDate(selectedAsset.creationDate)}</p>
                                <p><strong>Model:</strong> {selectedAsset.settings.model}</p>
                                <p><strong>Aspect Ratio:</strong> {selectedAsset.settings.aspectRatio}</p>
                                <p><strong>Duration:</strong> {selectedAsset.settings.duration}s</p>
                                <p><strong>Seed:</strong> {selectedAsset.settings.seed}</p>
                                {selectedAsset.settings.negativePrompt && <p><strong>Negative Prompt:</strong> {selectedAsset.settings.negativePrompt}</p>}
                                <p><strong>High Fidelity:</strong> {selectedAsset.settings.highFidelity ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4">
                            <a href={selectedAsset.url} download={`ai-ad-${selectedAsset.id}.mp4`} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Download</a>
                            <button onClick={() => setSelectedAsset(null)} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAdStudioView;
