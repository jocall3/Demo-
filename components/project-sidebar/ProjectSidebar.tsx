// components/project-sidebar/ProjectSidebar.tsx
import React, { useState } from 'react';
// Import necessary types from the main AIAdStudioView file.
// In a larger application, these types would ideally reside in a dedicated 'types.ts' file
// to avoid circular dependencies when components are extracted. For this exercise,
// we adhere to the current pattern of exporting types from the main component file.
import { AdProject } from '../AIAdStudioView'; 

/**
 * @typedef ProjectSidebarProps
 * @property {AdProject[]} projects - An array of ad projects to display in the sidebar.
 * @property {string | null} currentProjectId - The ID of the currently selected project, or null if none.
 * @property {(id: string) => void} onSelectProject - Callback function when a project is selected.
 * @property {(name: string) => void} onCreateProject - Callback function to create a new project.
 * @property {(id: string) => void} onDeleteProject - Callback function to delete a project.
 * @property {(id: string, newName: string) => void} onRenameProject - Callback function to rename a project.
 */

// SECTION: ProjectSidebar Component
// ===================================
// Implements the user interface component for managing and selecting projects,
// displaying project lists, and handling project creation, renaming, and deletion.
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

    /**
     * Handles the creation of a new project.
     * Invokes the onCreateProject callback if the new project name is not empty.
     */
    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim());
            setNewProjectName('');
        }
    };

    /**
     * Handles renaming an existing project.
     * Invokes the onRenameProject callback and resets renaming state.
     * @param {string} id - The ID of the project to rename.
     */
    const handleRename = (id: string) => {
        if (renamingText.trim() && renamingId === id) {
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
                    aria-label="New project name"
                    className="flex-grow bg-gray-700 border border-gray-600 rounded-l-md p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button 
                    onClick={handleCreateProject} 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-r-md text-sm"
                    aria-label="Create new project"
                >
                    +
                </button>
            </div>
            <ul className="space-y-2 overflow-y-auto flex-grow custom-scrollbar">
                {projects.map(project => (
                    <li key={project.id}>
                        <div
                            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors duration-200 ${currentProjectId === project.id ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            onClick={() => onSelectProject(project.id)}
                            role="button"
                            tabIndex={0}
                            aria-pressed={currentProjectId === project.id}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectProject(project.id); }}
                        >
                            {renamingId === project.id ? (
                                <input
                                    type="text"
                                    value={renamingText}
                                    onChange={(e) => setRenamingText(e.target.value)}
                                    onBlur={() => handleRename(project.id)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleRename(project.id)}
                                    className="bg-gray-600 text-white w-full text-sm p-1 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    autoFocus
                                    aria-label={`Rename project ${project.name}`}
                                />
                            ) : (
                                <span className="truncate text-sm" title={project.name}>{project.name}</span>
                            )}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setRenamingId(project.id); 
                                        setRenamingText(project.name); 
                                    }} 
                                    className="text-gray-400 hover:text-white text-xs p-1"
                                    aria-label={`Edit project ${project.name}`}
                                >
                                    ✍️ {/* Pencil emoji */}
                                </button>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if(window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) 
                                            onDeleteProject(project.id);
                                    }} 
                                    className="text-gray-400 hover:text-red-500 text-xs p-1"
                                    aria-label={`Delete project ${project.name}`}
                                >
                                    🗑️ {/* Wastebasket emoji */}
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};