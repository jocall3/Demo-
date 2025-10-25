/**
 * @file components/Sidebar.tsx
 * @description The primary navigation sidebar for the application shell.
 *
 * ARCHITECTURAL NOTE:
 * This component is a core part of the Micro-Frontend (MFE) Shell application. It is responsible for the main
 * navigation layout and triggers view changes within the shell. The state it depends on (activeView, isOpen)
 * is managed globally (e.g., via Redux in the shell's root) and passed down as props, adhering to the
 * client-state management directive. It has been refactored for improved accessibility and documentation.
 */

import React from 'react';
import { View } from '../types';
import { NAV_ITEMS } from '../constants';

/**
 * @interface SidebarProps
 * @description Defines the properties required by the Sidebar component.
 */
interface SidebarProps {
  /**
   * The currently active view, used to highlight the correct navigation item.
   * @type {View}
   */
  activeView: View;

  /**
   * Callback function to change the active view in the parent component (the shell).
   * @param {View} view - The new view to be set as active.
   * @returns {void}
   */
  setActiveView: (view: View) => void;

  /**
   * Controls the visibility of the sidebar on mobile/tablet viewports.
   * `true` if the sidebar should be visible, `false` otherwise.
   * @type {boolean}
   */
  isOpen: boolean;

  /**
   * Callback function to update the sidebar's visibility state, typically used
   * to close the sidebar after a navigation action or an overlay click.
   * @param {boolean} isOpen - The new visibility state.
   * @returns {void}
   */
  setIsOpen: (isOpen: boolean) => void;
}

/**
 * @component DemoBankLogo
 * @description Renders the SVG logo for Demo Bank. The color is inherited via `currentColor`.
 * @param {object} props - Standard React SVG component props, including `className`.
 * @returns {React.ReactElement} The SVG logo component.
 */
const DemoBankLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" />
    <path d="M30 70V30H55C65 30 65 40 55 40H30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M55 70V30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * @component Sidebar
 * @description The main navigation sidebar for the application. It displays navigation items, highlights the
 * active view, and handles mobile-responsive behavior (sliding in and out).
 *
 * @param {SidebarProps} props - The properties for configuring the Sidebar's state and behavior.
 * @returns {React.ReactElement} The rendered Sidebar component.
 */
const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
  /**
   * @function handleNavClick
   * @description Handles the click event for a navigation item.
   * It sets the new active view and closes the sidebar on mobile.
   * @param {View} view - The view associated with the clicked navigation item.
   */
  const handleNavClick = (view: View) => {
    setActiveView(view);
    setIsOpen(false); // Ensure sidebar closes on navigation in mobile view
  };

  return (
    <>
      {/* Mobile Overlay: A semi-transparent background that appears behind the sidebar on smaller screens. */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Main Sidebar Container */}
      <aside
        className={`flex flex-col w-64 bg-gray-900/50 backdrop-blur-lg border-r border-gray-700/50 fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-20 border-b border-gray-700/50 px-6 flex-shrink-0">
          <div className="flex items-center space-x-2 text-cyan-400">
            <DemoBankLogo className="h-10 w-10" />
            <span className="font-bold text-lg text-white">Demo Bank</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 lg:hidden" aria-label="Close navigation menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-2" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center px-4 py-2 text-gray-300 transition-colors duration-200 transform rounded-md hover:bg-gray-700/50 hover:text-white ${
                  activeView === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-l-4 border-cyan-400 font-semibold'
                    : 'font-medium'
                }`}
              >
                {item.icon}
                <span className="mx-4">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
