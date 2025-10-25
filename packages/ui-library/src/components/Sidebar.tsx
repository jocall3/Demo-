import React, { ReactElement, ReactNode } from 'react';

/**
 * @interface NavItem
 * @description Defines the structure for a single navigation item to be displayed in the Sidebar.
 * This structure is passed via props, decoupling the Sidebar from the application's specific routing structure.
 */
export interface NavItem {
  /**
   * A unique identifier for the navigation item, typically corresponding to a view or route name.
   * @type {string}
   */
  id: string;
  /**
   * The user-facing text label for the navigation link.
   * @type {string}
   */
  label: string;
  /**
   * The icon component to display next to the label.
   * @type {ReactElement}
   */
  icon: ReactElement;
}

/**
 * @interface SidebarProps
 * @description Props for the shared Sidebar component. It is designed to be a controlled, presentational
 * component, with its state and navigation logic managed by a parent component (e.g., the Shell application).
 */
export interface SidebarProps {
  /**
   * The unique ID of the currently active navigation item. Used for highlighting the active link.
   * @type {string}
   */
  activeItemId: string;
  /**
   * An array of navigation items to be rendered in the sidebar.
   * @type {NavItem[]}
   */
  navItems: NavItem[];
  /**
   * Callback function that is invoked when a navigation item is clicked.
   * It receives the ID of the clicked item.
   * @param {string} itemId - The ID of the navigation item that was clicked.
   * @returns {void}
   */
  onNavigate: (itemId: string) => void;
  /**
   * Controls the visibility of the sidebar on mobile devices. `true` to show, `false` to hide.
   * @type {boolean}
   */
  isOpen: boolean;
  /**
   * Callback function that is invoked when the sidebar needs to be closed,
   * for example, by clicking the overlay or a navigation link on mobile.
   * @returns {void}
   */
  onClose: () => void;
  /**
   * An optional React node for the application's logo, displayed at the top of the sidebar.
   * @type {ReactNode}
   * @optional
   */
  logo?: ReactNode;
  /**
   * The name of the application, displayed next to the logo.
   * @type {string}
   * @optional
   */
  appName?: string;
}

/**
 * Renders the primary navigation sidebar for the application.
 *
 * This component is a core part of the shell layout in the Micro-Frontend architecture. It is a stateful,
 * controlled component that receives its navigation structure (`navItems`) and active state (`activeItemId`)
 * via props. It is responsible for rendering the navigation links and handling user interactions by
 * invoking callback props (`onNavigate`, `onClose`).
 *
 * It is fully responsive, displaying as a fixed-left sidebar on larger screens and a slide-out drawer
 * on smaller screens.
 *
 * @param {SidebarProps} props - The properties to configure the Sidebar.
 * @returns {ReactElement} The rendered Sidebar component.
 */
const Sidebar: React.FC<SidebarProps> = ({
  activeItemId,
  navItems,
  onNavigate,
  isOpen,
  onClose,
  logo,
  appName = 'Demo Bank',
}) => {
  /**
   * Handles the click event on a navigation item.
   * It calls the onNavigate callback with the item's ID and then calls the onClose callback
   * to ensure the sidebar closes on mobile after a selection is made.
   *
   * @param {string} itemId - The ID of the clicked navigation item.
   */
  const handleNavClick = (itemId: string) => {
    onNavigate(itemId);
    onClose();
  };

  return (
    <>
      {/* 
        Overlay for mobile view. It becomes visible when the sidebar is open on smaller screens
        and closes the sidebar when clicked.
      */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Sidebar Container */}
      <aside
        className={`flex flex-col w-64 bg-gray-900/50 backdrop-blur-lg border-r border-gray-700/50 fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-20 border-b border-gray-700/50 px-6">
          <div className="flex items-center space-x-3 text-cyan-400">
            {logo}
            <span className="font-bold text-lg text-white tracking-wider">{appName}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 lg:hidden" aria-label="Close navigation menu">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`} // Use href for semantic correctness, though navigation is handled by onClick.
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className={`flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 transition-all duration-200 transform rounded-md hover:bg-gray-700/50 hover:text-white ${
                  activeItemId === item.id
                    ? 'bg-cyan-500/10 text-cyan-300 border-l-4 border-cyan-400 font-semibold pl-3'
                    : 'border-l-4 border-transparent'
                }`}
                aria-current={activeItemId === item.id ? 'page' : undefined}
              >
                <span className="w-6 h-6">{item.icon}</span>
                <span className="mx-4">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
