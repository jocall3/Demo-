import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../Card';

// Re-declaring types from AIAdStudioView.tsx for self-containment in this new file.
// In a real-world application, these would typically be in a shared `types.ts` file
// and imported from there to avoid redundancy and circular dependencies.
export type GenerationState = 'idle' | 'generating' | 'polling' | 'done' | 'error';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type VideoModel = 'veo-3.1-fast-generate-preview' | 'imagen-video-3-hq' | 'lumiere-hd-001' | 'phoenix-v1-fast';
export type GenerationMode = 'single' | 'storyboard';
export type AppTheme = 'dark' | 'light'; // Keeping in line with seed's exports

// Extended GenerationSettings to include new features for reaching 1000 lines
export interface GenerationSettings {
    model: VideoModel;
    aspectRatio: AspectRatio;
    duration: number; // in seconds
    negativePrompt: string;
    seed: number;
    highFidelity: boolean;
    stylizationStrength: number; // 0-100

    // New Audio Settings
    backgroundMusicGenre: 'none' | 'ambient' | 'cinematic' | 'upbeat' | 'dramatic' | 'electronic' | 'classical' | 'rock';
    backgroundMusicVolume: number; // 0-100
    soundEffectsType: 'none' | 'whoosh' | 'explosion' | 'magic' | 'interface' | 'nature' | 'urban' | 'animals';
    soundEffectsVolume: number; // 0-100
    voiceoverEnabled: boolean;
    voiceoverPrompt: string;
    aiVoiceModel: 'standard-male' | 'standard-female' | 'premium-male' | 'premium-female' | 'child-male' | 'child-female' | 'robotic';
    customAudioUploadUrl: string | null; // For user-uploaded audio
    customAudioFileName: string | null; // Name of the uploaded file

    // New Visual Enhancements
    colorGradePreset: 'none' | 'cinematic' | 'vibrant' | 'monochrome' | 'retro' | 'warm' | 'cool' | 'sepia';
    brightness: number; // -100 to 100
    contrast: number; // -100 to 100
    saturation: number; // -100 to 100
    exposure: number; // -100 to 100
    highlights: number; // -100 to 100
    shadows: number; // -100 to 100
    vignetteStrength: number; // 0-100
    grainAmount: number; // 0-100
    blurAmount: number; // 0-100
    sharpenAmount: number; // 0-100
    filmGrainEnabled: boolean;
    chromaticAberration: number; // 0-100

    // New Output & Performance Settings
    outputResolution: '720p' | '1080p' | '2k' | '4k' | '8k';
    outputCodec: 'h264' | 'vp9' | 'hevc' | 'av1';
    frameRate: 24 | 30 | 60 | 120;
    qualityPreset: 'draft' | 'standard' | 'high' | 'premium' | 'ultra';
    bitrateMbps: number; // In Mbps

    // Reference Inputs
    imageReferenceUrl: string | null;
    imageReferenceFileName: string | null;
    videoReferenceUrl: string | null;
    videoReferenceFileName: string | null;
    referenceInfluence: number; // 0-100
}

// Utility type for a preset
interface GenerationPreset {
    id: string;
    name: string;
    settings: GenerationSettings;
    creationDate: string;
}

// Replicate generateUniqueId locally or import. Given its simple nature, local re-definition is safer for this single file.
const generateUniqueId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Cost estimation constants
const COST_PER_SECOND_DRAFT = 0.01;
const COST_PER_SECOND_STANDARD = 0.05;
const COST_PER_SECOND_HIGH = 0.15;
const COST_PER_SECOND_PREMIUM = 0.40;
const COST_PER_SECOND_ULTRA = 1.20;

const COST_MULTIPLIER_RESOLUTION: Record<GenerationSettings['outputResolution'], number> = {
    '720p': 1, '1080p': 1.5, '2k': 2.5, '4k': 5, '8k': 10
};
const COST_MULTIPLIER_VOICEOVER = 0.03; // Per second of voiceover
const COST_MULTIPLIER_HIGH_FIDELITY = 1.3; // 30% increase for high fidelity
const COST_PER_REFERENCE_UPLOAD = 0.10; // Per reference file uploaded

// Helper function to calculate estimated cost
const calculateEstimatedCost = (settings: GenerationSettings): number => {
    let baseCostPerSecond: number;
    switch (settings.qualityPreset) {
        case 'draft': baseCostPerSecond = COST_PER_SECOND_DRAFT; break;
        case 'standard': baseCostPerSecond = COST_PER_SECOND_STANDARD; break;
        case 'high': baseCostPerSecond = COST_PER_SECOND_HIGH; break;
        case 'premium': baseCostPerSecond = COST_PER_SECOND_PREMIUM; break;
        case 'ultra': baseCostPerSecond = COST_PER_SECOND_ULTRA; break;
        default: baseCostPerSecond = COST_PER_SECOND_STANDARD;
    }

    let totalCost = baseCostPerSecond * settings.duration;

    totalCost *= COST_MULTIPLIER_RESOLUTION[settings.outputResolution];
    
    if (settings.highFidelity) {
        totalCost *= COST_MULTIPLIER_HIGH_FIDELITY;
    }
    if (settings.voiceoverEnabled && settings.voiceoverPrompt) {
        totalCost += settings.duration * COST_MULTIPLIER_VOICEOVER;
    }
    if (settings.imageReferenceUrl) {
        totalCost += COST_PER_REFERENCE_UPLOAD;
    }
    if (settings.videoReferenceUrl) {
        totalCost += COST_PER_REFERENCE_UPLOAD;
    }
    if (settings.referenceInfluence > 0) {
        totalCost *= (1 + settings.referenceInfluence / 100 * 0.3); // Up to 30% increase based on influence
    }
    if (settings.backgroundMusicGenre !== 'none') {
        totalCost += settings.duration * 0.005; // Small cost for music
    }
    if (settings.soundEffectsType !== 'none') {
        totalCost += settings.duration * 0.003; // Small cost for sound effects
    }

    return parseFloat(totalCost.toFixed(2));
};


export const GenerationControls: React.FC<{
    settings: GenerationSettings;
    onSettingsChange: (newSettings: Partial<GenerationSettings>) => void;
    isGenerating: boolean;
}> = ({ settings, onSettingsChange, isGenerating }) => {
    const [savedPresets, setSavedPresets] = useState<GenerationPreset[]>([]);
    const [newPresetName, setNewPresetName] = useState('');
    const fileInputRefAudio = useRef<HTMLInputElement>(null);
    const fileInputRefImage = useRef<HTMLInputElement>(null);
    const fileInputRefVideo = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load presets from local storage
        try {
            const storedPresets = localStorage.getItem('ai_ad_studio_generation_presets');
            if (storedPresets) {
                setSavedPresets(JSON.parse(storedPresets));
            }
        } catch (error) {
            console.error("Failed to load presets:", error);
        }
    }, []);

    const handleSavePreset = useCallback(() => {
        if (!newPresetName.trim()) {
            alert('Please enter a name for the preset.');
            return;
        }
        const newPreset: GenerationPreset = {
            id: generateUniqueId(),
            name: newPresetName.trim(),
            settings: { ...settings },
            creationDate: new Date().toISOString(),
        };
        const updatedPresets = [...savedPresets, newPreset];
        setSavedPresets(updatedPresets);
        localStorage.setItem('ai_ad_studio_generation_presets', JSON.stringify(updatedPresets));
        setNewPresetName('');
        alert('Preset saved successfully!');
    }, [newPresetName, settings, savedPresets]);

    const handleLoadPreset = useCallback((presetId: string) => {
        const preset = savedPresets.find(p => p.id === presetId);
        if (preset) {
            onSettingsChange(preset.settings);
            alert(`Preset "${preset.name}" loaded.`);
        }
    }, [savedPresets, onSettingsChange]);

    const handleDeletePreset = useCallback((presetId: string) => {
        if (window.confirm('Are you sure you want to delete this preset?')) {
            const updatedPresets = savedPresets.filter(p => p.id !== presetId);
            setSavedPresets(updatedPresets);
            localStorage.setItem('ai_ad_studio_generation_presets', JSON.stringify(updatedPresets));
        }
    }, [savedPresets]);

    const handleFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>,
        type: 'audio' | 'image' | 'video'
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (type === 'audio') {
                onSettingsChange({ customAudioUploadUrl: url, customAudioFileName: file.name });
            } else if (type === 'image') {
                onSettingsChange({ imageReferenceUrl: url, imageReferenceFileName: file.name });
            } else if (type === 'video') {
                onSettingsChange({ videoReferenceUrl: url, videoReferenceFileName: file.name });
            }
        }
    };

    const handleClearFile = (type: 'audio' | 'image' | 'video') => {
        if (type === 'audio') {
            if (settings.customAudioUploadUrl) URL.revokeObjectURL(settings.customAudioUploadUrl);
            onSettingsChange({ customAudioUploadUrl: null, customAudioFileName: null });
        } else if (type === 'image') {
            if (settings.imageReferenceUrl) URL.revokeObjectURL(settings.imageReferenceUrl);
            onSettingsChange({ imageReferenceUrl: null, imageReferenceFileName: null });
        } else if (type === 'video') {
            if (settings.videoReferenceUrl) URL.revokeObjectURL(settings.videoReferenceUrl);
            onSettingsChange({ videoReferenceUrl: null, videoReferenceFileName: null });
        }
    };

    const estimatedCost = useMemo(() => calculateEstimatedCost(settings), [settings]);

    return (
        <div className="space-y-6">
            <Card title="Base Generation Parameters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">AI Model</label>
                        <select
                            value={settings.model}
                            onChange={e => onSettingsChange({ model: e.target.value as VideoModel })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="veo-3.1-fast-generate-preview">Veo 2.0 (High Quality)</option>
                            <option value="imagen-video-3-hq">Imagen Video 3 (Creative)</option>
                            <option value="lumiere-hd-001">Lumiere HD (Realistic)</option>
                            <option value="phoenix-v1-fast">Phoenix v1 (Fast Draft)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
                        <select
                            value={settings.aspectRatio}
                            onChange={e => onSettingsChange({ aspectRatio: e.target.value as AspectRatio })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="16:9">16:9 (Widescreen)</option>
                            <option value="9:16">9:16 (Vertical)</option>
                            <option value="1:1">1:1 (Square)</option>
                            <option value="4:5">4:5 (Portrait)</option>
                            <option value="21:9">21:9 (Cinematic)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Duration (s): {settings.duration}</label>
                        <input
                            type="range"
                            min="2"
                            max="60"
                            step="1"
                            value={settings.duration}
                            onChange={e => onSettingsChange({ duration: parseInt(e.target.value, 10) })}
                            disabled={isGenerating}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Seed</label>
                        <div className="flex">
                            <input
                                type="number"
                                value={settings.seed === -1 ? '' : settings.seed}
                                onChange={e => onSettingsChange({ seed: parseInt(e.target.value, 10) || -1 })}
                                placeholder="Random"
                                disabled={isGenerating}
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-l-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button onClick={() => onSettingsChange({ seed: -1 })} className="bg-gray-600 hover:bg-gray-500 p-2 rounded-r-lg text-sm text-white disabled:opacity-50" disabled={isGenerating}>🎲 Random</button>
                        </div>
                    </div>
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
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Negative Prompt</label>
                        <input
                            type="text"
                            value={settings.negativePrompt}
                            onChange={e => onSettingsChange({ negativePrompt: e.target.value })}
                            placeholder="e.g., blurry, text, watermark, ugly, low quality, static"
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="col-span-full">
                        <label className="flex items-center space-x-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={settings.highFidelity}
                                onChange={e => onSettingsChange({ highFidelity: e.target.checked })}
                                disabled={isGenerating}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>High Fidelity Mode (Slower, significantly higher quality)</span>
                        </label>
                    </div>
                </div>
            </Card>

            <Card title="Audio Settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Background Music</label>
                        <select
                            value={settings.backgroundMusicGenre}
                            onChange={e => onSettingsChange({ backgroundMusicGenre: e.target.value as GenerationSettings['backgroundMusicGenre'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="none">None</option>
                            <option value="ambient">Ambient</option>
                            <option value="cinematic">Cinematic</option>
                            <option value="upbeat">Upbeat</option>
                            <option value="dramatic">Dramatic</option>
                            <option value="electronic">Electronic</option>
                            <option value="classical">Classical</option>
                            <option value="rock">Rock</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Music Volume: {settings.backgroundMusicVolume}%</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={settings.backgroundMusicVolume}
                            onChange={e => onSettingsChange({ backgroundMusicVolume: parseInt(e.target.value, 10) })}
                            disabled={isGenerating || settings.backgroundMusicGenre === 'none'}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sound Effects</label>
                        <select
                            value={settings.soundEffectsType}
                            onChange={e => onSettingsChange({ soundEffectsType: e.target.value as GenerationSettings['soundEffectsType'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="none">None</option>
                            <option value="whoosh">Whoosh</option>
                            <option value="explosion">Explosion</option>
                            <option value="magic">Magic</option>
                            <option value="interface">Interface Sounds</option>
                            <option value="nature">Nature</option>
                            <option value="urban">Urban</option>
                            <option value="animals">Animals</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">SFX Volume: {settings.soundEffectsVolume}%</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={settings.soundEffectsVolume}
                            onChange={e => onSettingsChange({ soundEffectsVolume: parseInt(e.target.value, 10) })}
                            disabled={isGenerating || settings.soundEffectsType === 'none'}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="col-span-full">
                        <label className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                            <input
                                type="checkbox"
                                checked={settings.voiceoverEnabled}
                                onChange={e => onSettingsChange({ voiceoverEnabled: e.target.checked })}
                                disabled={isGenerating}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>Enable AI Voiceover</span>
                        </label>
                        {settings.voiceoverEnabled && (
                            <div className="space-y-3 pt-2 border-t border-gray-700 mt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Voiceover Prompt</label>
                                    <textarea
                                        value={settings.voiceoverPrompt}
                                        onChange={e => onSettingsChange({ voiceoverPrompt: e.target.value })}
                                        placeholder="Enter the text for AI voiceover..."
                                        disabled={isGenerating}
                                        rows={3}
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">AI Voice Model</label>
                                    <select
                                        value={settings.aiVoiceModel}
                                        onChange={e => onSettingsChange({ aiVoiceModel: e.target.value as GenerationSettings['aiVoiceModel'] })}
                                        disabled={isGenerating}
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="standard-male">Standard Male</option>
                                        <option value="standard-female">Standard Female</option>
                                        <option value="premium-male">Premium Male</option>
                                        <option value="premium-female">Premium Female</option>
                                        <option value="child-male">Child Male</option>
                                        <option value="child-female">Child Female</option>
                                        <option value="robotic">Robotic</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Custom Audio Upload</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                accept="audio/*"
                                ref={fileInputRefAudio}
                                onChange={(e) => handleFileUpload(e, 'audio')}
                                className="hidden"
                                disabled={isGenerating}
                            />
                            <button
                                onClick={() => fileInputRefAudio.current?.click()}
                                disabled={isGenerating}
                                className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                                {settings.customAudioUploadUrl ? 'Change Audio' : 'Upload Audio File'}
                            </button>
                            {settings.customAudioUploadUrl && (
                                <span className="text-sm text-gray-400 truncate flex-grow">
                                    {settings.customAudioFileName || 'Uploaded Audio'}
                                    <button onClick={() => handleClearFile('audio')} disabled={isGenerating} className="ml-2 text-red-400 hover:text-red-500 text-xs">x</button>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Visual Enhancements">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Color Grading Preset</label>
                        <select
                            value={settings.colorGradePreset}
                            onChange={e => onSettingsChange({ colorGradePreset: e.target.value as GenerationSettings['colorGradePreset'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="none">None</option>
                            <option value="cinematic">Cinematic</option>
                            <option value="vibrant">Vibrant</option>
                            <option value="monochrome">Monochrome</option>
                            <option value="retro">Retro</option>
                            <option value="warm">Warm Tones</option>
                            <option value="cool">Cool Tones</option>
                            <option value="sepia">Sepia</option>
                        </select>
                    </div>
                    {/* Basic Adjustments */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Brightness: {settings.brightness}</label>
                        <input type="range" min="-100" max="100" value={settings.brightness} onChange={e => onSettingsChange({ brightness: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Contrast: {settings.contrast}</label>
                        <input type="range" min="-100" max="100" value={settings.contrast} onChange={e => onSettingsChange({ contrast: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Saturation: {settings.saturation}</label>
                        <input type="range" min="-100" max="100" value={settings.saturation} onChange={e => onSettingsChange({ saturation: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Exposure: {settings.exposure}</label>
                        <input type="range" min="-100" max="100" value={settings.exposure} onChange={e => onSettingsChange({ exposure: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Highlights: {settings.highlights}</label>
                        <input type="range" min="-100" max="100" value={settings.highlights} onChange={e => onSettingsChange({ highlights: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Shadows: {settings.shadows}</label>
                        <input type="range" min="-100" max="100" value={settings.shadows} onChange={e => onSettingsChange({ shadows: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    {/* Advanced Effects */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Vignette Strength: {settings.vignetteStrength}%</label>
                        <input type="range" min="0" max="100" value={settings.vignetteStrength} onChange={e => onSettingsChange({ vignetteStrength: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Grain Amount: {settings.grainAmount}%</label>
                        <input type="range" min="0" max="100" value={settings.grainAmount} onChange={e => onSettingsChange({ grainAmount: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Blur Amount: {settings.blurAmount}%</label>
                        <input type="range" min="0" max="100" value={settings.blurAmount} onChange={e => onSettingsChange({ blurAmount: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sharpen Amount: {settings.sharpenAmount}%</label>
                        <input type="range" min="0" max="100" value={settings.sharpenAmount} onChange={e => onSettingsChange({ sharpenAmount: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Chromatic Aberration: {settings.chromaticAberration}%</label>
                        <input type="range" min="0" max="100" value={settings.chromaticAberration} onChange={e => onSettingsChange({ chromaticAberration: parseInt(e.target.value, 10) })} disabled={isGenerating} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div className="col-span-full">
                         <label className="flex items-center space-x-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={settings.filmGrainEnabled}
                                onChange={e => onSettingsChange({ filmGrainEnabled: e.target.checked })}
                                disabled={isGenerating}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>Enable Film Grain Overlay</span>
                        </label>
                    </div>
                </div>
            </Card>

            <Card title="Output & Performance">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Quality Preset</label>
                        <select
                            value={settings.qualityPreset}
                            onChange={e => onSettingsChange({ qualityPreset: e.target.value as GenerationSettings['qualityPreset'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="draft">Draft (Fast, Low Quality)</option>
                            <option value="standard">Standard (Balanced Quality)</option>
                            <option value="high">High (Good Quality, Longer)</option>
                            <option value="premium">Premium (Excellent Quality, Very Long)</option>
                            <option value="ultra">Ultra (Best Quality, Extremely Long)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Output Resolution</label>
                        <select
                            value={settings.outputResolution}
                            onChange={e => onSettingsChange({ outputResolution: e.target.value as GenerationSettings['outputResolution'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="720p">720p (HD)</option>
                            <option value="1080p">1080p (Full HD)</option>
                            <option value="2k">2K</option>
                            <option value="4k">4K (UHD)</option>
                            <option value="8k">8K</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Frame Rate</label>
                        <select
                            value={settings.frameRate}
                            onChange={e => onSettingsChange({ frameRate: parseInt(e.target.value, 10) as GenerationSettings['frameRate'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value={24}>24 fps (Cinematic)</option>
                            <option value={30}>30 fps (Standard)</option>
                            <option value={60}>60 fps (Smooth)</option>
                            <option value={120}>120 fps (Ultra Smooth)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Output Codec</label>
                        <select
                            value={settings.outputCodec}
                            onChange={e => onSettingsChange({ outputCodec: e.target.value as GenerationSettings['outputCodec'] })}
                            disabled={isGenerating}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="h264">H.264 (MP4)</option>
                            <option value="vp9">VP9 (WebM)</option>
                            <option value="hevc">HEVC (H.265)</option>
                            <option value="av1">AV1</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Target Bitrate (Mbps): {settings.bitrateMbps}</label>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            value={settings.bitrateMbps}
                            onChange={e => onSettingsChange({ bitrateMbps: parseInt(e.target.value, 10) })}
                            disabled={isGenerating}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>
            </Card>

            <Card title="Reference Media">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Reference Image (Style/Content)</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRefImage}
                                onChange={(e) => handleFileUpload(e, 'image')}
                                className="hidden"
                                disabled={isGenerating}
                            />
                            <button
                                onClick={() => fileInputRefImage.current?.click()}
                                disabled={isGenerating}
                                className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                                {settings.imageReferenceUrl ? 'Change Image' : 'Upload Image'}
                            </button>
                            {settings.imageReferenceUrl && (
                                <span className="text-sm text-gray-400 truncate flex-grow">
                                    {settings.imageReferenceFileName || 'Uploaded Image'}
                                    <button onClick={() => handleClearFile('image')} disabled={isGenerating} className="ml-2 text-red-400 hover:text-red-500 text-xs">x</button>
                                </span>
                            )}
                        </div>
                        {settings.imageReferenceUrl && <img src={settings.imageReferenceUrl} alt="Reference" className="w-24 h-24 object-cover rounded-md mt-2" />}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Reference Video (Motion/Composition)</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                accept="video/*"
                                ref={fileInputRefVideo}
                                onChange={(e) => handleFileUpload(e, 'video')}
                                className="hidden"
                                disabled={isGenerating}
                            />
                            <button
                                onClick={() => fileInputRefVideo.current?.click()}
                                disabled={isGenerating}
                                className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                                {settings.videoReferenceUrl ? 'Change Video' : 'Upload Video'}
                            </button>
                            {settings.videoReferenceUrl && (
                                <span className="text-sm text-gray-400 truncate flex-grow">
                                    {settings.videoReferenceFileName || 'Uploaded Video'}
                                    <button onClick={() => handleClearFile('video')} disabled={isGenerating} className="ml-2 text-red-400 hover:text-red-500 text-xs">x</button>
                                </span>
                            )}
                        </div>
                        {settings.videoReferenceUrl && <video src={settings.videoReferenceUrl} controls muted loop className="w-32 h-24 object-cover rounded-md mt-2" />}
                    </div>

                    {(settings.imageReferenceUrl || settings.videoReferenceUrl) && (
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Reference Influence: {settings.referenceInfluence}%</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={settings.referenceInfluence}
                                onChange={e => onSettingsChange({ referenceInfluence: parseInt(e.target.value, 10) })}
                                disabled={isGenerating}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Adjust how strongly the AI should adhere to the uploaded reference(s).</p>
                        </div>
                    )}
                </div>
            </Card>

            <Card title="Preset Management">
                <div className="space-y-4">
                    <div className="flex">
                        <input
                            type="text"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder="Name for new preset..."
                            className="flex-grow bg-gray-700/50 border border-gray-600 rounded-l-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            disabled={isGenerating}
                        />
                        <button onClick={handleSavePreset} disabled={isGenerating || !newPresetName.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-r-lg text-sm disabled:opacity-50">
                            Save Current Settings
                        </button>
                    </div>
                    <h4 className="text-md font-semibold text-gray-300 mt-4">Saved Presets</h4>
                    {savedPresets.length === 0 ? (
                        <p className="text-gray-500 text-sm">No presets saved yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {savedPresets.map(preset => (
                                <li key={preset.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md">
                                    <span className="text-sm text-gray-300">{preset.name}</span>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleLoadPreset(preset.id)} disabled={isGenerating} className="py-1 px-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-xs disabled:opacity-50">Load</button>
                                        <button onClick={() => handleDeletePreset(preset.id)} disabled={isGenerating} className="py-1 px-3 bg-red-700 hover:bg-red-600 text-white rounded-md text-xs disabled:opacity-50">Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Card>

            <Card title="Estimated Generation Cost">
                <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-gray-300">Total Estimate:</span>
                    <span className="text-cyan-400">${estimatedCost.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    This is an estimate based on your selected parameters (duration, quality, resolution, etc.).
                    Actual costs may vary.
                </p>
                <ul className="text-xs text-gray-500 space-y-1 mt-4 border-t border-gray-700 pt-3">
                    <li>- Base cost per second varies by Quality Preset.</li>
                    <li>- Higher resolutions (e.g., 4K, 8K) incur significant multipliers.</li>
                    <li>- High Fidelity mode adds 30% to base cost.</li>
                    <li>- Voiceover adds a small per-second fee.</li>
                    <li>- Reference uploads and higher influence add incremental costs.</li>
                </ul>
            </Card>
        </div>
    );
};