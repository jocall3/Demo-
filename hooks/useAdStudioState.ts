import React, { useState, useEffect, useCallback, useMemo, Reducer, useReducer } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
    // Exported Type Definitions from the main component file
    GenerationState, AspectRatio, VideoModel, GenerationMode, AppTheme,
    GenerationSettings, StoryboardScene, VideoAsset, AdProject, AppConfig,
    // Mock API Instance - centrally managed
    mockApi,
    // Utility Functions - centrally managed
    generateUniqueId, formatDate,
} from '../components/AIAdStudioView';

/**
 * @file hooks/useAdStudioState.ts
 * @description Provides a custom React hook to manage the global application state and business logic,
 * centralizing data flow and side effects for the AI Ad Studio. This hook encapsulates all core
 * state, data fetching, project management, asset management, and video generation logic,
 * making the main `AIAdStudioView` component more focused on presentation.
 */

// SECTION: Global Constants (moved from AIAdStudioView.tsx)
// ===================================

/**
 * Messages displayed during the video generation polling phase to provide user feedback.
 * These messages simulate the stages of a complex AI video generation process.
 */
const pollingMessages: string[] = [
    "Initializing Veo 2.0 model...",
    "Analyzing prompt semantics...",
    "Generating initial keyframes...",
    "Rendering motion vectors...",
    "Upscaling to high resolution...",
    "Adding audio layer...",
    "Finalizing video file..."
];

/**
 * Key used for storing the Google GenAI API key in local storage.
 */
const LOCAL_STORAGE_API_KEY = 'google_genai_api_key';

/**
 * Key used for storing AI Ad Studio projects in local storage.
 * Although `mockApi` handles this, it's good practice to define the key here.
 */
const LOCAL_STORAGE_PROJECTS_KEY = 'ai_ad_studio_projects'; // Not directly used here, but good to have defined.

// SECTION: Type Definitions for Reducer (moved and adapted from AIAdStudioView.tsx)
// =======================================

/**
 * Defines the complete shape of the application's global state managed by the reducer.
 */
type AppState = {
    /** An array of all ad projects loaded into the studio. */
    projects: AdProject[];
    /** The ID of the currently selected or active project. */
    currentProjectId: string | null;
    /** Indicates if global data is currently being loaded (e.g., initial project fetch). */
    isLoading: boolean;
    /** Stores a global error message, if any, affecting the application. */
    error: string | null;
    /** Configuration settings for the application, including API key and default generation parameters. */
    config: AppConfig;
};

/**
 * Defines all possible actions that can be dispatched to modify the `AppState`.
 * This ensures type safety and clarity in state transitions.
 */
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

/**
 * The initial state for the global application reducer.
 * This provides default values for all parts of the `AppState`.
 */
const initialState: AppState = {
    projects: [],
    currentProjectId: null,
    isLoading: true, // Application starts in a loading state
    error: null,
    config: {
        apiKey: null,
        theme: 'dark', // Default theme
        autoSave: true, // Auto-save enabled by default
        defaultSettings: { // Default video generation settings
            model: 'veo-3.1-fast-generate-preview',
            aspectRatio: '16:9',
            duration: 10, // 10 seconds
            negativePrompt: 'blurry, low quality, watermark, text, distorted, ugly',
            seed: -1, // -1 indicates a random seed
            highFidelity: true,
            stylizationStrength: 70, // 70% stylization
        },
    },
};

/**
 * The reducer function that manages the global application state based on dispatched actions.
 * It's a pure function that takes the current state and an action, and returns a new state.
 * @param state The current application state.
 * @param action The action dispatched to modify the state.
 * @returns The new application state.
 */
const appReducer: Reducer<AppState, AppAction> = (state, action): AppState => {
    switch (action.type) {
        /**
         * Sets the array of all projects. If no current project is selected,
         * it attempts to select the first project in the list.
         */
        case 'SET_PROJECTS':
            const firstProjectId = action.payload.length > 0 ? action.payload[0].id : null;
            return {
                ...state,
                projects: action.payload,
                currentProjectId: state.currentProjectId || firstProjectId,
                isLoading: false,
                error: null, // Clear any previous errors on successful project load
            };
        /**
         * Sets the currently active project by its ID.
         */
        case 'SET_CURRENT_PROJECT':
            return { ...state, currentProjectId: action.payload };
        /**
         * Adds a new project to the list of projects.
         */
        case 'ADD_PROJECT':
            return { ...state, projects: [...state.projects, action.payload] };
        /**
         * Updates an existing project's details (e.g., name, assets) based on its ID.
         */
        case 'UPDATE_PROJECT':
            return {
                ...state,
                projects: state.projects.map(p => (p.id === action.payload.id ? action.payload : p)),
            };
        /**
         * Removes a project by its ID. If the removed project was the current one,
         * it attempts to select another project (the first available) or sets `currentProjectId` to null.
         */
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
        /**
         * Handles operations related to adding, removing, or updating video assets within a project.
         * The state is immutable; new arrays/objects are created for modifications.
         */
        case 'ADD_ASSET':
        case 'REMOVE_ASSET':
        case 'UPDATE_ASSET':
            return {
                ...state,
                projects: state.projects.map(p => {
                    if (p.id !== action.payload.projectId) return p; // Only modify the target project
                    let newAssets: VideoAsset[];
                    if (action.type === 'ADD_ASSET') {
                        newAssets = [action.payload.asset, ...p.assets]; // Add new asset to the beginning
                    } else if (action.type === 'REMOVE_ASSET') {
                        newAssets = p.assets.filter(a => a.id !== action.payload.assetId); // Filter out asset
                    } else { // UPDATE_ASSET
                        newAssets = p.assets.map(a => a.id === action.payload.asset.id ? action.payload.asset : a); // Update existing asset
                    }
                    // Update project's last modified date
                    return { ...p, assets: newAssets, lastModified: new Date().toISOString() };
                }),
            };
        /**
         * Sets the global loading state indicator.
         */
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        /**
         * Sets a global error message, and clears loading state if an error occurs.
         */
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        /**
         * Updates specific properties of the application configuration.
         */
        case 'UPDATE_CONFIG':
            return { ...state, config: { ...state.config, ...action.payload } };
        default:
            // Log any unhandled actions for debugging purposes
            console.warn(`Unhandled action type: ${(action as any).type}`);
            return state;
    }
};


// SECTION: Custom Hook Implementation
// ===================================

/**
 * A custom React hook `useAdStudioState` to manage the comprehensive state and business logic
 * for the AI Ad Studio application. It centralizes all data management, API interactions,
 * and complex state transitions, providing a clean interface for UI components.
 *
 * This hook encapsulates:
 * - Global application state (projects, current project, loading, errors) using `useReducer`.
 * - State specific to video generation (prompt, settings, mode, current generation status).
 * - Handlers for project creation, deletion, renaming.
 * - Handlers for asset management (add, delete, favorite).
 * - Logic for AI video generation, including polling and error handling.
 * - API key management.
 *
 * @returns An object containing all necessary state variables, derived states,
 * and callback functions for interacting with the AI Ad Studio's core logic.
 */
export const useAdStudioState = () => {
    // Core application state managed by useReducer
    const [appState, dispatch] = useReducer(appReducer, initialState);

    // State specific to the video generation interface (not part of global appState reducer)
    /** The main text prompt for single-prompt video generation. */
    const [prompt, setPrompt] = useState<string>('A neon hologram of a cat driving a futuristic car at top speed through a cyberpunk city.');
    /** The current state of the video generation process (e.g., idle, generating, polling, done, error). */
    const [generationState, setGenerationState] = useState<GenerationState>('idle');
    /** The URL of the recently generated video asset. */
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    /** Error message specific to the video generation process. */
    const [generationError, setGenerationError] = useState<string>('');
    /** Index for cycling through `pollingMessages` during generation. */
    const [pollingMessageIndex, setPollingMessageIndex] = useState<number>(0);
    /** The ID of the interval used for polling AI generation status. */
    const [pollingIntervalId, setPollingIntervalId] = useState<number | null>(null);
    /** The current settings for video generation (model, aspect ratio, duration, etc.). */
    const [generationSettings, setGenerationSettings] = useState<GenerationSettings>(initialState.config.defaultSettings);
    /** The selected generation mode: 'single' prompt or 'storyboard'. */
    const [generationMode, setGenerationMode] = useState<GenerationMode>('single');
    /** The list of scenes for storyboard generation mode. */
    const [scenes, setScenes] = useState<StoryboardScene[]>([{ id: generateUniqueId(), prompt: 'A cinematic opening shot of a futuristic city skyline at night.', duration: 5 }]);
    /** The currently selected video asset for detailed viewing in a modal. */
    const [selectedAsset, setSelectedAsset] = useState<VideoAsset | null>(null);

    // Derived states for convenience and performance
    /**
     * Determines if the AI video generation process is currently active (generating or polling).
     */
    const isGenerating = useMemo(() => {
        return generationState === 'generating' || generationState === 'polling';
    }, [generationState]);

    /**
     * The `AdProject` object corresponding to the `currentProjectId` in `appState`.
     * Memoized to prevent unnecessary re-calculations.
     */
    const currentProject = useMemo(() => {
        return appState.projects.find(p => p.id === appState.currentProjectId);
    }, [appState.projects, appState.currentProjectId]);

    // SECTION: Effect Hooks
    // =====================

    /**
     * Effect hook for initial data loading.
     * Fetches projects from the mock API and loads the API key from local storage
     * when the component mounts.
     */
    useEffect(() => {
        /**
         * Asynchronously loads projects from the mock API.
         */
        const loadProjects = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const projects = await mockApi.getProjects();
                dispatch({ type: 'SET_PROJECTS', payload: projects });
            } catch (err: any) {
                console.error("Failed to load projects from mock API:", err);
                dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to load projects.' });
            }
        };

        loadProjects();

        // Load API key from local storage or environment variables
        const storedApiKey = process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY || localStorage.getItem(LOCAL_STORAGE_API_KEY);
        if (storedApiKey) {
            dispatch({ type: 'UPDATE_CONFIG', payload: { apiKey: storedApiKey } });
            console.log("API Key loaded successfully.");
        } else {
            console.warn("No Google GenAI API key found in local storage or environment variables.");
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    /**
     * Effect hook to clean up the polling interval when generation stops or component unmounts.
     * Prevents memory leaks from ongoing intervals.
     */
    useEffect(() => {
        return () => {
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
                console.log("Polling interval cleared.");
            }
        };
    }, [pollingIntervalId]);

    /**
     * Effect hook to revoke the Object URL created for a generated video blob
     * when the `videoUrl` changes or the component unmounts.
     * This releases memory associated with the blob.
     */
    useEffect(() => {
        return () => {
            if (videoUrl && videoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(videoUrl);
                console.log("Blob URL revoked:", videoUrl);
            }
        };
    }, [videoUrl]);

    // SECTION: Project Management Handlers
    // ====================================

    /**
     * Handles the creation of a new project.
     * @param name The name of the new project.
     */
    const handleCreateProject = useCallback(async (name: string) => {
        if (!name.trim()) {
            dispatch({ type: 'SET_ERROR', payload: 'Project name cannot be empty.' });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const newProject = await mockApi.createProject(name.trim());
            dispatch({ type: 'ADD_PROJECT', payload: newProject });
            dispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject.id });
            dispatch({ type: 'SET_ERROR', payload: null }); // Clear previous error
            console.log("Project created:", newProject.name);
        } catch (err: any) {
            console.error("Failed to create project:", err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to create project.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    /**
     * Handles the deletion of an existing project.
     * @param id The ID of the project to delete.
     */
    const handleDeleteProject = useCallback(async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            return; // User cancelled deletion
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const success = await mockApi.deleteProject(id);
            if (success) {
                dispatch({ type: 'REMOVE_PROJECT', payload: id });
                dispatch({ type: 'SET_ERROR', payload: null });
                console.log("Project deleted:", id);
            } else {
                throw new Error('Project not found or could not be deleted.');
            }
        } catch (err: any) {
            console.error("Failed to delete project:", err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to delete project.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    /**
     * Handles the renaming of an existing project.
     * @param id The ID of the project to rename.
     * @param newName The new name for the project.
     */
    const handleRenameProject = useCallback(async (id: string, newName: string) => {
        if (!newName.trim()) {
            dispatch({ type: 'SET_ERROR', payload: 'Project name cannot be empty.' });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const updatedProject = await mockApi.renameProject(id, newName.trim());
            if (updatedProject) {
                dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
                dispatch({ type: 'SET_ERROR', payload: null });
                console.log(`Project ${id} renamed to: ${newName}`);
            } else {
                throw new Error('Project not found or could not be renamed.');
            }
        } catch (err: any) {
            console.error("Failed to rename project:", err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to rename project.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    // SECTION: Asset Management Handlers
    // ==================================

    /**
     * Handles the deletion of a video asset from the current project.
     * @param assetId The ID of the asset to delete.
     */
    const handleDeleteAsset = useCallback(async (assetId: string) => {
        if (!currentProject) {
            dispatch({ type: 'SET_ERROR', payload: 'No project selected to delete asset from.' });
            return;
        }
        if (!window.confirm("Are you sure you want to delete this video asset? This cannot be undone.")) {
            return; // User cancelled
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const success = await mockApi.deleteAsset(currentProject.id, assetId);
            if (success) {
                dispatch({ type: 'REMOVE_ASSET', payload: { projectId: currentProject.id, assetId } });
                if (selectedAsset?.id === assetId) {
                    setSelectedAsset(null); // Deselect asset if it was deleted
                }
                dispatch({ type: 'SET_ERROR', payload: null });
                console.log(`Asset ${assetId} deleted from project ${currentProject.name}.`);
            } else {
                throw new Error('Asset not found or could not be deleted.');
            }
        } catch (err: any) {
            console.error("Failed to delete asset:", err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to delete asset.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [currentProject, selectedAsset]); // Dependencies: currentProject (to get ID), selectedAsset (to deselect)

    /**
     * Toggles the favorite status of a video asset within the current project.
     * @param assetId The ID of the asset to toggle favorite status for.
     */
    const handleToggleFavorite = useCallback(async (assetId: string) => {
        if (!currentProject) {
            dispatch({ type: 'SET_ERROR', payload: 'No project selected to update asset favorite status.' });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const updatedAsset = await mockApi.toggleFavoriteAsset(currentProject.id, assetId);
            if (updatedAsset) {
                dispatch({ type: 'UPDATE_ASSET', payload: { projectId: currentProject.id, asset: updatedAsset } });
                dispatch({ type: 'SET_ERROR', payload: null });
                console.log(`Asset ${assetId} favorite status toggled to: ${updatedAsset.isFavorite}.`);
            } else {
                throw new Error('Asset not found or favorite status could not be updated.');
            }
        } catch (err: any) {
            console.error("Failed to toggle favorite status:", err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to update favorite status.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [currentProject]); // Dependency: currentProject (to get ID)

    // SECTION: API Key Management
    // ===========================

    /**
     * Saves the provided Google GenAI API key to local storage and updates the app configuration.
     * @param key The API key string to save.
     */
    const handleApiKeySave = useCallback((key: string | null) => {
        if (key && key.trim()) {
            localStorage.setItem(LOCAL_STORAGE_API_KEY, key.trim());
            dispatch({ type: 'UPDATE_CONFIG', payload: { apiKey: key.trim() } });
            dispatch({ type: 'SET_ERROR', payload: null }); // Clear any previous API key error
            console.log("API Key saved successfully.");
        } else {
            dispatch({ type: 'SET_ERROR', payload: 'API Key cannot be empty. Please provide a valid key.' });
            console.warn("Attempted to save empty API key.");
        }
    }, []);

    // SECTION: Main Video Generation Logic
    // ====================================

    /**
     * Initiates the AI video generation process.
     * This function orchestrates the call to the AI model, polls for results,
     * downloads the generated video, and adds it to the current project's assets.
     */
    const handleGenerate = useCallback(async () => {
        if (!appState.config.apiKey) {
            setGenerationError('API Key is not set. Please add it in the settings to enable generation.');
            setGenerationState('error');
            return;
        }

        if (!currentProject) {
            setGenerationError('No project selected. Please create or select a project first to save your generated video.');
            setGenerationState('error');
            return;
        }
        
        // Reset generation state for a new attempt
        setGenerationState('generating');
        setGenerationError('');
        if (videoUrl && videoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(videoUrl); // Clean up previous video blob if any
        }
        setVideoUrl(null);
        setPollingMessageIndex(0);
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId); // Clear any existing polling
            setPollingIntervalId(null);
        }

        // Determine the final prompt based on the selected generation mode
        const finalPrompt = generationMode === 'single'
            ? prompt.trim()
            : scenes.map(s => s.prompt.trim()).filter(p => p).join(' | ');
        
        if (!finalPrompt) {
            setGenerationError('Prompt cannot be empty. Please describe your desired video.');
            setGenerationState('error');
            return;
        }

        try {
            // Initialize Google GenAI client
            const ai = new GoogleGenAI({ apiKey: appState.config.apiKey });
            console.log("Initializing Google GenAI client for video generation...");

            // Prepare the payload for the AI video generation API call
            // This structure is simplified; a real API might have more parameters.
            const apiPayload: any = {
                model: generationSettings.model,
                prompt: finalPrompt,
                config: {
                    numberOfVideos: 1,
                    aspectRatio: generationSettings.aspectRatio,
                    resolution: generationSettings.highFidelity ? '1080p' : '720p', // High fidelity implies higher resolution
                    durationSeconds: generationSettings.duration,
                    seed: generationSettings.seed === -1 ? undefined : generationSettings.seed, // Undefined for random seed
                    negativePrompt: generationSettings.negativePrompt || undefined,
                    stylizationStrength: generationSettings.stylizationStrength, // Pass stylization
                    // Additional configuration could be added here for advanced features
                },
                // For storyboard mode, additional scene data might be passed
                storyboard: generationMode === 'storyboard' ? scenes.map(s => ({
                    prompt: s.prompt,
                    durationSeconds: s.duration,
                })) : undefined,
            };
            console.log("Sending AI API request with payload:", apiPayload);

            // Simulate AI model processing and get an operation object
            let operation = await ai.models.generateVideos(apiPayload);

            setGenerationState('polling');
            console.log("Video generation initiated, starting polling process.");

            // Start polling for the video generation status
            const intervalId: number = window.setInterval(() => {
                setPollingMessageIndex(prev => (prev + 1) % pollingMessages.length);
            }, 2500); // Cycle through messages every 2.5 seconds
            setPollingIntervalId(intervalId);

            // Continue polling until the operation is done
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000)); // Poll every 5-10 seconds
                operation = await ai.operations.getVideosOperation({ operation: operation });
                console.log("Polling for video generation status. Current state:", operation.done ? "Done" : "Pending");
            }

            // Clear the polling interval once generation is complete
            clearInterval(intervalId);
            setPollingIntervalId(null);

            // Check for errors in the AI operation response
            if (operation.error) {
                const errorMessage = operation.error.message || 'Video generation failed after polling with an unknown error.';
                throw new Error(`AI generation error: ${errorMessage}`);
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

            if (downloadLink) {
                setPollingMessageIndex(pollingMessages.length - 1); // Show final message
                console.log("Video generation successful. Attempting to download...");

                // Fetch the generated video blob
                // Note: The API key often needs to be appended for direct download links
                const videoResponse = await fetch(`${downloadLink}&key=${appState.config.apiKey}`);
                if (!videoResponse.ok) {
                    throw new Error(`Failed to download the generated video. Status: ${videoResponse.status} - ${videoResponse.statusText}`);
                }
                const videoBlob = await videoResponse.blob();
                const objectURL = URL.createObjectURL(videoBlob); // Create a blob URL for local display
                setVideoUrl(objectURL);
                setGenerationState('done');
                console.log("Video downloaded and displayed.");

                // Create a new VideoAsset object to add to the current project
                const newAssetData: Omit<VideoAsset, 'id' | 'projectId' | 'creationDate'> = {
                    url: objectURL,
                    prompt: finalPrompt,
                    settings: generationSettings,
                    generationMode,
                    storyboard: generationMode === 'storyboard' ? scenes : undefined,
                    isFavorite: false,
                };

                // Add the new asset to the mock backend and update global state
                const newAsset = await mockApi.addAssetToProject(currentProject.id, newAssetData);
                dispatch({ type: 'ADD_ASSET', payload: { projectId: currentProject.id, asset: newAsset } });
                dispatch({ type: 'SET_ERROR', payload: null }); // Clear any previous errors
                console.log("Generated video asset added to project:", newAsset.id);

            } else {
                throw new Error('Video generation completed, but no download link was found in the response.');
            }

        } catch (err: any) {
            console.error("Video generation process failed:", err);
            setGenerationError(String(err?.message || 'An unexpected error occurred during video generation. Please try again.'));
            setGenerationState('error');
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
                setPollingIntervalId(null);
            }
        }
    }, [
        appState.config.apiKey,     // Dependency: API key from global config
        currentProject,             // Dependency: The currently selected project
        videoUrl,                   // Dependency: For cleanup
        pollingIntervalId,          // Dependency: For cleanup
        generationMode,             // Dependency: Current generation mode
        prompt,                     // Dependency: Single prompt content
        scenes,                     // Dependency: Storyboard scenes
        generationSettings,         // Dependency: Generation parameters
        dispatch,                   // Dependency: Dispatch function for appState updates
    ]);

    /**
     * The public interface of the `useAdStudioState` hook, returning all states and handlers
     * that UI components might need to consume.
     */
    return {
        // Global Application State & Reducer
        appState,
        dispatch,
        currentProject, // Memoized current project for easy access

        // Video Generation Specific States and Handlers
        prompt,
        setPrompt,
        generationState,
        setGenerationState, // Rarely set directly by UI, but available
        videoUrl,
        generationError,
        pollingMessageIndex,
        isGenerating,
        generationSettings,
        setGenerationSettings,
        generationMode,
        setGenerationMode,
        scenes,
        setScenes,
        selectedAsset,
        setSelectedAsset,
        pollingMessages, // For displaying dynamic messages in UI

        // Project Management Callbacks
        handleCreateProject,
        handleDeleteProject,
        handleRenameProject,

        // Asset Management Callbacks
        handleDeleteAsset,
        handleToggleFavorite,

        // API Key Management Callback
        handleApiKeySave,

        // Main Video Generation Callback
        handleGenerate,
    };
};