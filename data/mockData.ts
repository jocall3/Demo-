import type { 
    Transaction, Asset, BudgetCategory, Subscription, CreditScore, 
    UpcomingBill, SavingsGoal, MarketMover, FinancialGoal, CryptoAsset, 
    PaymentOperation, CorporateCard, CorporateTransaction, RewardPoints, 
    Notification, RewardItem, APIStatus, CreditFactor, NFTAsset,
    AdvancedAsset, AssetClass, MarketRegion, AnalystRating, 
    HistoricalDataPoint, NewsArticle
} from '../types';
import { View } from '../types';

export const MOCK_TRANSACTIONS: Transaction[] = [
  // July
  { id: '1', type: 'expense', category: 'Dining', description: 'Coffee Shop', amount: 12.50, date: '2024-07-21', carbonFootprint: 1.2 },
  { id: '2', type: 'income', category: 'Salary', description: 'Paycheck', amount: 2500.00, date: '2024-07-20' },
  { id: '3', type: 'expense', category: 'Shopping', description: 'Online Store', amount: 89.99, date: '2024-07-19', carbonFootprint: 8.5 },
  { id: '4', type: 'expense', category: 'Utilities', description: 'Electricity Bill', amount: 75.30, date: '2024-07-18', carbonFootprint: 15.3 },
  { id: '5', type: 'expense', category: 'Transport', description: 'Gas Station', amount: 55.00, date: '2024-07-18', carbonFootprint: 25.1 },
  { id: '6', type: 'income', category: 'Freelance', description: 'Project ABC', amount: 500.00, date: '2024-07-17' },
  { id: '7', type: 'expense', category: 'Groceries', description: 'Supermarket', amount: 124.50, date: '2024-07-16', carbonFootprint: 12.8 },
  { id: '8', type: 'expense', category: 'Entertainment', description: 'Movie Tickets', amount: 30.00, date: '2024-07-15', carbonFootprint: 3.5 },
  // June
  { id: '9', type: 'income', category: 'Salary', description: 'Paycheck', amount: 2500.00, date: '2024-06-20' },
  { id: '10', type: 'expense', category: 'Rent', description: 'Monthly Rent', amount: 1200.00, date: '2024-06-01', carbonFootprint: 5.0 },
  { id: '11', type: 'expense', category: 'Shopping', description: 'New Tech Gadget', amount: 299.99, date: '2024-06-15', carbonFootprint: 14.2 },
  { id: '12', type: 'expense', category: 'Dining', description: 'Fancy Dinner', amount: 150.00, date: '2024-06-10', carbonFootprint: 8.1 },
  // May
  { id: '13', type: 'income', category: 'Salary', description: 'Paycheck', amount: 2500.00, date: '2024-05-20' },
  { id: '14', type: 'expense', category: 'Travel', description: 'Flight Tickets', amount: 450.00, date: '2024-05-12', carbonFootprint: 200.5 },
  { id: '15', type: 'expense', category: 'Rent', description: 'Monthly Rent', amount: 1200.00, date: '2024-05-01', carbonFootprint: 5.0 },
  // April
  { id: '16', type: 'income', category: 'Salary', description: 'Paycheck', amount: 2500.00, date: '2024-04-20' },
  { id: '17', type: 'expense', category: 'Rent', description: 'Monthly Rent', amount: 1200.00, date: '2024-04-01', carbonFootprint: 5.0 },
];

export const MOCK_ASSETS: Asset[] = [
  { name: 'Stocks', value: 40000, color: '#06b6d4', performanceYTD: 15.2 },
  { name: 'Bonds', value: 25000, color: '#6366f1', performanceYTD: 4.1 },
  { name: 'Crypto', value: 15000, color: '#f59e0b', performanceYTD: 45.8 },
  { name: 'Real Estate', value: 20000, color: '#10b981', performanceYTD: 8.5 },
];

export const MOCK_IMPACT_INVESTMENTS: Asset[] = [
    { name: 'TerraCycle', value: 0, color: '', esgRating: 5, description: 'Innovator in recycling and circular economy.' },
    { name: 'Patagonia Works', value: 0, color: '', esgRating: 5, description: 'Sustainable apparel and environmental activism.'},
    { name: 'Beyond Meat', value: 0, color: '', esgRating: 4, description: 'Plant-based foods to reduce climate impact.'},
    { name: 'Tesla, Inc.', value: 0, color: '', esgRating: 3, description: 'Accelerating the world\'s transition to sustainable energy.'}
];

export const MOCK_BUDGETS: BudgetCategory[] = [
  { id: 'dining', name: 'Dining', limit: 400, spent: 280, color: '#f59e0b' },
  { id: 'shopping', name: 'Shopping', limit: 600, spent: 410.50, color: '#6366f1' },
  { id: 'transport', name: 'Transport', limit: 200, spent: 95.20, color: '#10b981' },
  { id: 'utilities', name: 'Utilities', limit: 250, spent: 185.70, color: '#06b6d4' },
];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
    { id: 'sub1', name: 'QuantumFlix', amount: 15.99, nextPayment: '2024-08-01', iconName: 'video' },
    { id: 'sub2', name: 'SynthWave Music', amount: 9.99, nextPayment: '2024-08-05', iconName: 'music' },
    { id: 'sub3', name: 'CyberCloud Pro', amount: 24.99, nextPayment: '2024-08-10', iconName: 'cloud' },
];

export const MOCK_CREDIT_SCORE: CreditScore = {
    score: 780,
    change: 5,
    rating: 'Excellent',
};

export const MOCK_UPCOMING_BILLS: UpcomingBill[] = [
    { id: 'bill1', name: 'Credit Card', amount: 345.80, dueDate: '2024-08-15' },
    { id: 'bill2', name: 'Internet', amount: 80.00, dueDate: '2024-08-20' },
    { id: 'bill3', name: 'Car Payment', amount: 450.00, dueDate: '2024-08-25' },
];

export const MOCK_SAVINGS_GOALS: SavingsGoal[] = [
    { id: 'goal1', name: 'Cyberpunk Vacation', target: 5000, saved: 3250, iconName: 'plane' },
    { id: 'goal2', name: 'New Hoverboard', target: 2500, saved: 800, iconName: 'rocket' },
];

export const MOCK_MARKET_MOVERS: MarketMover[] = [
    { ticker: 'QNTM', name: 'Quantum Corp', price: 450.75, change: 12.55 },
    { ticker: 'CYBR', name: 'Cyberdyne Systems', price: 1024.10, change: 50.12 },
    { ticker: 'NRLNK', name: 'NeuroLink Inc.', price: 875.30, change: -5.60 },
];

export const MOCK_FINANCIAL_GOALS: FinancialGoal[] = [
    {
        id: 'goal_house_1',
        name: 'Down Payment for a Condo',
        targetAmount: 75000,
        targetDate: '2029-12-31',
        currentAmount: 12500,
        iconName: 'home',
        plan: null,
    },
    {
        id: 'goal_trip_1',
        name: 'Trip to Neo-Tokyo',
        targetAmount: 15000,
        targetDate: '2026-06-01',
        currentAmount: 8000,
        iconName: 'plane',
        plan: {
            feasibilitySummary: "Highly achievable! You are already on a great track to reach this goal ahead of schedule.",
            monthlyContribution: 450,
            steps: [
                { title: "Automate Savings", description: "Set up an automatic monthly transfer of $450 to your 'Trip to Neo-Tokyo' savings goal.", category: 'Savings' },
                { title: "Review Subscriptions", description: "Analyze your recurring subscriptions. Cancelling one or two could accelerate your goal.", category: 'Budgeting' },
                { title: "Explore Travel ETFs", description: "Consider investing a small portion of your savings in a travel and tourism focused ETF for potential growth.", category: 'Investing' }
            ]
        }
    },
    {
        id: 'goal_retirement_1',
        name: 'Retirement Fund',
        targetAmount: 1000000,
        targetDate: '2045-01-01',
        currentAmount: 250000,
        iconName: 'retirement',
        plan: null,
    }
];

export const MOCK_CRYPTO_ASSETS: CryptoAsset[] = [
  { ticker: 'BTC', name: 'Bitcoin', value: 34500, amount: 0.5, color: '#f7931a' },
  { ticker: 'ETH', name: 'Ethereum', value: 12000, amount: 4, color: '#627eea' },
  { ticker: 'SOL', name: 'Solana', value: 3500, amount: 25, color: '#00ffa3' },
];

export const MOCK_NFT_ASSETS: NFTAsset[] = [
    {
        id: 'nft_1',
        name: 'Quantum Vision Pass #001',
        imageUrl: '/IMG_5610.webp',
        contractAddress: '0x1a2b...c3d4'
    }
];

export const MOCK_PAYMENT_OPERATIONS: PaymentOperation[] = [
    { id: 'po_1', description: 'Stripe On-Ramp Batch #A42', amount: 25000, status: 'Completed', type: 'ACH', date: '2024-07-22' },
    { id: 'po_2', description: 'Crypto Payout to 0x...b4A2', amount: 5000, status: 'Completed', type: 'Crypto', date: '2024-07-22' },
    { id: 'po_3', description: 'Marqeta Card Funding', amount: 10000, status: 'Processing', type: 'Wire', date: '2024-07-23' },
    { id: 'po_4', description: 'Coinbase Withdrawal', amount: 12000, status: 'Initiated', type: 'ACH', date: '2024-07-23' },
    { id: 'po_5', description: 'Manual Adjustment', amount: -500, status: 'Failed', type: 'ACH', date: '2024-07-21' },
];

export const MOCK_REWARD_POINTS: RewardPoints = {
    balance: 85250,
    lastEarned: 320,
    lastRedeemed: 5000,
    currency: 'Points',
};

export const MOCK_CORPORATE_CARDS: CorporateCard[] = [
    { id: 'corp1', holderName: 'Alex Chen (Engineer)', cardNumberMask: '8431', status: 'Active', frozen: false, controls: { atm: true, contactless: true, online: true, monthlyLimit: 5000 } },
    { id: 'corp2', holderName: 'Brenda Rodriguez (Sales)', cardNumberMask: '5549', status: 'Active', frozen: false, controls: { atm: false, contactless: true, online: true, monthlyLimit: 10000 } },
    { id: 'corp3', holderName: 'Charles Davis (Marketing)', cardNumberMask: '1127', status: 'Suspended', frozen: true, controls: { atm: false, contactless: false, online: false, monthlyLimit: 2500 } },
    { id: 'corp4', holderName: 'Diana Wells (Operations)', cardNumberMask: '9882', status: 'Active', frozen: false, controls: { atm: true, contactless: true, online: false, monthlyLimit: 7500 } },
    { id: 'corp5', holderName: 'Ethan Gonzalez (HR)', cardNumberMask: '3019', status: 'Active', frozen: false, controls: { atm: true, contactless: true, online: true, monthlyLimit: 4000 } },
    { id: 'corp6', holderName: 'Fiona Kim (Product)', cardNumberMask: '7442', status: 'Active', frozen: false, controls: { atm: true, contactless: true, online: true, monthlyLimit: 6000 } },
    { id: 'corp7', holderName: 'George Patel (Legal)', cardNumberMask: '8821', status: 'Lost', frozen: true, controls: { atm: false, contactless: false, online: false, monthlyLimit: 3000 } },
    { id: 'corp8', holderName: 'Hannah Nguyen (Support)', cardNumberMask: '5096', status: 'Active', frozen: false, controls: { atm: false, contactless: true, online: true, monthlyLimit: 2000 } },
    { id: 'corp9', holderName: 'Ian Washington (Executive)', cardNumberMask: '1558', status: 'Active', frozen: false, controls: { atm: true, contactless: true, online: true, monthlyLimit: 20000 } },
    { id: 'corp10', holderName: 'Jasmine Lee (Data Science)', cardNumberMask: '4337', status: 'Active', frozen: false, controls: { atm: true, contactless: true, online: true, monthlyLimit: 8000 } },
];

export const MOCK_CORPORATE_TRANSACTIONS: CorporateTransaction[] = [
    { id: 'ctx1', cardId: 'corp1', holderName: 'Alex Chen', merchant: 'Cloud Services Inc.', amount: 199.99, status: 'Approved', timestamp: '2m ago' },
    { id: 'ctx2', cardId: 'corp2', holderName: 'Brenda Rodriguez', merchant: 'Steakhouse Prime', amount: 345.50, status: 'Approved', timestamp: '5m ago' },
    { id: 'ctx3', cardId: 'corp4', holderName: 'Diana Wells', merchant: 'Office Supplies Co.', amount: 89.20, status: 'Pending', timestamp: '8m ago' },
    { id: 'ctx4', cardId: 'corp1', holderName: 'Alex Chen', merchant: 'CodeEditor Pro', amount: 49.00, status: 'Approved', timestamp: '1h ago' },
    { id: 'ctx5', cardId: 'corp2', holderName: 'Brenda Rodriguez', merchant: 'Airport Taxi', amount: 75.00, status: 'Approved', timestamp: '3h ago' },
    { id: 'ctx6', cardId: 'corp5', holderName: 'Ethan Gonzalez', merchant: 'HR Software Subscription', amount: 150.00, status: 'Approved', timestamp: '5h ago' },
    { id: 'ctx7', cardId: 'corp6', holderName: 'Fiona Kim', merchant: 'UserTesting Platform', amount: 250.00, status: 'Approved', timestamp: '8h ago' },
    { id: 'ctx8', cardId: 'corp9', holderName: 'Ian Washington', merchant: 'Airline Tickets', amount: 1250.80, status: 'Approved', timestamp: '1d ago' },
    { id: 'ctx9', cardId: 'corp10', holderName: 'Jasmine Lee', merchant: 'Data Processing Unit', amount: 500.00, status: 'Pending', timestamp: '1d ago' },
    { id: 'ctx10', cardId: 'corp2', holderName: 'Brenda Rodriguez', merchant: 'Client Lunch', amount: 125.30, status: 'Approved', timestamp: '2d ago' },
    { id: 'ctx11', cardId: 'corp1', holderName: 'Alex Chen', merchant: 'Server Hosting', amount: 75.00, status: 'Approved', timestamp: '2d ago' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', message: 'Your credit score has increased by 5 points!', timestamp: '2h ago', read: false, view: View.CreditHealth },
  { id: '2', message: 'A large purchase of $299.99 at "New Tech Gadget" was detected.', timestamp: '1d ago', read: false, view: View.Transactions },
  { id: '3', message: 'You have earned 150 reward points from your recent spending.', timestamp: '3d ago', read: true, view: View.Rewards },
  { id: '4', message: 'Your "Dining" budget is at 85% capacity.', timestamp: '4d ago', read: true, view: View.Budgets },
];

export const MOCK_REWARD_ITEMS: RewardItem[] = [
    { id: 'rew1', name: '$25 Statement Credit', cost: 25000, type: 'cashback', description: 'Redeem points for a direct credit to your account balance.', iconName: 'cash' },
    { id: 'rew2', name: '$50 Tech Store Gift Card', cost: 45000, type: 'giftcard', description: 'Get a gift card for your favorite electronics retailer.', iconName: 'gift' },
    { id: 'rew3', name: 'Plant 5 Trees', cost: 10000, type: 'impact', description: 'Use your points to make a positive environmental impact.', iconName: 'leaf' },
];

export const MOCK_API_STATUS: APIStatus[] = [
    { provider: 'Plaid', status: 'Operational', responseTime: 120 },
    { provider: 'Stripe', status: 'Operational', responseTime: 85 },
    { provider: 'Marqeta', status: 'Operational', responseTime: 150 },
    { provider: 'Modern Treasury', status: 'Operational', responseTime: 110 },
    { provider: 'Google Gemini', status: 'Degraded Performance', responseTime: 450 },
];

export const MOCK_CREDIT_FACTORS: CreditFactor[] = [
    { name: 'Payment History', status: 'Excellent', description: 'You have no missed payments on record. Keep up the great work!' },
    { name: 'Credit Utilization', status: 'Good', description: 'Your credit utilization is 22%, which is good. Aim to keep it below 30%.' },
    { name: 'Credit Age', status: 'Good', description: 'Your average credit account age is 6 years. The longer, the better.' },
    { name: 'New Credit', status: 'Excellent', description: 'You have not opened any new credit lines recently, which is positive.' },
    { name: 'Credit Mix', status: 'Fair', description: 'Your credit mix could be improved with different types of loans, such as a mortgage.' },
];

// Helpers and data previously in InvestmentsView.tsx, now centralized.
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
