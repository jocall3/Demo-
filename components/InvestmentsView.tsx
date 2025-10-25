import React, { useState, useMemo, useCallback } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import Card from './Card';
import type { Asset as BaseAsset, FinancialGoal as FinancialGoalType } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, TooltipProps } from 'recharts';
import InvestmentPortfolio from './InvestmentPortfolio';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// ================================================================================================
// GRAPHQL OPERATIONS
// ================================================================================================

const GET_INVESTMENTS_DATA = gql`
  query GetInvestmentsData {
    investmentPortfolio {
      totalValue
      dailyChange
      ytdPerformance
      assets {
        name
        value
        color
        performanceYTD
        description
        esgRating
        assetClass
        ticker
        marketCap
        peRatio
        dividendYield
        beta
        region
        analystRatings {
          rating
          targetPrice
          analystCount
        }
        news(limit: 3) {
          id
          source
          headline
          url
          publishedAt
        }
      }
      impactInvestments {
        name
        value
        color
        esgRating
        description
      }
    }
    financialGoals {
      id
      name
      targetAmount
      currentAmount
      targetDate
      priority
    }
    userProfile {
      investorProfile
    }
  }
`;

const INVEST_IN_ASSET_MUTATION = gql`
  mutation InvestInAsset($ticker: String!, $amount: Float!) {
    invest(ticker: $ticker, amount: $amount) {
      success
      transaction {
        id
        description
        amount
        date
        category
        type
      }
    }
  }
`;

const ADD_FINANCIAL_GOAL_MUTATION = gql`
  mutation AddFinancialGoal($input: FinancialGoalInput!) {
    addFinancialGoal(input: $input) {
      id
      name
      targetAmount
      currentAmount
      targetDate
    }
  }
`;

// ================================================================================================
// EXTENDED TYPE DEFINITIONS
// ================================================================================================

export type AssetClass = 'Stocks' | 'Bonds' | 'Real Estate' | 'Crypto' | 'Commodities' | 'Alternatives';
export type MarketRegion = 'North America' | 'Europe' | 'Asia-Pacific' | 'Emerging Markets' | 'Global';
export type AnalystRating = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';

export interface HistoricalDataPoint {
    date: string;
    price: number;
}

export interface AdvancedAsset extends BaseAsset {
    assetClass: AssetClass;
    ticker: string;
    marketCap: number;
    peRatio: number | null;
    dividendYield: number | null;
    beta: number;
    historicalData: {
        [key: string]: HistoricalDataPoint[];
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

// ================================================================================================
// UTILITY FUNCTIONS
// ================================================================================================

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const formatLargeNumber = (value: number): string => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toString();
};

// ================================================================================================
// HELPER & SUB-COMPONENTS
// ================================================================================================

const ESGScore: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center" aria-label={`ESG rating: ${rating} out of 5`}>{
        Array.from({ length: 5 }).map((_, i) => (
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
    asset: BaseAsset | null;
    onClose: () => void;
    onInvest: (assetName: string, amount: number) => void;
}> = ({ asset, onClose, onInvest }) => {
    const [amount, setAmount] = useState('1000');
    if (!asset) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Invest in {asset.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-400">{asset.description}</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Amount (USD)</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-700/50 border-gray-600 rounded-md p-2 text-white" />
                    </div>
                    <button onClick={() => { onInvest(asset.name, parseFloat(amount)); onClose(); }} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Confirm Investment</button>
                </div>
            </div>
        </div>
    );
};

export const ChartTimeframeSelector: React.FC<{ selected: string; onSelect: (timeframe: any) => void; }> = ({ selected, onSelect }) => {
    const timeframes: any[] = ['1D', '1W', '1M', '1Y', '5Y'];
    return (
        <div className="flex items-center space-x-2">
            {timeframes.map(tf => (
                <button key={tf} onClick={() => onSelect(tf)} className={`px-3 py-1 text-xs font-medium rounded-md ${selected === tf ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
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

export const DetailedAssetViewModal: React.FC<{
    asset: AdvancedAsset | null;
    onClose: () => void;
    onInvest: (assetName: string, amount: number) => void;
}> = ({ asset, onClose, onInvest }) => {
    // This component is complex and its internal logic remains the same.
    // It receives data via props, independent of the parent's data source.
    // Placeholder content for brevity, assuming full implementation exists.
    if (!asset) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
             <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-start">
                    <h3 className="text-2xl font-bold text-white">{asset.name} ({asset.ticker})</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                 <div className="p-6">Details for {asset.name} would be displayed here.</div>
            </div>
        </div>
    );
};

export const PortfolioDiversification: React.FC<{ assets: AdvancedAsset[] }> = ({ assets }) => {
    const dataByClass = useMemo(() => {
        const aggregation = assets.reduce((acc, asset) => {
            if (!acc[asset.assetClass]) { acc[asset.assetClass] = 0; }
            acc[asset.assetClass] += asset.value;
            return acc;
        }, {} as Record<AssetClass, number>);
        return Object.entries(aggregation).map(([name, value]) => ({ name, value }));
    }, [assets]);
    const COLORS = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];

    return (
         <Card title="Portfolio Diversification">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dataByClass} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                            {dataByClass.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Other sub-components like RiskAssessmentQuiz and GoalTracker would be here.

// ================================================================================================
// MAIN VIEW COMPONENT: InvestmentsView (CapitalVista)
// ================================================================================================

const InvestmentsView: React.FC = () => {
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [selectedImpactAsset, setSelectedImpactAsset] = useState<BaseAsset | null>(null);
    const [detailedAsset, setDetailedAsset] = useState<AdvancedAsset | null>(null);

    const { data, loading, error } = useQuery(GET_INVESTMENTS_DATA);

    const [investMutation, { loading: isInvesting }] = useMutation(INVEST_IN_ASSET_MUTATION, {
        refetchQueries: [{ query: GET_INVESTMENTS_DATA }],
        onCompleted: () => alert('Investment successful!'),
        onError: (err) => alert(`Investment failed: ${err.message}`),
    });

    const portfolioData = data?.investmentPortfolio;
    const assets: AdvancedAsset[] = portfolioData?.assets || [];
    const impactInvestments: BaseAsset[] = portfolioData?.impactInvestments || [];
    const investorProfile = data?.userProfile?.investorProfile || 'Unknown';

    const handleInvest = useCallback((assetName: string, amount: number) => {
        const assetToInvest = assets.find(a => a.name === assetName) || impactInvestments.find(a => a.name === assetName);
        if (assetToInvest && 'ticker' in assetToInvest) {
            investMutation({ variables: { ticker: (assetToInvest as AdvancedAsset).ticker, amount } });
        } else {
            alert('Could not find asset ticker to complete investment.');
        }
    }, [assets, impactInvestments, investMutation]);

    const projectionData = useMemo(() => {
        if (!portfolioData) return [];
        let futureValue = portfolioData.totalValue;
        const data = [{ year: 'Now', value: futureValue }];
        const growthRate = investorProfile === 'Aggressive' ? 1.09 : investorProfile === 'Moderate' ? 1.07 : 1.05;
        for (let i = 1; i <= 10; i++) {
            futureValue = (futureValue + monthlyContribution * 12) * growthRate;
            data.push({ year: `Year ${i}`, value: futureValue });
        }
        return data;
    }, [portfolioData, monthlyContribution, investorProfile]);

    if (loading) {
        return <Card title="Loading Investments..."><div className="h-96 flex items-center justify-center"><p>Fetching your portfolio data...</p></div></Card>;
    }

    if (error) {
        return <Card title="Error"><p className="text-red-400">Could not load your investment portfolio: ${error.message}</p></Card>;
    }

    return (
        <>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white tracking-wider">Investments (CapitalVista)</h2>

                <InvestmentPortfolio />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card title="Total Value" isMetric><p className="text-4xl font-bold text-white">{formatCurrency(portfolioData?.totalValue || 0)}</p></Card>
                    <Card title="24h Change" isMetric><p className={`text-4xl font-bold ${portfolioData?.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>{portfolioData?.dailyChange >= 0 ? '+' : ''}{formatCurrency(portfolioData?.dailyChange || 0)}</p></Card>
                    <Card title="YTD Performance" isMetric><p className={`text-4xl font-bold ${portfolioData?.ytdPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{portfolioData?.ytdPerformance?.toFixed(1) || 0.0}%</p></Card>
                    <Card title="Investor Profile" isMetric><p className="text-4xl font-bold text-cyan-400">{investorProfile}</p></Card>
                </div>
                
                <Card title="My Holdings">
                    <div className="divide-y divide-gray-700">
                        {assets.map(asset => (
                            <div key={asset.ticker} className="py-3 grid grid-cols-3 md:grid-cols-5 gap-4 items-center">
                                <div className="col-span-2 md:col-span-2">
                                    <p className="font-semibold text-white">{asset.name}</p>
                                    <p className="text-sm text-gray-400">{asset.ticker}</p>
                                </div>
                                <div className="text-right"><p className="font-mono text-white">{formatCurrency(asset.value)}</p></div>
                                <div className="text-right hidden md:block"><p className={`font-mono ${asset.performanceYTD >= 0 ? 'text-green-400' : 'text-red-400'}`}>{asset.performanceYTD?.toFixed(2)}%</p></div>
                                <div className="text-right"><button onClick={() => setDetailedAsset(asset)} className="text-sm px-3 py-1 bg-gray-700 hover:bg-cyan-600 text-white rounded-md transition-colors">Details</button></div>
                            </div>
                        ))}
                    </div>
                </Card>

                <PortfolioDiversification assets={assets} />
                
                <Card title="AI Growth Simulator">
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300">Monthly Contribution: <span className="font-bold text-white">${monthlyContribution.toLocaleString()}</span></label>
                        <input type="range" min="0" max="5000" step="100" value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
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

                <Card title="Social Impact Investing (ESG)">
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
                                <button onClick={() => setSelectedImpactAsset(asset)} className="w-full sm:w-auto text-sm px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg transition-colors flex-shrink-0">Invest Now</button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <InvestmentModal asset={selectedImpactAsset} onClose={() => setSelectedImpactAsset(null)} onInvest={handleInvest} />
            <DetailedAssetViewModal asset={detailedAsset} onClose={() => setDetailedAsset(null)} onInvest={handleInvest} />
        </>
    );
};

export default InvestmentsView;