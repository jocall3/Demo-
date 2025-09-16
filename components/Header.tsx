import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../context/DataContext';
import { View } from '../types';

/**
 * @description A dynamic widget to show the simulated real-time status of the "Heuristic API".
 * This component creates the illusion of an always-on, proactive AI analyzing data in the background.
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
        }, 4000); // Change message every 4 seconds

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
  const context = useContext(DataContext);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!context) {
    throw new Error("Header must be used within a DataProvider");
  }

  const { notifications, markNotificationRead } = context;
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const handleNotificationClick = (notification: typeof notifications[0]) => {
      if (notification.view) {
          setActiveView(notification.view);
      }
      markNotificationRead(notification.id);
      setIsNotificationsOpen(false);
  }

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
        <div className="relative">
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
                        {notifications.map(notification => (
                            <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-3 text-sm flex items-start border-b border-gray-700/50 cursor-pointer ${notification.read ? 'opacity-60' : 'bg-cyan-500/10'}`}>
                                {!notification.read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>}
                                <div className="ml-2">
                                    <p className="text-gray-200">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{notification.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <div className="relative">
            <button onClick={() => setIsProfileOpen(prev => !prev)} className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center border-2 border-cyan-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <span className="hidden sm:block font-medium text-white">The Visionary</span>
            </button>
            {isProfileOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                     <a href="#" onClick={(e)=>{e.preventDefault(); setActiveView(View.Settings); setIsProfileOpen(false);}} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Settings</a>
                     <a href="#" onClick={(e)=>{e.preventDefault(); alert('Logout functionality not implemented.');}} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Logout</a>
                 </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;