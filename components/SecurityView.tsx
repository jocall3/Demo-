import React, { useContext, useState } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import PlaidLinkButton from './PlaidLinkButton';

const SecurityView: React.FC = () => {
    const context = useContext(DataContext);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [settings, setSettings] = useState({ twoFactor: true, biometric: false });


    if (!context) {
        throw new Error("SecurityView must be within a DataProvider.");
    }
    const { linkedAccounts, handlePlaidSuccess, unlinkAccount } = context;

    const handleToggle = (setting: 'twoFactor' | 'biometric') => {
        setSettings(prev => ({...prev, [setting]: !prev[setting]}));
    }

    const PasswordModal: React.FC = () => (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Change Password</h3>
                </div>
                <div className="p-6 space-y-4">
                    <input type="password" placeholder="Current Password" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <input type="password" placeholder="New Password" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <input type="password" placeholder="Confirm New Password" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <button onClick={() => { alert('Password changed successfully!'); setIsPasswordModalOpen(false); }} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Update Password</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <Card title="Linked Accounts & Data Sources">
                <div className="space-y-4">
                    {linkedAccounts.length > 0 ? (
                        linkedAccounts.map(account => (
                            <div key={account.id} className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-white">{account.name}</h4>
                                    <p className="text-sm text-gray-400">Account ending in •••• {account.mask}</p>
                                </div>
                                <button onClick={() => unlinkAccount(account.id)} className="text-xs text-red-400 hover:text-red-300">Unlink</button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 py-4">You haven't linked any bank accounts yet. Link an account to import your transactions automatically.</p>
                    )}
                    <PlaidLinkButton onSuccess={handlePlaidSuccess} />
                </div>
            </Card>
            
            <Card title="Security Settings">
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                            <h4 className="font-semibold text-white">Two-Factor Authentication (2FA)</h4>
                            <p className="text-sm text-gray-400">Add an extra layer of security to your account.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.twoFactor} onChange={() => handleToggle('twoFactor')} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>
                     <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                            <h4 className="font-semibold text-white">Biometric Login</h4>
                            <p className="text-sm text-gray-400">Use your fingerprint or face to log in.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.biometric} onChange={() => handleToggle('biometric')} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>
                     <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                         <h4 className="font-semibold text-white">Change Password</h4>
                         <button onClick={() => setIsPasswordModalOpen(true)} className="px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-sm">Change</button>
                    </div>
                </div>
            </Card>

            <Card title="Recent Login Activity">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-800">
                        <p className="text-gray-300"><span className="font-mono">Chrome on Windows</span> - New York, USA</p>
                        <p className="text-gray-400">Today, 10:30 AM</p>
                    </div>
                    <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-800">
                        <p className="text-gray-300"><span className="font-mono">Safari on macOS</span> - New York, USA</p>
                        <p className="text-gray-400">Yesterday, 8:15 PM</p>
                    </div>
                     <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-800">
                        <p className="text-gray-300"><span className="font-mono">QuantumBank App on iOS</span> - New York, USA</p>
                        <p className="text-gray-400">2 days ago, 11:00 AM</p>
                    </div>
                </div>
            </Card>
            {isPasswordModalOpen && <PasswordModal />}
        </div>
    );
};

export default SecurityView;
