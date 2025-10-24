import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Notification } from '../types';

// --- Mock Authentication Hook (Placeholder for real OAuth/OIDC implementation) ---
/**
 * @description A mock authentication hook to simulate a real auth context (e.g., from Auth0, Keycloak, or OIDC-Client).
 * In a real application, this would be replaced with the provider's hook, e.g., `useAuth0()`.
 * It provides the user's profile, authentication status, and login/logout functions.
 */
const useAuth = () => {
    // Simulate user state. In a real app, this would come from the auth provider's context.
    const [isAuthenticated, setIsAuthenticated] = useState(true); // Default to logged in for the demo
    const [user, setUser] = useState<any | null>({
        name: 'The Visionary',
        email: 'visionary@demobank.com',
        picture: 'https://i.pravatar.cc/80?u=visionary',
    });
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            setIsAuthenticated(true);
            setUser({
                name: 'The Visionary',
                email: 'visionary@demobank.com',
                picture: 'https://i.pravatar.cc/80?u=visionary',
            });
            setIsLoading(false);
        }, 1000);
    }, []);

    const logout = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
        }, 500);
    }, []);

    return { user, isAuthenticated, isLoading, login, logout };
};

// --- Mock Notifications Hook (Placeholder for real implementation) ---
/**
 * @description A mock hook for notifications. In a real app, this would use React Query
 * to fetch notifications from the GraphQL gateway.
 */
const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: '1', message: 'Your credit score has increased by 5 points!', timestamp: '2h ago', read: false, view: View.CreditHealth },
        { id: '2', message: 'A large purchase of $299.99 at "New Tech Gadget" was detected.', timestamp: '1d ago', read: false, view: View.Transactions },
        { id: '3', message: 'You have earned 150 reward points from your recent spending.', timestamp: '3d ago', read: true, view: View.Rewards },
    ]);
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Mock mutation to mark as read
    const markAsRead = {
        mutate: (id: string) => {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }
    };
    
    return { notifications, unreadCount, markAsRead };
};

// --- Helper Hook: useClickOutside ---
/**
 * A simple hook to detect clicks outside of a specified element.
 * @param ref Ref to the element to monitor.
 * @param handler Callback to run on outside click.
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

/**
 * @description A dynamic widget to show the simulated real-time status of the "Heuristic API".
 * This component is purely presentational.
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
    }, []);

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

interface HeaderProps {
    onMenuClick: () => void;
    setActiveView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, setActiveView }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    
    const notificationsRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    
    useClickOutside(notificationsRef, () => setIsNotificationsOpen(false));
    useClickOutside(profileRef, () => setIsProfileOpen(false));

    const { user, isAuthenticated, isLoading, login, logout } = useAuth();
    const { notifications, unreadCount, markAsRead } = useNotifications();

    const handleNotificationClick = (notification: Notification) => {
        if (notification.view) {
            setActiveView(notification.view as View);
        }
        if (!notification.read) {
            markAsRead.mutate(notification.id);
        }
        setIsNotificationsOpen(false);
    };

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
    };
    
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
                        <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover" />
                        <span className="hidden sm:block font-medium text-white">{user.name}</span>
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
                onClick={() => login()}
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
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications && notifications.length > 0 ? notifications.map(notification => (
                                        <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-3 text-sm flex items-start border-b border-gray-700/50 cursor-pointer ${notification.read ? 'opacity-60 hover:bg-gray-700/50' : 'bg-cyan-500/10 hover:bg-cyan-500/20'}`}>
                                            {!notification.read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>}
                                            <div className="ml-2">
                                                <p className="text-gray-200">{notification.message}</p>
                                                <p className="text-xs text-gray-400 mt-1">{notification.timestamp}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="p-4 text-sm text-gray-500">No new notifications.</p>
                                    )}
                                </div>
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
