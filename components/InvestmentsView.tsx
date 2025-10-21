import React, { useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DataContext } from '../context/DataContext';
import Card from './Card';
import type { Asset } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, TooltipProps } from 'recharts';
import InvestmentPortfolio from './InvestmentPortfolio';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// ================================================================================================
// EXTENDED TYPE DEFINITIONS & MOCK DATA
// ================================================================================================

export type AssetClass = 'Stocks' | 'Bonds' | 'Real Estate' | 'Crypto' | 'Commodities' | 'Alternatives';
export type MarketRegion = 'North America' | 'Europe' | 'Asia-Pacific' | 'Emerging Markets' | 'Global';
export type AnalystRating = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';

export interface HistoricalDataPoint {
    date: string; // "YYYY-MM-DD"
    price: number;
}

export interface AdvancedAsset extends Asset {
    assetClass: AssetClass;
    ticker: string;
    marketCap: number; // in USD
    peRatio: number | null; // Price-to-Earnings
    dividendYield: number | null; // in percentage
    beta: number; // Market volatility
    historicalData: {
        '1D': HistoricalDataPoint[];
        '1W': HistoricalDataPoint[];
        '1M': HistoricalDataPoint[];
        '1Y': HistoricalDataPoint[];
        '5Y': HistoricalDataPoint[];
    };
    analystRatings: {
        rating: AnalystRating;
        targetPrice: number;
        analystCount: number;
    };
    news: NewsArticle[];
    region: MarketRegion;
}

export interface NewsArticle {
    id: string;
    source: string;
    headline: string;
    summary: string;
    url: string;
    publishedAt: string;
}

export interface FinancialGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string; // ISO string
    priority: 'High' | 'Medium' | 'Low';
}

const generateHistoricalData = (basePrice: number, days: number, volatility: number): HistoricalDataPoint[] => {
    const data: HistoricalDataPoint[] = [];
    let price = basePrice;
    for (let i = days; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const change = (Math.random() - 0.5) * volatility * price;
        price += change;
        if (price < 0) price = 0;
        data.push({
            date: date.toISOString().split('T')[0],
            price: parseFloat(price.toFixed(2)),
        });
    }
    return data;
};

export const MOCK_ADVANCED_ASSETS: AdvancedAsset[] = [
    {
        name: 'Tech Innovators Inc.',
        value: 15000,
        color: '#34d399',
        performanceYTD: 25.5,
        description: 'Leading technology conglomerate specializing in AI and cloud computing.',
        esgRating: 4,
        assetClass: 'Stocks',
        ticker: 'TII',
        marketCap: 2.1e12,
        peRatio: 35.2,
        dividendYield: 0.8,
        beta: 1.2,
        region: 'North America',
        historicalData: {
            '1D': generateHistoricalData(350, 1, 0.02),
            '1W': generateHistoricalData(340, 7, 0.05),
            '1M': generateHistoricalData(320, 30, 0.08),
            '1Y': generateHistoricalData(250, 365, 0.15),
            '5Y': generateHistoricalData(100, 365 * 5, 0.20),
        },
        analystRatings: { rating: 'Strong Buy', targetPrice: 400, analystCount: 25 },
        news: [{ id: 'n1', source: 'FinNews', headline: 'TII announces breakthrough in quantum computing', summary: '...', url: '#', publishedAt: new Date().toISOString() }],
    },
    {
        name: 'Green Energy Fund',
        value: 8000,
        color: '#22c55e',
        performanceYTD: 18.2,
        description: 'A fund focused on renewable energy sources like solar, wind, and hydro power.',
        esgRating: 5,
        assetClass: 'Alternatives',
        ticker: 'GEF',
        marketCap: 5e10,
        peRatio: null,
        dividendYield: 2.5,
        beta: 0.8,
        region: 'Global',
        historicalData: {
            '1D': generateHistoricalData(120, 1, 0.015),
            '1W': generateHistoricalData(118, 7, 0.04),
            '1M': generateHistoricalData(115, 30, 0.06),
            '1Y': generateHistoricalData(95, 365, 0.12),
            '5Y': generateHistoricalData(50, 365 * 5, 0.18),
        },
        analystRatings: { rating: 'Buy', targetPrice: 140, analystCount: 18 },
        news: [{ id: 'n2', source: 'EcoInvest', headline: 'GEF portfolio companies report record energy production', summary: '...', url: '#', publishedAt: new Date().toISOString() }],
    },
    {
        name: 'Global Bond Index',
        value: 12000,
        color: '#60a5fa',
        performanceYTD: 4.1,
        description: 'A diversified index of government and corporate bonds from around the world.',
        esgRating: 3,
        assetClass: 'Bonds',
        ticker: 'GBI',
        marketCap: 1e13,
        peRatio: null,
        dividendYield: 3.1,
        beta: 0.2,
        region: 'Global',
        historicalData: {
            '1D': generateHistoricalData(99, 1, 0.005),
            '1W': generateHistoricalData(99.5, 7, 0.01),
            '1M': generateHistoricalData(100, 30, 0.02),
            '1Y': generateHistoricalData(98, 365, 0.04),
            '5Y': generateHistoricalData(95, 365 * 5, 0.05),
        },
        analystRatings: { rating: 'Hold', targetPrice: 102, analystCount: 30 },
        news: [{ id: 'n3', source: 'MacroView', headline: 'Central banks signal steady interest rates, boosting bond markets.', summary: '...', url: '#', publishedAt: new Date().toISOString() }],
    },
    {
        name: 'Digital Currency Basket',
        value: 5000,
        color: '#facc15',
        performanceYTD: 150.7,
        description: 'A high-risk, high-reward basket of leading cryptocurrencies.',
        esgRating: 1,
        assetClass: 'Crypto',
        ticker: 'DCB',
        marketCap: 1.5e12,
        peRatio: null,
        dividendYield: null,
        beta: 2.5,
        region: 'Global',
        historicalData: {
            '1D': generateHistoricalData(2500, 1, 0.05),
            '1W': generateHistoricalData(2300, 7, 0.12),
            '1M': generateHistoricalData(1800, 30, 0.25),
            '1Y': generateHistoricalData(500, 365, 0.8),
            '5Y': generateHistoricalData(100, 365 * 5, 1.2),
        },
        analystRatings: { rating: 'Hold', targetPrice: 3000, analystCount: 12 },
        news: [{ id: 'n4', source: 'CryptoWeekly', headline: 'DCB sees massive inflows amid institutional adoption.', summary: '...', url: '#', publishedAt: new Date().toISOString() }],
    },
    {
        name: 'Urban Real Estate REIT',
        value: 10000,
        color: '#f87171',
        performanceYTD: 8.9,
        description: 'Real Estate Investment Trust focusing on commercial properties in major urban centers.',
        esgRating: 3,
        assetClass: 'Real Estate',
        ticker: 'UREIT',
        marketCap: 2e10,
        peRatio: 18.5,
        dividendYield: 4.2,
        beta: 0.7,
        region: 'North America',
        historicalData: {
            '1D': generateHistoricalData(85, 1, 0.01),
            '1W': generateHistoricalData(84, 7, 0.03),
            '1M': generateHistoricalData(82, 30, 0.05),
            '1Y': generateHistoricalData(75, 365, 0.1),
            '5Y': generateHistoricalData(60, 365 * 5, 0.12),
        },
        analystRatings: { rating: 'Buy', targetPrice: 95, analystCount: 15 },
        news: [{ id: 'n5', source: 'Property Times', headline: 'UREIT reports high occupancy rates despite economic headwinds.', summary: '...', url: '#', publishedAt: new Date().toISOString() }],
    }
];

export const MOCK_GOALS: FinancialGoal[] = [
    { id: 'g1', name: 'Retirement Fund', targetAmount: 1000000, currentAmount: 250000, targetDate: '2045-01-01T00:00:00.000Z', priority: 'High' },
    { id: 'g2', name: 'House Down Payment', targetAmount: 100000, currentAmount: 45000, targetDate: '2028-06-01T00:00:00.000Z', priority: 'High' },
    { id: 'g3', name: 'Dream Vacation', targetAmount: 15000, currentAmount: 11000, targetDate: '2025-12-20T00:00:00.000Z', priority: 'Medium' },
];

export const MOCK_RISK_QUIZ_QUESTIONS = [
    {
        question: "What is your primary goal for this investment portfolio?",
        answers: [
            { text: "Capital preservation", score: 1 },
            { text: "Steady income with some growth", score: 2 },
            { text: "A balance of growth and income", score: 3 },
            { text: "Strong growth over the long term", score: 4 },
            { text: "Aggressive, maximum growth", score: 5 },
        ]
    },
    {
        question: "How long do you plan to keep your money invested?",
        answers: [
            { text: "Less than 2 years", score: 1 },
            { text: "2 to 5 years", score: 2 },
            { text: "5 to 10 years", score: 3 },
            { text: "More than 10 years", score: 4 },
        ]
    },
    {
        question: "If your portfolio lost 20% of its value in a single year, how would you react?",
        answers: [
            { text: "Sell all of my investments", score: 1 },
            { text: "Sell some of my investments", score: 2 },
            { text: "Do nothing and hold", score: 3 },
            { text: "Invest more, it's a buying opportunity", score: 4 },
        ]
    },
    {
        question: "Which statement best describes your knowledge of investments?",
        answers: [
            { text: "None, I'm a complete beginner.", score: 1 },
            { text: "Limited, I know the basics.", score: 2 },
            { text: "Good, I'm comfortable with stocks and bonds.", score: 3 },
            { text: "Expert, I understand advanced strategies.", score: 4 },
        ]
    }
];


// ================================================================================================
// UTILITY FUNCTIONS & HOOKS
// ================================================================================================

/**
 * Formats a number as a currency string.
 * @param value The number to format.
 * @param currency The currency code (e.g., 'USD').
 * @returns A formatted currency string.
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

/**
 * Formats a large number into a compact format (e.g., 1.2T, 500B, 25M).
 * @param value The number to format.
 * @returns A compact number string.
 */
export const formatLargeNumber = (value: number): string => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toString();
};

/**
 * A custom hook to debounce a value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// ================================================================================================
// HELPER & SUB-COMPONENTS
// ================================================================================================

const ESGScore: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center" aria-label={`ESG rating: ${rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
            <svg
                key={i}
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${i < rating ? 'text-green-400' : 'text-gray-600'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
            >
                <path d="M10 15a.75.75 0 01-.75-.75V7.612L7.22 9.63a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.18 0l3.25 3.25a.75.75 0 11-1.06 1.06L10.75 7.612v6.638A.75.75 0 0110 15z" />
            </svg>
        ))}
    </div>
);

const InvestmentModal: React.FC<{
    asset: Asset | null;
    onClose: () => void;
    onInvest: (assetName: string, amount: number) => void;
}> = ({ asset, onClose, onInvest }) => {
    const [amount, setAmount] = useState('1000');
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    if (!asset) return null;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAmount(val);
        if (parseFloat(val) <= 0) {
            setError('Amount must be positive.');
        } else {
            setError('');
        }
    };

    const handleInvestClick = () => {
        if (parseFloat(amount) > 0) {
            setIsConfirming(true);
        } else {
            setError('Please enter a valid amount.');
        }
    };

    const confirmInvestment = () => {
        onInvest(asset.name, parseFloat(amount));
        onClose();
        setIsConfirming(false);
        setAmount('1000');
    };

    const modalContent = (
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Invest in {asset.name}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
          </div>
          <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">{asset.description}</p>
              {!isConfirming ? (
                  <>
                      <div>
                          <label className="block text-sm font-medium text-gray-300">Amount (USD)</label>
                          <div className="relative mt-1">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">$</span>
                              <input
                                  type="number"
                                  value={amount}
                                  onChange={handleAmountChange}
                                  className="w-full bg-gray-700/50 border-gray-600 rounded-md p-2 pl-7 text-white"
                                  placeholder="e.g. 1000"
                              />
                          </div>
                          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                      </div>
                      <button onClick={handleInvestClick} disabled={!!error || !amount} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
                          Proceed to Confirmation
                      </button>
                  </>
              ) : (
                  <div className="space-y-4">
                      <h4 className="font-semibold text-white">Confirm Your Investment</h4>
                      <div className="p-3 bg-gray-700/50 rounded-md">
                          <p className="text-gray-400">Asset: <span className="text-white font-medium">{asset.name}</span></p>
                          <p className="text-gray-400">Amount: <span className="text-white font-medium">{formatCurrency(parseFloat(amount))}</span></p>
                          <p className="text-xs text-gray-500 mt-2">A transaction fee of 0.1% may apply.</p>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={() => setIsConfirming(false)} className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
                              Back
                          </button>
                          <button onClick={confirmInvestment} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
                              Confirm Investment
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
           {modalContent}
        </div>
    );
};

export const ChartTimeframeSelector: React.FC<{
    selected: string;
    onSelect: (timeframe: '1D' | '1W' | '1M' | '1Y' | '5Y') => void;
}> = ({ selected, onSelect }) => {
    const timeframes: ('1D' | '1W' | '1M' | '1Y' | '5Y')[] = ['1D', '1W', '1M', '1Y', '5Y'];
    return (
        <div className="flex items-center space-x-2">
            {timeframes.map(tf => (
                <button
                    key={tf}
                    onClick={() => onSelect(tf)}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                        selected === tf 
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    {tf}
                </button>
            ))}
        </div>
    );
};

export const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-gray-800/80 border border-gray-700 rounded-md shadow-lg text-sm">
          <p className="label text-gray-300">{`Date: ${label}`}</p>
          <p className="intro text-cyan-400">{`Price: ${formatCurrency(payload[0].value as number)}`}</p>
        </div>
      );
    }
    return null;
};


// ================================================================================================
// DETAILED ASSET VIEW MODAL
// ================================================================================================
export const DetailedAssetViewModal: React.FC<{
    asset: AdvancedAsset | null;
    onClose: () => void;
    onInvest: (assetName: string, amount: number) => void;
}> = ({ asset, onClose, onInvest }) => {
    const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | '5Y'>('1Y');

    if (!asset) return null;

    const data = asset.historicalData[timeframe];
    const initialPrice = data.length > 0 ? data[0].price : 0;
    const latestPrice = data.length > 0 ? data[data.length - 1].price : 0;
    const change = latestPrice - initialPrice;
    const changePercent = initialPrice > 0 ? (change / initialPrice) * 100 : 0;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
            <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white">{asset.name} ({asset.ticker})</h3>
                        <p className="text-sm text-gray-400">{asset.assetClass} - {asset.region}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[80vh] overflow-y-auto">
                    {/* Left Column: Chart and actions */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-baseline">
                            <div>
                                <p className="text-3xl font-semibold text-white">{formatCurrency(latestPrice)}</p>
                                <p className={`text-lg ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent.toFixed(2)}%)
                                    <span className="text-sm text-gray-400"> ({timeframe})</span>
                                </p>
                            </div>
                            <ChartTimeframeSelector selected={timeframe} onSelect={setTimeframe} />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#9ca3af" tickFormatter={(tick) => formatCurrency(tick)} domain={['dataMin', 'dataMax']} tick={{ fontSize: 12 }}/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="text-lg font-semibold text-white mb-2">Related News</h4>
                            <div className="space-y-3">
                                {asset.news.map(n => (
                                    <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-800 rounded-md hover:bg-gray-700/50">
                                        <p className="font-semibold text-cyan-400 text-sm">{n.headline}</p>
                                        <p className="text-xs text-gray-500">{n.source} - {new Date(n.publishedAt).toLocaleDateString()}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Right Column: Key stats and actions */}
                    <div className="space-y-4">
                        <Card title="Key Statistics">
                            <ul className="text-sm space-y-2 text-gray-300">
                                <li className="flex justify-between"><span>Market Cap:</span> <span className="font-mono text-white">{formatLargeNumber(asset.marketCap)}</span></li>
                                <li className="flex justify-between"><span>P/E Ratio:</span> <span className="font-mono text-white">{asset.peRatio || 'N/A'}</span></li>
                                <li className="flex justify-between"><span>Dividend Yield:</span> <span className="font-mono text-white">{asset.dividendYield ? `${asset.dividendYield.toFixed(2)}%` : 'N/A'}</span></li>
                                <li className="flex justify-between"><span>Beta:</span> <span className="font-mono text-white">{asset.beta.toFixed(2)}</span></li>
                                <li className="flex justify-between"><span>YTD Perf:</span> <span className={`font-mono ${asset.performanceYTD > 0 ? 'text-green-400' : 'text-red-400'}`}>{asset.performanceYTD.toFixed(2)}%</span></li>
                            </ul>
                        </Card>
                         <Card title="Analyst Consensus">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-cyan-400">{asset.analystRatings.rating}</p>
                                <p className="text-sm text-gray-400">Based on {asset.analystRatings.analystCount} analysts</p>
                                <p className="mt-2 text-gray-300">Avg. Price Target: <span className="text-white font-semibold">{formatCurrency(asset.analystRatings.targetPrice)}</span></p>
                            </div>
                         </Card>
                        <button onClick={() => onInvest(asset.name, 1000)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors">
                            Quick Invest $1,000
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ================================================================================================
// PORTFOLIO DIVERSIFICATION COMPONENT
// ================================================================================================
export const PortfolioDiversification: React.FC<{ assets: AdvancedAsset[] }> = ({ assets }) => {
    const dataByClass = useMemo(() => {
        const aggregation = assets.reduce((acc, asset) => {
            if (!acc[asset.assetClass]) {
                acc[asset.assetClass] = 0;
            }
            acc[asset.assetClass] += asset.value;
            return acc;
        }, {} as Record<AssetClass, number>);

        return Object.entries(aggregation).map(([name, value]) => ({ name, value }));
    }, [assets]);

    const dataByRegion = useMemo(() => {
        const aggregation = assets.reduce((acc, asset) => {
            if (!acc[asset.region]) {
                acc[asset.region] = 0;
            }
            acc[asset.region] += asset.value;
            return acc;
        }, {} as Record<MarketRegion, number>);

        return Object.entries(aggregation).map(([name, value]) => ({ name, value }));
    }, [assets]);
    
    const COLORS = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

        if (percent < 0.05) return null; // Don't render label for small slices

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <Card title="Portfolio Diversification">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                    <h4 className="text-center font-semibold text-white mb-2">By Asset Class</h4>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataByClass}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {dataByClass.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} formatter={(value: number) => [formatCurrency(value), "Value"]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div>
                    <h4 className="text-center font-semibold text-white mb-2">By Region</h4>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataByRegion}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {dataByRegion.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS.slice().reverse()[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} formatter={(value: number) => [formatCurrency(value), "Value"]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </Card>
    );
};


// ================================================================================================
// RISK ASSESSMENT QUIZ COMPONENT
// ================================================================================================
export const RiskAssessmentQuiz: React.FC<{ onComplete: (profile: string) => void }> = ({ onComplete }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [result, setResult] = useState<string | null>(null);

    const handleAnswer = (score: number) => {
        const newAnswers = [...answers, score];
        setAnswers(newAnswers);

        if (currentQuestion < MOCK_RISK_QUIZ_QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            calculateResult(newAnswers);
        }
    };
    
    const calculateResult = (finalAnswers: number[]) => {
        const totalScore = finalAnswers.reduce((sum, score) => sum + score, 0);
        const avgScore = totalScore / finalAnswers.length;
        let profile = "Conservative";
        if (avgScore > 3.5) profile = "Aggressive";
        else if (avgScore > 2.5) profile = "Moderate";
        setResult(profile);
        onComplete(profile);
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setAnswers([]);
        setResult(null);
    };

    return (
        <Card title="Determine Your Investor Profile">
            {!result ? (
                <div>
                    <p className="text-sm text-gray-400 mb-4">
                        Question {currentQuestion + 1} of {MOCK_RISK_QUIZ_QUESTIONS.length}
                    </p>
                    <h4 className="text-lg font-semibold text-white mb-6">
                        {MOCK_RISK_QUIZ_QUESTIONS[currentQuestion].question}
                    </h4>
                    <div className="space-y-3">
                        {MOCK_RISK_QUIZ_QUESTIONS[currentQuestion].answers.map((answer, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswer(answer.score)}
                                className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {answer.text}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <h4 className="text-xl font-bold text-white">Your Investor Profile is:</h4>
                    <p className="text-3xl font-bold text-cyan-400 my-4">{result}</p>
                    <p className="text-gray-300">
                        This suggests a portfolio allocation tailored towards {result === 'Aggressive' ? 'high growth potential.' : result === 'Moderate' ? 'a balance of growth and stability.' : 'capital preservation and steady returns.'}
                    </p>
                    <button onClick={resetQuiz} className="mt-6 px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg">
                        Retake Quiz
                    </button>
                </div>
            )}
        </Card>
    );
};


// ================================================================================================
// FINANCIAL GOAL TRACKER
// ================================================================================================
export const GoalTracker: React.FC<{ goals: FinancialGoal[], onAddGoal: (goal: Omit<FinancialGoal, 'id'>) => void }> = ({ goals, onAddGoal }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const sortedGoals = [...goals].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    const GoalProgressBar: React.FC<{ goal: FinancialGoal }> = ({ goal }) => {
        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
        const daysRemaining = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

        return (
            <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex justify-between items-baseline mb-2">
                    <h4 className="font-semibold text-white">{goal.name}</h4>
                    <span className="text-sm text-gray-400">{daysRemaining} days left</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between items-baseline mt-2 text-sm">
                    <span className="text-gray-300">{formatCurrency(goal.currentAmount)}</span>
                    <span className="font-semibold text-white">{formatCurrency(goal.targetAmount)} ({progress.toFixed(1)}%)</span>
                </div>
            </div>
        );
    };

    return (
        <Card title="Financial Goals">
            <div className="space-y-4">
                {sortedGoals.map(goal => <GoalProgressBar key={goal.id} goal={goal} />)}
                <button onClick={() => setIsModalOpen(true)} className="w-full mt-4 py-2 border-2 border-dashed border-gray-600 hover:border-cyan-500 hover:text-cyan-500 text-gray-400 rounded-lg transition-colors">
                    + Add New Goal
                </button>
            </div>
            {/* A real app would have a modal component here to add a new goal */}
        </Card>
    );
};


// ================================================================================================
// MAIN VIEW COMPONENT: InvestmentsView (CapitalVista)
// ================================================================================================

const InvestmentsView: React.FC = () => {
    const context = useContext(DataContext);
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [selectedImpactAsset, setSelectedImpactAsset] = useState<Asset | null>(null);
    
    // State for new advanced features
    const [detailedAsset, setDetailedAsset] = useState<AdvancedAsset | null>(null);
    const [investorProfile, setInvestorProfile] = useState<string | null>(null);
    const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(MOCK_GOALS);
    
    // Using a ref to ensure mock data isn't re-initialized on every render
    const extendedAssetsRef = useRef<AdvancedAsset[]>(MOCK_ADVANCED_ASSETS);

    if (!context) {
        throw new Error("InvestmentsView must be within a DataProvider.");
    }

    const { assets, impactInvestments, addTransaction } = context;

    const totalValue = useMemo(() => extendedAssetsRef.current.reduce((sum, asset) => sum + asset.value, 0), [extendedAssetsRef.current]);

    const projectionData = useMemo(() => {
        let futureValue = totalValue;
        const data = [{ year: 'Now', value: futureValue }];
        const growthRate = investorProfile === 'Aggressive' ? 1.09 : investorProfile === 'Moderate' ? 1.07 : 1.05;
        for (let i = 1; i <= 10; i++) {
            futureValue = (futureValue + monthlyContribution * 12) * growthRate;
            data.push({ year: `Year ${i}`, value: futureValue });
        }
        return data;
    }, [totalValue, monthlyContribution, investorProfile]);

    const handleInvest = useCallback((assetName: string, amount: number) => {
        addTransaction({
            id: `tx_invest_${Date.now()}`,
            type: 'expense',
            category: 'Investments',
            description: `Invest in ${assetName}`,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
        });
        alert(`Successfully invested $${amount} in ${assetName}. See the new transaction in your history.`);
        
        // Mock updating the asset value
        const assetToUpdate = extendedAssetsRef.current.find(a => a.name === assetName);
        if (assetToUpdate) {
            assetToUpdate.value += amount;
            // Force a re-render by creating a new array reference
            extendedAssetsRef.current = [...extendedAssetsRef.current];
        }

    }, [addTransaction]);

    const handleAddGoal = (newGoal: Omit<FinancialGoal, 'id'>) => {
        setFinancialGoals(prev => [...prev, { ...newGoal, id: `g${Date.now()}` }]);
    };

    const handleViewDetails = (asset: AdvancedAsset) => {
        setDetailedAsset(asset);
    };

    return (
        <>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white tracking-wider">Investments (CapitalVista)</h2>

                <InvestmentPortfolio />

                {/* New Portfolio Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card title="Total Value" isMetric>
                        <p className="text-4xl font-bold text-white">{formatCurrency(totalValue)}</p>
                    </Card>
                     <Card title="24h Change" isMetric>
                        <p className="text-4xl font-bold text-green-400">+{formatCurrency(totalValue * 0.012)}</p>
                    </Card>
                     <Card title="YTD Performance" isMetric>
                        <p className="text-4xl font-bold text-green-400">+15.8%</p>
                    </Card>
                     <Card title="Investor Profile" isMetric>
                        <p className="text-4xl font-bold text-cyan-400">{investorProfile || 'Unknown'}</p>
                    </Card>
                </div>
                
                {/* My Holdings Section with Details */}
                <Card title="My Holdings">
                    <div className="divide-y divide-gray-700">
                        {extendedAssetsRef.current.map(asset => (
                            <div key={asset.ticker} className="py-3 grid grid-cols-3 md:grid-cols-5 gap-4 items-center">
                                <div className="col-span-2 md:col-span-2">
                                    <p className="font-semibold text-white">{asset.name}</p>
                                    <p className="text-sm text-gray-400">{asset.ticker}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-white">{formatCurrency(asset.value)}</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className={`font-mono ${asset.performanceYTD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {asset.performanceYTD.toFixed(2)}%
                                    </p>
                                    <p className="text-xs text-gray-500">YTD</p>
                                </div>
                                <div className="text-right">
                                    <button onClick={() => handleViewDetails(asset)} className="text-sm px-3 py-1 bg-gray-700 hover:bg-cyan-600 text-white rounded-md transition-colors">
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>


                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PortfolioDiversification assets={extendedAssetsRef.current} />
                    <RiskAssessmentQuiz onComplete={setInvestorProfile} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <Card title="AI Growth Simulator">
                            <div className="mb-4">
                                <label className="block text-sm text-gray-300">Monthly Contribution: <span className="font-bold text-white">${monthlyContribution.toLocaleString()}</span></label>
                                <input
                                    type="range"
                                    min="0"
                                    max="5000"
                                    step="100"
                                    value={monthlyContribution}
                                    onChange={e => setMonthlyContribution(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    aria-label="Monthly investment contribution"
                                />
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectionData}>
                                        <defs><linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                                        <XAxis dataKey="year" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" tickFormatter={(tick) => `$${(tick / 1000).toFixed(0)}k`} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} formatter={(value: number) => [`$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, "Projected Value"]} />
                                        <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="url(#colorGrowth)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <GoalTracker goals={financialGoals} onAddGoal={handleAddGoal} />
                    </div>
                </div>
                
                <Card title="Social Impact Investing (ESG)">
                    <p className="text-sm text-gray-400 mb-4">Invest in companies that align with your values. All options below are highly rated for their Environmental, Social, and Governance practices.</p>
                    <div className="space-y-4">
                        {impactInvestments.map(asset => (
                            <div key={asset.name} className="p-4 bg-gray-800/50 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4">
                                        <ESGScore rating={asset.esgRating || 0} />
                                        <h4 className="font-semibold text-white">{asset.name}</h4>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2">{asset.description}</p>
                                </div>
                                <button onClick={() => setSelectedImpactAsset(asset)} className="w-full sm:w-auto text-sm px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg transition-colors flex-shrink-0">
                                    Invest Now
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
                
                {/* Legacy Chart - kept for context */}
                <Card title="Asset Performance (YTD)">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assets} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" stroke="#9ca3af" domain={[0, 50]} unit="%" />
                                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={80} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                                <Bar dataKey="performanceYTD" name="YTD Performance">
                                    {assets.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            
            {/* Modals */}
            <InvestmentModal
                asset={selectedImpactAsset}
                onClose={() => setSelectedImpactAsset(null)}
                onInvest={handleInvest}
            />
            <DetailedAssetViewModal
                asset={detailedAsset}
                onClose={() => setDetailedAsset(null)}
                onInvest={handleInvest}
            />
        </>
    );
};

export default InvestmentsView;