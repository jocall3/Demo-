import React, { useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { DataContext } from '../context/DataContext';
import Card from './Card';
import { CryptoAsset, NFTAsset } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';

// SECTION: Enhanced Types and Interfaces for a Real-World Application

export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type TransactionType = 'buy' | 'sell' | 'send' | 'receive' | 'stake' | 'unstake' | 'swap';
export type BlockchainNetwork = 'Ethereum' | 'Polygon' | 'Solana' | 'Arbitrum' | 'Optimism';

export interface HistoricalDataPoint {
    timestamp: number;
    value: number;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    asset: string;
    amount: number;
    valueUSD: number;
    fromAddress?: string;
    toAddress?: string;
    timestamp: number;
    network: BlockchainNetwork;
    txHash: string;
}

export interface StakingPool {
    id: string;
    asset: string;
    apy: number;
    totalStaked: number;
    myStake: number;
    logoUrl: string;
    network: BlockchainNetwork;
}

export interface DeFiProtocol {
    id: string;
    name: string;
    tvl: number;
    category: 'DEX' | 'Lending' | 'Liquid Staking';
    logoUrl: string;
    description: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    imageUrl: string;
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface GasPrices {
    standard: number;
    fast: number;
    rapid: number;
}

export interface PriceAlert {
    id: string;
    asset: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isActive: boolean;
}

export interface AdvancedCryptoAsset extends CryptoAsset {
    price: number;
    change24h: number;
    marketCap: number;
    volume24h: number;
    sparkline: number[];
    logoUrl: string;
    symbol: string;
}

// SECTION: SVG Icons as React Components for clean, dependency-free UI

export const EthereumIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.69769L11.9323 2.74316V15.185L18.4201 11.514L12 2.69769Z" fill="#C0C0C0"/>
        <path d="M12 2.69769L5.57993 11.514L12 15.185V2.69769Z" fill="white"/>
        <path d="M12 16.327L11.9406 16.3813V21.3023L12 21.4395L18.4201 12.656L12 16.327Z" fill="#C0C0C0"/>
        <path d="M12 21.4395V16.327L5.57993 12.656L12 21.4395Z" fill="white"/>
        <path d="M12 15.185L18.4201 11.514L12.0001 7.85093L12 15.185Z" fill="#E0E0E0"/>
        <path d="M5.57993 11.514L12 15.185V7.85093L5.57993 11.514Z" fill="#F0F0F0"/>
    </svg>
);

export const SwapIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

export const StakeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

// SECTION: Utility Functions for Data Formatting

export const formatCurrency = (value: number, decimals = 2) => `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
export const shortenAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
export const timeAgo = (timestamp: number): string => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};
export const getChainInfo = (network: BlockchainNetwork) => {
    const info = {
        Ethereum: { name: 'Ethereum', color: '#627eea' },
        Polygon: { name: 'Polygon', color: '#8247e5' },
        Solana: { name: 'Solana', color: '#9945FF' },
        Arbitrum: { name: 'Arbitrum', color: '#28a0f0' },
        Optimism: { name: 'Optimism', color: '#FF0420' },
    };
    return info[network];
};

// SECTION: Mock Data Generators to Simulate a Real Backend

export const generateMockTransactions = (count: number): Transaction[] => {
    const assets = ['ETH', 'BTC', 'SOL', 'USDC', 'MATIC'];
    const types: TransactionType[] = ['buy', 'sell', 'send', 'receive', 'stake', 'unstake', 'swap'];
    const statuses: TransactionStatus[] = ['completed', 'completed', 'completed', 'pending', 'failed'];
    const networks: BlockchainNetwork[] = ['Ethereum', 'Polygon', 'Solana', 'Arbitrum', 'Optimism'];
    return Array.from({ length: count }, (_, i) => ({
        id: `tx-${i}-${Date.now()}`,
        type: types[Math.floor(Math.random() * types.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        asset: assets[Math.floor(Math.random() * assets.length)],
        amount: Math.random() * 10,
        valueUSD: Math.random() * 5000,
        fromAddress: `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        toAddress: `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        timestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // last 30 days
        network: networks[Math.floor(Math.random() * networks.length)],
        txHash: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    })).sort((a, b) => b.timestamp - a.timestamp);
};

export const generateMockHistoricalData = (days: number): HistoricalDataPoint[] => {
    let value = 50000 + Math.random() * 20000;
    const now = Date.now();
    return Array.from({ length: days }, (_, i) => {
        value *= 1 + (Math.random() - 0.49) * 0.05; // Simulate daily fluctuation
        return {
            timestamp: now - (days - i - 1) * 24 * 60 * 60 * 1000,
            value,
        };
    });
};

export const generateAdvancedCryptoAssets = (baseAssets: CryptoAsset[]): AdvancedCryptoAsset[] => {
    const logoMap: {[key:string]: string} = {
        'BTC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
        'ETH': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
        'SOL': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
        'USDC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    }
    return baseAssets.map(asset => ({
        ...asset,
        price: asset.value / asset.amount,
        change24h: (Math.random() - 0.5) * 10, // -5% to +5%
        marketCap: asset.value * (1000 + Math.random() * 5000),
        volume24h: asset.value * (100 + Math.random() * 500),
        sparkline: Array.from({ length: 30 }, () => Math.random() * asset.value),
        logoUrl: logoMap[asset.ticker] || '',
        symbol: asset.ticker
    }));
};

export const generateMockStakingPools = (): StakingPool[] => [
    { id: 'eth-lido', asset: 'ETH', apy: 3.8, totalStaked: 9500000, myStake: 2.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8000.png', network: 'Ethereum' },
    { id: 'matic-lido', asset: 'MATIC', apy: 5.2, totalStaked: 850000000, myStake: 1500, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png', network: 'Polygon' },
    { id: 'sol-jito', asset: 'SOL', apy: 7.1, totalStaked: 6800000, myStake: 25.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png', network: 'Solana' },
    { id: 'arb-gmx', asset: 'ARB', apy: 4.5, totalStaked: 12000000, myStake: 0, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png', network: 'Arbitrum' },
];

export const generateMockDeFiProtocols = (): DeFiProtocol[] => [
    { id: 'uniswap', name: 'Uniswap', tvl: 4120000000, category: 'DEX', logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png', description: 'A decentralized exchange for swapping ERC20 tokens.' },
    { id: 'aave', name: 'Aave', tvl: 6800000000, category: 'Lending', logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7278.png', description: 'A decentralized non-custodial liquidity protocol where users can participate as depositors or borrowers.' },
    { id: 'lido', name: 'Lido', tvl: 14200000000, category: 'Liquid Staking', logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8000.png', description: 'A liquid staking solution for ETH and other PoS assets.' },
    { id: 'curve', name: 'Curve Finance', tvl: 2900000000, category: 'DEX', logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6538.png', description: 'An exchange liquidity pool on Ethereum designed for extremely efficient stablecoin trading.' },
];

// SECTION: Custom Hooks for State Management and Data Fetching Simulation

export const useCryptoDataFeed = (initialGasPrices: GasPrices) => {
    const [gasPrices, setGasPrices] = useState<GasPrices>(initialGasPrices);
    const [livePortfolioValue, setLivePortfolioValue] = useState(0);

    useEffect(() => {
        const gasInterval = setInterval(() => {
            setGasPrices({
                standard: 40 + (Math.random() - 0.5) * 10,
                fast: 50 + (Math.random() - 0.5) * 12,
                rapid: 60 + (Math.random() - 0.5) * 15,
            });
        }, 5000); // Update every 5 seconds

        const portfolioInterval = setInterval(() => {
            setLivePortfolioValue(prev => prev * (1 + (Math.random() - 0.5) * 0.0001));
        }, 1000); // Update every second

        return () => {
            clearInterval(gasInterval);
            clearInterval(portfolioInterval);
        };
    }, []);

    return { gasPrices, livePortfolioValue };
};

// SECTION: Advanced Reusable UI Components

export const AssetSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => (
    <div className="h-10 w-24">
        <ResponsiveContainer>
            <LineChart data={data.map(v => ({ value: v }))}>
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export const AssetTable: React.FC<{ assets: AdvancedCryptoAsset[] }> = ({ assets }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdvancedCryptoAsset; direction: 'asc' | 'desc' } | null>(null);

    const sortedAssets = useMemo(() => {
        let sortableAssets = [...assets];
        if (sortConfig !== null) {
            sortableAssets.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableAssets;
    }, [assets, sortConfig]);

    const requestSort = (key: keyof AdvancedCryptoAsset) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortArrow = (key: keyof AdvancedCryptoAsset) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                    <tr>
                        {['Asset', 'Price', '24h %', 'Holdings', 'Market Cap', '24h Volume', 'Last 7 Days'].map(header => {
                            const key = {
                                'Asset': 'name', 'Price': 'price', '24h %': 'change24h',
                                'Holdings': 'value', 'Market Cap': 'marketCap', '24h Volume': 'volume24h'
                            }[header] as keyof AdvancedCryptoAsset;
                            return (
                                <th key={header} scope="col" className="px-4 py-3 cursor-pointer" onClick={() => key && requestSort(key)}>
                                    {header}{getSortArrow(key)}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedAssets.map(asset => (
                        <tr key={asset.name} className="border-b border-gray-700 hover:bg-gray-800/50">
                            <th scope="row" className="px-4 py-4 font-medium text-white whitespace-nowrap flex items-center">
                                <img src={asset.logoUrl} alt={asset.name} className="w-6 h-6 mr-3 rounded-full" />
                                <div>
                                    <div>{asset.name}</div>
                                    <div className="text-xs text-gray-500">{asset.symbol}</div>
                                </div>
                            </th>
                            <td className="px-4 py-4">{formatCurrency(asset.price, 2)}</td>
                            <td className={`px-4 py-4 ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {asset.change24h.toFixed(2)}%
                            </td>
                            <td className="px-4 py-4">
                                <div>{formatCurrency(asset.value)}</div>
                                <div className="text-xs text-gray-500">{asset.amount.toFixed(4)} {asset.symbol}</div>
                            </td>
                            <td className="px-4 py-4">{formatCurrency(asset.marketCap, 0)}</td>
                            <td className="px-4 py-4">{formatCurrency(asset.volume24h, 0)}</td>
                            <td className="px-4 py-4">
                                <AssetSparkline data={asset.sparkline} color={asset.change24h >= 0 ? '#4ade80' : '#f87171'} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const TransactionHistoryTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const [filter, setFilter] = useState<TransactionType | 'all'>('all');
    
    const filteredTransactions = transactions.filter(tx => filter === 'all' || tx.type === filter);
    
    const getStatusIndicator = (status: TransactionStatus) => {
        switch (status) {
            case 'completed': return <span className="px-2 py-1 text-xs font-medium text-green-300 bg-green-900/50 rounded-full">Completed</span>;
            case 'pending': return <span className="px-2 py-1 text-xs font-medium text-yellow-300 bg-yellow-900/50 rounded-full">Pending</span>;
            case 'failed': return <span className="px-2 py-1 text-xs font-medium text-red-300 bg-red-900/50 rounded-full">Failed</span>;
        }
    };
    
    return (
        <div>
            <div className="flex space-x-2 mb-4">
                {(['all', 'buy', 'sell', 'send', 'receive', 'swap'] as const).map(f =>
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-sm rounded-full ${filter === f ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                )}
            </div>
            <div className="overflow-y-auto max-h-96">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">Date</th>
                            <th scope="col" className="px-4 py-3">Type</th>
                            <th scope="col" className="px-4 py-3">Asset</th>
                            <th scope="col" className="px-4 py-3">Amount</th>
                            <th scope="col" className="px-4 py-3">Network</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                <td className="px-4 py-4">{timeAgo(tx.timestamp)}</td>
                                <td className="px-4 py-4 capitalize">{tx.type}</td>
                                <td className="px-4 py-4 font-medium text-white">{tx.asset}</td>
                                <td className="px-4 py-4">
                                    <div>{tx.amount.toFixed(4)} {tx.asset}</div>
                                    <div className="text-xs text-gray-500">{formatCurrency(tx.valueUSD)}</div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="font-mono text-xs px-2 py-1 rounded" style={{ backgroundColor: `${getChainInfo(tx.network).color}20`, color: getChainInfo(tx.network).color }}>
                                        {tx.network}
                                    </span>
                                </td>
                                <td className="px-4 py-4">{getStatusIndicator(tx.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const PortfolioHistoryChart: React.FC<{ data: HistoricalDataPoint[] }> = ({ data }) => {
    return (
        <div className="h-80 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="#9ca3af"
                        fontSize={12}
                    />
                    <YAxis 
                        orientation="right" 
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
                        domain={['dataMin', 'dataMax']}
                    />
                    <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: '#4b5563', borderRadius: '0.5rem' }}
                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                        formatter={(value) => [formatCurrency(Number(value)), 'Portfolio Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#06b6d4" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const GasTracker: React.FC<{ prices: GasPrices }> = ({ prices }) => (
    <div className="flex items-center space-x-4 text-sm bg-gray-900/50 p-2 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v11a1 1 0 100 2h1.333l.4-1.6a.5.5 0 01.976 0l.4 1.6H17a1 1 0 100-2V5a1 1 0 000-2H3zm12.978 4.846a.5.5 0 00-.707-.707l-3.09 3.09-1.293-1.293a.5.5 0 00-.707.707l1.646 1.647a.5.5 0 00.707 0l3.5-3.5z" clipRule="evenodd" />
        </svg>
        <span className="text-gray-400">Gas (Gwei):</span>
        <div className="flex items-center space-x-3">
            <span title="Standard">🐢 {prices.standard.toFixed(0)}</span>
            <span title="Fast">🚗 {prices.fast.toFixed(0)}</span>
            <span title="Rapid">🚀 {prices.rapid.toFixed(0)}</span>
        </div>
    </div>
);

// SECTION: Feature-Rich Dashboard Tabs

export const DashboardTab: React.FC<{
    advancedAssets: AdvancedCryptoAsset[],
    historicalData: HistoricalDataPoint[],
    transactions: Transaction[],
}> = ({ advancedAssets, historicalData, transactions }) => {
    return (
        <div className="space-y-6">
            <Card title="Portfolio Performance">
                <PortfolioHistoryChart data={historicalData} />
            </Card>
            <Card title="Asset Allocation">
                <AssetTable assets={advancedAssets} />
            </Card>
            <Card title="Transaction History">
                <TransactionHistoryTable transactions={transactions} />
            </Card>
        </div>
    );
};

export const DeFiTab: React.FC<{
    stakingPools: StakingPool[],
    protocols: DeFiProtocol[],
    cryptoAssets: AdvancedCryptoAsset[]
}> = ({ stakingPools, protocols, cryptoAssets }) => {
    const [swapFrom, setSwapFrom] = useState({ asset: 'ETH', amount: 1 });
    const [swapTo, setSwapTo] = useState({ asset: 'USDC', amount: 3000 });
    
    const handleSwap = () => {
        // Mock swap logic
        console.log(`Swapping ${swapFrom.amount} ${swapFrom.asset} for ${swapTo.amount} ${swapTo.asset}`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card title="Crypto Swap">
                    <div className="space-y-4 p-4">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <label className="text-xs text-gray-400">You Pay</label>
                            <div className="flex items-center justify-between mt-1">
                                <input type="number" value={swapFrom.amount} onChange={e => setSwapFrom({...swapFrom, amount: parseFloat(e.target.value)})} className="text-2xl bg-transparent text-white w-full focus:outline-none" />
                                <div className="flex items-center bg-gray-700 p-2 rounded-full">
                                    <img src={cryptoAssets.find(a => a.symbol === swapFrom.asset)?.logoUrl} className="w-6 h-6 mr-2" />
                                    <span className="text-white font-semibold">{swapFrom.asset}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button className="p-2 bg-gray-700 rounded-full text-gray-400 hover:bg-cyan-500 hover:text-white transition-transform duration-300 transform hover:rotate-180">
                                <SwapIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <label className="text-xs text-gray-400">You Receive (estimated)</label>
                            <div className="flex items-center justify-between mt-1">
                                <input type="number" value={swapTo.amount} readOnly className="text-2xl bg-transparent text-white w-full focus:outline-none" />
                                <div className="flex items-center bg-gray-700 p-2 rounded-full">
                                    <img src={cryptoAssets.find(a => a.symbol === swapTo.asset)?.logoUrl} className="w-6 h-6 mr-2" />
                                    <span className="text-white font-semibold">{swapTo.asset}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSwap} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg">Swap Tokens</button>
                    </div>
                </Card>
                <Card title="Top DeFi Protocols by TVL">
                    <div className="space-y-3">
                        {protocols.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-lg">
                                <div className="flex items-center">
                                    <img src={p.logoUrl} alt={p.name} className="w-8 h-8 mr-3"/>
                                    <div>
                                        <p className="font-semibold text-white">{p.name}</p>
                                        <p className="text-xs text-gray-400">{p.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-white">{formatCurrency(p.tvl, 0)}</p>
                                    <p className="text-xs text-gray-400">TVL</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card title="Staking & Yield">
                    <div className="space-y-4">
                        {stakingPools.map(pool => (
                            <div key={pool.id} className="p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <img src={pool.logoUrl} alt={pool.asset} className="w-8 h-8 mr-3"/>
                                        <div>
                                            <p className="font-bold text-white">{pool.asset} Pool</p>
                                            <p className="text-xs font-mono" style={{color: getChainInfo(pool.network).color}}>{pool.network}</p>
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold text-green-400">{pool.apy}% APY</p>
                                </div>
                                <div className="text-xs mt-3 flex justify-between text-gray-400">
                                    <span>Your Stake:</span>
                                    <span className="font-semibold text-white">{pool.myStake} {pool.asset}</span>
                                </div>
                                <div className="text-xs flex justify-between text-gray-400">
                                    <span>Total Staked:</span>
                                    <span className="font-semibold text-white">{formatCurrency(pool.totalStaked, 0)}</span>
                                </div>
                                <button className="mt-3 w-full text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                                    {pool.myStake > 0 ? 'Manage Stake' : 'Stake Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};


const CryptoView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("CryptoView must be within a DataProvider.");
    
    const { cryptoAssets, walletInfo, virtualCard, connectWallet, issueCard, buyCrypto, nftAssets, mintNFT } = context;
    
    const [isIssuingCard, setIsIssuingCard] = useState(false);
    const [isMetaMaskModalOpen, setIsMetaMaskModalOpen] = useState(false);
    const [isStripeModalOpen, setStripeModalOpen] = useState(false);
    const [buyAmount, setBuyAmount] = useState('100');
    
    // State for new advanced features
    const [activeTab, setActiveTab] = useState<'Dashboard' | 'DeFi' | 'NFTs' | 'Services'>('Dashboard');
    const { gasPrices } = useCryptoDataFeed({ standard: 45, fast: 52, rapid: 60 });
    const [mockTransactions] = useState(() => generateMockTransactions(50));
    const [mockHistoricalData] = useState(() => generateMockHistoricalData(90));
    const [mockStakingPools] = useState(() => generateMockStakingPools());
    const [mockDeFiProtocols] = useState(() => generateMockDeFiProtocols());
    
    const advancedCryptoAssets = useMemo(() => generateAdvancedCryptoAssets(cryptoAssets), [cryptoAssets]);

    const handleIssueCard = () => { setIsIssuingCard(true); setTimeout(() => { issueCard(); setIsIssuingCard(false); }, 2000); };
    const handleMetaMaskConnect = () => { connectWallet(); setIsMetaMaskModalOpen(false); };
    const handleBuyCrypto = () => { buyCrypto(parseFloat(buyAmount), 'ETH'); setStripeModalOpen(false); };
    
    const MetaMaskConnectModal: React.FC<{ isOpen: boolean; onClose: () => void; onConnect: () => void; }> = ({ isOpen, onClose, onConnect }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full border border-gray-700 flex flex-col" onClick={e=>e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-700 text-center"><h3 className="font-semibold text-white">MetaMask</h3></div>
                    <div className="p-6 flex-grow flex flex-col items-center text-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask" className="h-16 w-16 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-white mt-4">Connect With MetaMask</h4>
                        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg w-full">
                            <p className="text-sm text-gray-300">Allow this site to:</p>
                            <ul className="text-xs text-gray-400 list-disc list-inside mt-1 text-left ml-2"><li>View the addresses of your permitted accounts.</li><li>Suggest transactions to approve.</li></ul>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-900/50 grid grid-cols-2 gap-3">
                         <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg">Cancel</button>
                         <button onClick={onConnect} className="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg">Connect</button>
                    </div>
                </div>
            </div>
        );
    };
    
    const StripeCheckoutModal: React.FC<{ isOpen: boolean; onClose: () => void; onPay: () => void; amountUSD: string; }> = ({ isOpen, onClose, onPay, amountUSD }) => {
        const [isProcessing, setIsProcessing] = useState(false);
        const handlePayClick = () => { setIsProcessing(true); setTimeout(() => { onPay(); setIsProcessing(false); }, 2000); };
        if (!isOpen) return null;
        return ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}><div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 flex flex-col" onClick={e=>e.stopPropagation()}><div className="p-6 bg-gray-800 rounded-t-lg"><h3 className="font-semibold text-white">Demo Bank Inc.</h3><p className="text-2xl font-bold text-white mt-2">${parseFloat(amountUSD).toFixed(2)}</p></div><div className="p-6 space-y-4"><input type="email" placeholder="Email" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="visionary@demobank.com" /><input type="text" placeholder="Card information" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="4242 4242 4242 4242" /><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="MM / YY" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="12 / 28" /><input type="text" placeholder="CVC" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="123" /></div><button onClick={handlePayClick} disabled={isProcessing} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center">{isProcessing && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}{isProcessing ? 'Processing...' : `Pay $${parseFloat(amountUSD).toFixed(2)}`}</button></div></div></div>);
    }
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardTab advancedAssets={advancedCryptoAssets} historicalData={mockHistoricalData} transactions={mockTransactions} />;
            case 'DeFi':
                return <DeFiTab stakingPools={mockStakingPools} protocols={mockDeFiProtocols} cryptoAssets={advancedCryptoAssets} />;
            case 'NFTs':
                return <Card title="NFT Gallery"><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{nftAssets.map(nft => (<div key={nft.id}><img src={nft.imageUrl} alt={nft.name} className="w-full rounded-lg aspect-square object-cover" /><p className="text-xs font-semibold text-white mt-2 truncate">{nft.name}</p></div>))}<button onClick={() => mintNFT("Quantum Vision Pass", "/IMG_5610.webp")} className="w-full rounded-lg aspect-square border-2 border-dashed border-gray-600 hover:border-cyan-400 flex flex-col items-center justify-center text-gray-400 hover:text-cyan-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className="text-xs mt-2">Mint NFT</span></button></div></Card>;
            case 'Services':
                return (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Virtual Card" subtitle="Web3-enabled payments" className="h-full">
                            <div className="flex flex-col items-center justify-center text-center h-full min-h-[15rem]">{virtualCard ? (<div className="w-full max-w-sm aspect-[85.6/54] rounded-xl p-4 flex flex-col justify-between bg-gradient-to-br from-cyan-900 via-gray-900 to-indigo-900 border border-cyan-500/30"><div className="flex justify-between items-start"><p className="font-semibold text-white">Quantum Card</p></div><div><p className="font-mono text-lg text-white tracking-widest text-left">{virtualCard.cardNumber}</p><div className="flex justify-between text-xs font-mono text-gray-300 mt-2"><span>{virtualCard.holderName.toUpperCase()}</span><span>EXP: {virtualCard.expiry}</span><span>CVV: {virtualCard.cvv}</span></div></div></div>) : (<><p className="text-gray-400 mb-4">Issue a virtual card to spend your crypto assets anywhere.</p><button onClick={handleIssueCard} disabled={isIssuingCard} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{isIssuingCard ? 'Issuing Card...' : 'Issue Virtual Card'}</button></>)}</div>
                        </Card>
                        <Card title="Buy Crypto (On-Ramp)" className="h-full">
                             <div className="flex flex-col items-center justify-center text-center h-full min-h-[15rem]"><p className="text-gray-400">Buy crypto via our Stripe integration.</p><div className="flex items-center my-4"><span className="text-2xl font-bold text-white mr-2">$</span><input type="number" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} className="w-32 text-center text-2xl font-bold text-white bg-transparent border-b-2 border-cyan-500 focus:outline-none"/></div><button onClick={() => setStripeModalOpen(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Buy with Stripe</button></div>
                        </Card>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-wider">Crypto & Web3 Hub</h2>
                    <p className="text-gray-400 mt-1">Your unified gateway to the decentralized world.</p>
                </div>
                <div className="hidden lg:flex items-center space-x-4">
                    <GasTracker prices={gasPrices} />
                     <Card title="" className="!p-0 !bg-transparent !border-none">
                        <div className="flex flex-col items-center justify-center text-center h-full">
                            {walletInfo ? (
                                <div className="bg-gray-800/80 px-4 py-2 rounded-lg text-left">
                                    <p className="text-sm text-green-400 font-semibold">Wallet Connected</p>
                                    <p className="text-sm text-gray-300 font-mono break-all">{shortenAddress(walletInfo.address)}</p>
                                    <p className="text-md text-white">{walletInfo.balance.toFixed(4)} ETH</p>
                                </div>
                            ) : (
                                <button onClick={() => setIsMetaMaskModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Connect Metamask</button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['Dashboard', 'DeFi', 'NFTs', 'Services'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'border-cyan-500 text-cyan-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="mt-6">
                {renderContent()}
            </div>

            <MetaMaskConnectModal isOpen={isMetaMaskModalOpen} onClose={() => setIsMetaMaskModalOpen(false)} onConnect={handleMetaMaskConnect} />
            <StripeCheckoutModal isOpen={isStripeModalOpen} onClose={() => setStripeModalOpen(false)} onPay={handleBuyCrypto} amountUSD={buyAmount} />
        </div>
    );
};

export default CryptoView;
