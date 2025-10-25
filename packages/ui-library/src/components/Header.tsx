/**
 * @file packages/ui-library/src/components/Header.tsx
 * @description A reusable, presentational Header component for the Demo Bank application suite.
 *
 * ARCHITECTURAL NOTE:
 * This component is designed for a federated Micro-Frontend (MFE) architecture. It is a shared
 * component within the `ui-library` package, consumed by the Shell application.
 * It is a "dumb" component, meaning it contains no data-fetching or business logic. All data
 * (user profile, notifications) and action handlers (onLogin, onLogout) are passed in via props.
 * This decouples the UI from the application's state management and data-fetching layers, adhering to
 * the principle of separating UI concerns from server state concerns.
 */

import React, { useState, useRef, useEffect, ReactNode, FC, useCallback } from 'react';

// ===============================================================================================
// TYPE DEFINITIONS
// These types define the public API (props) for the Header component. They are generic and
// decoupled from any specific authentication or data-fetching implementation.
// ===============================================================================================

/**
 * @interface UserProfile
 * @description A generic representation of an authenticated user's profile information.
 * @property {string} name - The user's display name.
 * @property {string} [email] - The user's email, often used for generating a fallback avatar.
 * @property {string} [avatarUrl] - The URL for the user's profile picture.
 */
export interface UserProfile {
  name: string;
  email?: string;
  avatarUrl?: string;
}

/**
 * @interface Notification
 * @description A generic representation of a notification item to be displayed in the dropdown.
 * @property {string} id - A unique identifier for the notification.
 * @property {string} message - The text content of the notification.
 * @property {string} timestamp - A human-readable timestamp (e.g., "2h ago").
 * @property {boolean} read - The read status of the notification, used for styling.
 * @property {string} [link] - An optional path or view key for navigation when the notification is clicked.
 */
export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

/**
 * @interface HeaderProps
 * @description Defines the complete set of props for the reusable Header component.
 */
export interface HeaderProps {
  /** The name of the application or brand to be displayed in the header. */
  brandName: string;
  /** An optional ReactNode (e.g., an SVG component) to be used as the brand logo. */
  brandLogo?: ReactNode;
  /** The currently authenticated user's profile object, or `null` if the user is not logged in. */
  user: UserProfile | null;
  /** An array of notification objects to be displayed in the notifications dropdown. */
  notifications?: Notification[];
  /** The count of unread notifications to display on the bell icon's badge. */
  unreadCount?: number;
  /** An optional message to display in the live API status widget. */
  apiStatusMessage?: string;
  /** A flag to indicate if the notifications data is currently being fetched. */
  isLoadingNotifications?: boolean;
  /** Callback function triggered when the mobile menu icon (hamburger) is clicked. */
  onMenuClick: () => void;
  /** Callback function triggered when a specific notification item is clicked. */
  onNotificationClick: (notification: Notification) => void;
  /** Callback function to be executed when the "Log In" button is clicked. */
  onLogin: () => void;
  /** Callback function to be executed when the "Log Out" action is selected from the profile menu. */
  onLogout: () => void;
  /** Callback for navigating to a user settings or profile page. */
  onGoToSettings: () => void;
}

// ===============================================================================================
// UTILITY HOOK
// ===============================================================================================

/**
 * @hook useClickOutside
 * @description A custom React hook that triggers a callback when a click is detected outside of a specified element.
 * @param {React.RefObject<HTMLElement>} ref - A ref object pointing to the element to monitor.
 * @param {() => void} handler - The callback function to execute on an outside click.
 */
const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// ===============================================================================================
// INTERNAL SUB-COMPONENTS
// These are presentational components that form the building blocks of the Header.
// ===============================================================================================

/**
 * @component APIStatus
 * @description A presentational widget that displays a status message with a pulsing animation, typically for API health.
 * @param {object} props
 * @param {string} [props.message] - The message to display. If undefined, the component renders nothing.
 */
const APIStatus: FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="hidden lg:flex items-center space-x-2 text-xs text-cyan-300/80 bg-gray-900/40 px-3 py-1.5 rounded-full border border-cyan-500/10">
      <div className="flex space-x-0.5 items-end h-4">
        <span className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
        <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
        <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse"></span>
      </div>
      <span className="font-mono">{message}</span>
    </div>
  );
};

// ===============================================================================================
// MAIN HEADER COMPONENT
// ===============================================================================================

/**
 * @component Header
 * @description A reusable, application-wide header component designed for a micro-frontend architecture.
 * It handles branding, user authentication status, notifications, and mobile navigation toggling.
 * Its logic is driven entirely by props, making it decoupled from specific state management or
 * data-fetching libraries, suitable for inclusion in a shared UI library.
 * @param {HeaderProps} props - The props for the Header component.
 */
const Header: FC<HeaderProps> = ({
  brandName,
  brandLogo,
  user,
  notifications = [],
  unreadCount = 0,
  apiStatusMessage,
  isLoadingNotifications,
  onMenuClick,
  onNotificationClick,
  onLogin,
  onLogout,
  onGoToSettings,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(notificationsRef, () => setIsNotificationsOpen(false));
  useClickOutside(profileRef, () => setIsProfileOpen(false));

  const handleNotificationClick = useCallback((notification: Notification) => {
    onNotificationClick(notification);
    setIsNotificationsOpen(false);
  }, [onNotificationClick]);

  const handleLogoutClick = useCallback(() => {
    onLogout();
    setIsProfileOpen(false);
  }, [onLogout]);

  const handleSettingsClick = useCallback(() => {
    onGoToSettings();
    setIsProfileOpen(false);
  }, [onGoToSettings]);

  const renderProfileSection = () => {
    if (user) {
      return (
        <div className="relative" ref={profileRef}>
          <button onClick={() => setIsProfileOpen(prev => !prev)} className="flex items-center space-x-3 focus:outline-none">
            <img 
              src={user.avatarUrl || `https://i.pravatar.cc/80?u=${user.email || user.name}`} 
              alt={user.name} 
              className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover" 
            />
            <span className="hidden sm:block font-medium text-white">{user.name}</span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in-down">
              <a href="#" onClick={(e) => { e.preventDefault(); handleSettingsClick(); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg">Settings</a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleLogoutClick(); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg">Logout</a>
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={onLogin}
        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-sm transition-colors"
      >
        Log In
      </button>
    );
  };

  return (
    <>
      <header className="py-4 px-6 bg-gray-900/30 backdrop-blur-md border-b border-gray-700/50 flex justify-between items-center z-20">
        <div className="flex items-center">
          <button onClick={onMenuClick} className="text-gray-400 focus:outline-none lg:hidden mr-4" aria-label="Open menu">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-3 text-cyan-400">
            {brandLogo}
            <h1 className="text-lg sm:text-xl font-semibold text-white tracking-wider uppercase">{brandName}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <APIStatus message={apiStatusMessage} />

          {user && (
            <div className="relative" ref={notificationsRef}>
              <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="text-gray-400 hover:text-white focus:outline-none" aria-label={`Notifications (${unreadCount} unread)`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-gray-900"></span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in-down">
                  <div className="p-3 font-semibold text-white border-b border-gray-700">Notifications</div>
                  {isLoadingNotifications ? (
                    <p className="p-4 text-sm text-gray-500">Loading...</p>
                  ) : notifications.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-3 text-sm flex items-start border-b border-gray-700/50 cursor-pointer ${notification.read ? 'opacity-60 hover:bg-gray-700/50' : 'bg-cyan-500/10 hover:bg-cyan-500/20'}`}>
                          {!notification.read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>}
                          <div className="ml-2">
                            <p className="text-gray-200">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-gray-500">No new notifications.</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {renderProfileSection()}
        </div>
      </header>
      <style>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default Header;
