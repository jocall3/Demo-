/**
 * @file components/ImpactTracker.tsx
 * @description Displays a user's positive environmental impact based on their financial activity.
 *
 * @architecturalNote
 * This component has been refactored to be purely presentational. It no longer fetches its own
 * data via the deprecated `DataContext`. Instead, it receives `treesPlanted` and `progress`
 * as props from its parent component (e.g., `Dashboard`), which is responsible for fetching this
 * server state using TanStack Query hooks. This aligns with the new frontend architecture of
 * separating server state management from UI components and mandating comprehensive TSDoc.
 */

import React from 'react';
import Card from './Card';

/**
 * @interface ImpactTrackerProps
 * @description Defines the props required by the ImpactTracker component.
 */
interface ImpactTrackerProps {
  /**
   * The total number of trees planted as a result of the user's activity.
   * @type {number}
   */
  treesPlanted: number;
  /**
   * The percentage progress (0-100) towards planting the next tree.
   * @type {number}
   */
  progress: number;
}

/**
 * @component TreeIcon
 * @description A presentational SVG component for rendering the tree icon.
 * @returns {React.ReactElement} The SVG tree icon.
 */
const TreeIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 17.5l4-4 4 4M4.5 21.5h15M12 5.5v12m0 0l-4-4m4 4l4-4" />
  </svg>
);

/**
 * @component ImpactTracker
 * @description A card component that visually represents a user's "Green Impact" by displaying the
 * number of trees planted and the progress towards planting the next one.
 * @param {ImpactTrackerProps} props The component's props.
 * @param {number} props.treesPlanted The total number of trees planted.
 * @param {number} props.progress The percentage progress to the next tree.
 * @returns {React.ReactElement} A Card component displaying the impact metrics.
 */
const ImpactTracker: React.FC<ImpactTrackerProps> = ({ treesPlanted, progress }) => {
  return (
    <Card title="Our Green Impact" className="h-full">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <TreeIcon />
        <p className="text-5xl font-bold text-white mt-4" aria-label={`${treesPlanted} trees planted`}>{treesPlanted}</p>
        <p className="text-gray-400 mt-1">Trees Planted</p>
        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-6" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to next tree`}>
            <div 
              className="bg-gradient-to-r from-green-400 to-cyan-500 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{progress.toFixed(0)}% to the next tree</p>
      </div>
    </Card>
  );
};

export default ImpactTracker;
