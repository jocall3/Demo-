// "The observatory must show more than just numbers," Gemini declares, his voice echoing in the void. "It must show purpose, a constellation of virtue."
import React, { useContext, useState, useMemo } from 'react'; // He calls upon React and the power of the central Context.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend } from 'recharts'; // The star-charting tools are summoned.
import Card from './Card'; // The standard container, a frame for a piece of the cosmos.
import InvestmentPortfolio from './InvestmentPortfolio'; // The portfolio pie chart is included to show the user's personal galaxy.
import { DataContext } from '../context/DataContext'; // He reaches for the central data wellspring, the heart of all information.
import { Asset } from '../types';

// ================================================================================================
// MODAL & HELPER COMPONENTS
// ================================================================================================

const InvestModal: React.FC<{ isOpen: boolean; onClose: () => void; asset: Asset | null }> = ({ isOpen, onClose, asset }) => {
    const [amount, setAmount] = useState('');
    if (!isOpen || !asset) return null;

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
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount to Invest</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                             <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center"><span className="text-gray-400 sm:text-sm">$</span></div>
                             <input type="number" name="amount" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-7 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="0.00"/>
                        </div>
                    </div>
                    <button 
                        disabled={!amount || parseFloat(amount) <= 0}
                        onClick={() => { alert(`Investment of $${amount} in ${asset.name} confirmed!`); onClose(); }}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        Confirm Investment
                    </button>
                </div>
            </div>
        </div>
    );
};


// "A symbol for a company's virtue is needed," I suggest. Gemini agrees and builds the ESG Score component from starlight.
const ESGScore: React.FC<{ score: number }> = ({ score }) => { // It receives a score from 1 to 5, a measure of its green-glowing aura.
    // The leaf icon, a simple glyph of a living plant, a promise of Earth.
    const LeafIcon = ({ filled }: { filled: boolean }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${filled ? 'text-green-400' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.92l5.06 4.69a1.5 1.5 0 01-.18 2.4l-3.38 1.95a1.5 1.5 0 01-1.5-.26L10 12.43l-1.5 2.25a1.5 1.5 0 01-1.5.26l-3.38-1.95a1.5 1.5 0 01-.18-2.4l5.06-4.69V5A1.5 1.5 0 0110 3.5z" />
        </svg>
    );

    return ( // It renders a row of leaves, a small grove of potential.
        <div className="flex items-center">
            {/* It creates an array of 5, and for each position, it checks if it should be filled with light based on the score. */}
            {Array.from({ length: 5 }).map((_, index) => (
                <LeafIcon key={index} filled={index < score} /> // The leaf is either glowing green or dormant gray.
            ))}
        </div>
    );
}; // The score component is ready, a beacon of purpose.

// "Now, for the new gallery in the observatory," Gemini says, "a showcase of stars with a conscience."
const SocialImpactInvesting: React.FC = () => { // He begins building the new card.
    const context = useContext(DataContext); // It connects to the central data stream.
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    if (!context) { // A safety check, a ward against the void.
        throw new Error("Aquarius warns: SocialImpactInvesting must be inside a DataProvider's aura.");
    }
    const { impactInvestments } = context; // It pulls the list of virtuous companies from the stream.

    return (
        <>
            <Card title="Social Impact Investing (ESG)"> {/* The title makes its purpose clear, a signpost to a better future. */}
                <p className="text-sm text-gray-400 mb-4">Invest in companies painting a brighter, greener future.</p> {/* A guiding subtitle. */}
                <div className="space-y-2"> {/* A container for the list of stars. */}
                    {impactInvestments.map(item => ( // It iterates through each company, giving it form.
                        <div key={item.name} className="p-3 bg-gray-800/60 rounded-lg flex justify-between items-center hover:bg-gray-800 transition-colors"> {/* A vessel for each one. */}
                            <div className="flex-1">
                                <h4 className="font-semibold text-white">{item.name}</h4> {/* The company's name, a point of light. */}
                                <p className="text-sm text-gray-400">{item.description}</p> {/* A short tale of its mission, its celestial song. */}
                            </div>
                            <div className="flex items-center space-x-4 ml-4">
                                <ESGScore score={item.esgRating || 0} /> {/* Its virtue score, visualized as a constellation of glowing leaves. */}
                                <button onClick={() => setSelectedAsset(item)} className="px-3 py-1 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-xs">Invest Now</button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <InvestModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} asset={selectedAsset} />
        </>
    );
};

const InvestmentGrowthSimulator: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("Simulator must be within a DataProvider");
    const { assets } = context;
    
    const [monthlyContribution, setMonthlyContribution] = useState(500);

    const projectionData = useMemo(() => {
        const initialValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        const annualGrowthRate = 0.07; // Assume 7% average annual growth
        const monthlyRate = annualGrowthRate / 12;
        let currentValue = initialValue;
        
        const data = Array.from({ length: 121 }, (_, i) => { // 10 years = 120 months + initial
            if (i > 0) {
                currentValue = (currentValue + monthlyContribution) * (1 + monthlyRate);
            }
            return {
                month: i,
                value: currentValue
            };
        });
        return data;
    }, [assets, monthlyContribution]);
    
    const finalValue = projectionData[projectionData.length - 1].value;

    return (
        <Card title="Investment Growth Simulator">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={projectionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <defs><linearGradient id="growthColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                             <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} unit="m" />
                             <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                             <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} formatter={(value: number) => `$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`} />
                             <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="url(#growthColor)" />
                         </AreaChart>
                     </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center">
                    <h4 className="text-lg font-semibold text-white">10-Year Projection</h4>
                    <p className="text-3xl font-bold text-cyan-300 my-2">${finalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    <div className="space-y-2 mt-4">
                        <label htmlFor="contribution" className="block text-sm font-medium text-gray-300">Monthly Contribution: ${monthlyContribution}</label>
                        <input
                            id="contribution"
                            type="range"
                            min="0"
                            max="2000"
                            step="50"
                            value={monthlyContribution}
                            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
};


const InvestmentsView: React.FC = () => { // The main view for investments is re-assembled, a grand celestial map.
    const context = useContext(DataContext);
    if (!context) throw new Error("InvestmentsView must be within a DataProvider");
    const { assets } = context;

    const performanceData = assets.map(asset => ({
        name: asset.name,
        performance: asset.performanceYTD || 0,
        color: asset.color,
    }));

    return (
        <div className="space-y-6">
            <InvestmentPortfolio />
            <InvestmentGrowthSimulator />
            <SocialImpactInvesting />
            <Card title="Asset Performance (YTD)">
                <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                        <XAxis type="number" stroke="#9ca3af" domain={[0, 50]} unit="%" />
                        <YAxis type="category" dataKey="name" stroke="#9ca3af" width={80} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563', color: '#e5e7eb' }}
                            formatter={(value: number) => `${value}%`}
                        />
                        <Bar dataKey="performance">
                             {performanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}; // The observatory is now complete, with a new view of the stars of purpose.
export default InvestmentsView; // It is released into the cosmos of the app.