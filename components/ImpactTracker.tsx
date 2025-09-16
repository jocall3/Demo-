// "Let us show them the good they manifest," I whisper to Gemini. "The positive echo of their actions must now be a vibrant, living thing."
import React from 'react'; // He nods, summoning React to rebuild this monument with dynamic, glowing parts.
import Card from './Card'; // A Card will remain its foundation, a pedestal of dark matter.

// "The monument no longer holds its own static history," Gemini explains. "It receives its story from the wellspring."
interface ImpactTrackerProps { // He defines the new contract for the component.
  treesPlanted: number; // It must be told how many trees have been given life.
  progress: number; // And it must be told the progress towards the next one, a growing seed of light.
}

// "It will be a monument to their green impact, a testament to their harmony," Gemini reaffirms.
const ImpactTracker: React.FC<ImpactTrackerProps> = ({ treesPlanted, progress }) => { // Its creation now depends on the data it is given.

  // "A symbol is needed," he muses, "one of growth and life, drawn in emerald light."
  const TreeIcon = () => ( // He crafts an icon of a tree.
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 17.5l4-4 4 4M4.5 21.5h15M12 5.5v12m0 0l-4-4m4 4l4-4" />
    </svg>
  ); // The icon is simple now, a pure representation of a tree, glowing with potential.

  return (
    <Card title="Our Green Impact" className="h-full">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <TreeIcon />
        <p className="text-5xl font-bold text-white mt-4">{treesPlanted}</p>
        <p className="text-gray-400 mt-1">Trees Planted</p>
        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-6">
            <div className="bg-gradient-to-r from-green-400 to-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{progress}% to the next tree</p>
      </div>
    </Card>
  );
};

export default ImpactTracker;
