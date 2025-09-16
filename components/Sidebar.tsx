import React from 'react';
import { View } from '../types';
import { NAV_ITEMS } from '../constants';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const DemoBankLogo: React.FC<{className?: string}> = ({className}) => (
     <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4"/>
        <path d="M30 70V30H55C65 30 65 40 55 40H30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 70V30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    
    const handleNavClick = (view: View) => {
        setActiveView(view);
        setIsOpen(false); // Close sidebar on navigation
    };

    return (
        <>
            {/* Overlay */}
             <div 
                className={`fixed inset-0 bg-black/60 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
             ></div>

            {/* Sidebar */}
            <div className={`flex flex-col w-64 bg-gray-900/50 backdrop-blur-lg border-r border-gray-700/50 fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex items-center justify-between h-20 border-b border-gray-700/50 px-6">
                    <div className="flex items-center space-x-2 text-cyan-400">
                       <DemoBankLogo className="h-10 w-10" />
                       <span className="font-bold text-lg text-white">Demo Bank</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <nav className="flex-1 px-2 py-4 space-y-2">
                        {NAV_ITEMS.map((item) => (
                             <a
                                key={item.id}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavClick(item.id);
                                }}
                                className={`flex items-center px-4 py-2 text-gray-300 transition-colors duration-200 transform rounded-md hover:bg-gray-700/50 hover:text-white ${
                                    activeView === item.id ? 'bg-cyan-500/20 text-cyan-300 border-l-4 border-cyan-400' : ''
                                }`}
                            >
                                {item.icon}
                                <span className="mx-4 font-medium">{item.label}</span>
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Sidebar;