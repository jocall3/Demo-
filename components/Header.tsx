import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Notification } from '../types';
import { useAuth0 } from '@auth0/auth0-react';
import { gql, useQuery, useMutation } from '@apollo/client';

// ===============================================================================================
// GRAPHQL QUERIES & MUTATIONS
// These are co-located for simplicity but would be in a dedicated API directory in a larger project.
// ===============================================================================================

/**
 * @const GET_HEADER_DATA
 * @description GraphQL query to fetch data required by the header, such as user notifications.
 * This query targets the `userData` type in the supergraph, which aggregates data from various subgraphs.
 * @document
 * query GetHeaderData {
 *   userData {
 *     notifications {
 *       id
 *       message
 *       timestamp
 *       read
 *       view
 *     }
 *   }
 * }
 */
const GET_HEADER_DATA = gql`
  query GetHeaderData {
    userData {
      notifications {
        id
        message
        timestamp
        read
        view
      }
    }
  }
`;

/**
 * @const MARK_NOTIFICATION_AS_READ_MUTATION
 * @description GraphQL mutation to mark a single notification as read on the backend.
 * It takes a `notificationId` as input and is expected to return a boolean indicating success.
 * @document
 * mutation MarkNotificationAsRead($notificationId: ID!) {
 *   markNotificationAsRead(id: $notificationId)
 * }
 */
const MARK_NOTIFICATION_AS_READ_MUTATION = gql`
  mutation MarkNotificationAsRead($notificationId: ID!) {
    markNotificationAsRead(id: $notificationId)
  }
`;

// --- Helper Hook: useClickOutside ---
/**
 * A custom React hook that triggers a callback when a click occurs outside of the specified element.
 *
 * @param {React.RefObject<HTMLElement>} ref - A React ref object attached to the element to monitor for outside clicks.
 * @param {() => void} handler - The callback function to execute when a click outside the element is detected.
 */
const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
    useEffect(() => {
        /**
         * @description Event listener that checks if the clicked target is outside the ref's current element.
         * @param {MouseEvent | TouchEvent} event - The mouse or touch event.
         */
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

/**
 * A purely presentational component that displays a simulated real-time status
 * of a background AI service ("Heuristic API"). It cycles through a predefined
 * list of status messages to create a dynamic, "live" feel in the application header.
 *
 * @returns {React.ReactElement} A styled div containing the animated status indicator and text.
 */
const HeuristicAPIStatus: React.FC = () => {
    const messages = [
        "Heuristic API: Actively analyzing portfolio...",
        "Heuristic API: Monitoring market data...",
        "Heuristic API: Identified 2 potential savings...",
        "Heuristic API: All systems nominal.",
        "Heuristic API: Cross-referencing spending patterns...",
        "Heuristic API: Compiling weekly insights..."
    ];

    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="hidden lg:flex items-center space-x-2 text-xs text-cyan-300/80 bg-gray-900/40 px-3 py-1.5 rounded-full border border-cyan-500/10 transition-all duration-500">
            <div className="flex space-x-0.5 items-end h-4">
                <span className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse"></span>
                <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
            </div>
            <span className="font-mono">{messages[currentMessageIndex]}</span>
        </div>
    );
};

/**
 * @interface HeaderProps
 * @description Defines the properties for the main `Header` component.
 */
interface HeaderProps {
    /**
     * @property
     * @description A callback function to be invoked when the hamburger menu icon is clicked.
     * This is typically used on mobile views to toggle the visibility of the main sidebar.
     * @type {() => void}
     */
    onMenuClick: () => void;
    /**
     * @property
     * @description A callback function to set the active view of the application.
     * Used for navigation, for example, when a user clicks a notification that links to a specific view.
     * @param {View} view - The view to navigate to, based on the `View` enum.
     * @type {(view: View) => void}
     */
    setActiveView: (view: View) => void;
}

/**
 * The main application header component for the Micro-Frontend Shell.
 *
 * @component
 * @description This component is responsible for rendering the top navigation bar. It handles
 * several key global functionalities:
 * - **Authentication**: Integrates with `useAuth0` to display user information, a login button for unauthenticated users, and a profile dropdown with a logout option for authenticated users.
 * - **Notifications**: Fetches and displays user notifications using an Apollo Client GraphQL query. It shows an unread indicator and allows users to mark notifications as read via a mutation.
 * - **Navigation**: Provides triggers for opening the mobile sidebar (`onMenuClick`) and navigating to specific views based on user actions (e.g., clicking a notification).
 * - **UI State**: Manages local UI state for dropdown visibility (notifications, profile) using `useState` and the `useClickOutside` hook.
 *
 * @param {HeaderProps} props - The props for the Header component.
 * @returns {React.ReactElement} The rendered header element.
 */
const Header: React.FC<HeaderProps> = ({ onMenuClick, setActiveView }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    
    const notificationsRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    
    useClickOutside(notificationsRef, () => setIsNotificationsOpen(false));
    useClickOutside(profileRef, () => setIsProfileOpen(false));

    // --- AUTH0 INTEGRATION ---
    const { user, isAuthenticated, isLoading, loginWithRedirect, logout } = useAuth0();

    // --- APOLLO CLIENT FOR NOTIFICATIONS ---
    const { data, loading: notificationsLoading, error: notificationsError } = useQuery(GET_HEADER_DATA);
    const notifications = data?.userData?.notifications || [];
    const unreadCount = notifications.filter((n: Notification) => !n.read).length;

    const [markAsReadMutation] = useMutation(MARK_NOTIFICATION_AS_READ_MUTATION, {
        refetchQueries: [{ query: GET_HEADER_DATA }],
    });

    const handleNotificationClick = useCallback((notification: Notification) => {
        if (notification.view) {
            setActiveView(notification.view as View);
        }
        if (!notification.read) {
            markAsReadMutation({ variables: { notificationId: notification.id } });
        }
        setIsNotificationsOpen(false);
    }, [setActiveView, markAsReadMutation]);

    const handleLogout = useCallback(() => {
        logout({ logoutParams: { returnTo: window.location.origin } });
        setIsProfileOpen(false);
    }, [logout]);
    
    const renderProfileSection = () => {
        if (isLoading) {
            return (
                <div className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                    <div className="hidden sm:block h-4 w-24 bg-gray-700 rounded-md"></div>
                </div>
            );
        }

        if (isAuthenticated && user) {
            return (
                <div className="relative" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(prev => !prev)} className="flex items-center space-x-3">
                        <img src={user.picture || `https://i.pravatar.cc/80?u=${user.email}`} alt={user.name || 'User'} className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover" />
                        <span className="hidden sm:block font-medium text-white">{user.name || user.email}</span>
                    </button>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                            <a href="#" onClick={(e)=>{e.preventDefault(); setActiveView(View.Settings); setIsProfileOpen(false);}} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Settings</a>
                            <a href="#" onClick={(e)=>{e.preventDefault(); handleLogout();}} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Logout</a>
                        </div>
                    )}
                </div>
            );
        }
        
        return (
            <button
                onClick={() => loginWithRedirect()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
                Log In
            </button>
        );
    };

    return (
        <header className="py-4 px-6 bg-gray-900/30 backdrop-blur-md border-b border-gray-700/50 flex justify-between items-center z-20">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="text-gray-400 focus:outline-none lg:hidden mr-4">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-lg sm:text-xl font-semibold text-white tracking-wider uppercase">DEMO BANK</h1>
            </div>
            <div className="flex items-center space-x-3">
                <HeuristicAPIStatus />
                
                {isAuthenticated && (
                    <div className="relative" ref={notificationsRef}>
                        <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="text-gray-400 hover:text-white focus:outline-none">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-gray-900"></span>
                            )}
                        </button>
                        {isNotificationsOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                                <div className="p-3 font-semibold text-white border-b border-gray-700">Notifications</div>
                                {notificationsLoading ? (
                                    <p className="p-4 text-sm text-gray-500">Loading notifications...</p>
                                ) : notificationsError ? (
                                    <p className="p-4 text-sm text-red-400">Error loading notifications: {notificationsError.message}</p>
                                ) : notifications.length > 0 ? (
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.map((notification: Notification) => (
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
    );
};

export default Header;
