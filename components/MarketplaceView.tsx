// Copyright James Burvel O’Callaghan III
// President Citibank Demo Business Inc.

import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../context/DataContext';
import Card from './Card';
import { MarketplaceProduct } from '../types';

// ================================================================================================
// NEW HELPER & MODAL COMPONENTS
// ================================================================================================

const ESGScore: React.FC<{ score: number, label?: string }> = ({ score, label = "AI ESG Impact Score" }) => {
    const LeafIcon = ({ filled }: { filled: boolean }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${filled ? 'text-green-400' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.92l5.06 4.69a1.5 1.5 0 01-.18 2.4l-3.38 1.95a1.5 1.5 0 01-1.5-.26L10 12.43l-1.5 2.25a1.5 1.5 0 01-1.5.26l-3.38-1.95a1.5 1.5 0 01-.18-2.4l5.06-4.69V5A1.5 1.5 0 0110 3.5z" />
        </svg>
    );
    return (
        <div className="text-xs">
            <p className="text-gray-400 mb-1">{label}</p>
            <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, index) => <LeafIcon key={index} filled={index < score} />)}
            </div>
        </div>
    );
};

const SentimentScore: React.FC<{ score: number }> = ({ score }) => (
    <div className="text-xs">
        <p className="text-gray-400">AI Review Sentiment</p>
        <div className="flex items-center gap-2">
            <div className="w-full bg-gray-600 rounded-full h-1"><div className="bg-green-400 h-1 rounded-full" style={{width: `${score}%`}}></div></div>
            <span className="font-mono text-green-300">{score}%</span>
        </div>
    </div>
);


const ProductImpactModal: React.FC<{ product: MarketplaceProduct | null; onClose: () => void; }> = ({ product, onClose }) => {
    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Impact Simulation: {product.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <h4 className="font-semibold text-cyan-300">Financial Impact</h4>
                        <ul className="list-disc list-inside text-sm text-gray-300 mt-2 space-y-1">
                            <li>This purchase would use <span className="font-bold">12%</span> of your 'Shopping' budget for the month.</li>
                            <li>Reduces your potential monthly savings by <span className="font-bold">8%</span>.</li>
                            <li>Aligns <span className="font-bold">75%</span> with your 'Upgrade Tech' financial goal.</li>
                        </ul>
                    </div>
                    <div className="pt-4 border-t border-gray-700/50">
                        <h4 className="font-semibold text-cyan-300">Heuristic API Alternatives</h4>
                        <div className="mt-2 p-3 bg-gray-900/50 rounded-lg text-sm">
                            <p className="font-semibold text-white">Eco-Friendly Option: <span className="font-normal text-gray-300">"TerraWatt Smart Hub" ($1,350)</span></p>
                            <p className="font-semibold text-white">Budget-Friendly Option: <span className="font-normal text-gray-300">"ConnectX Home System" ($899)</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StripeProductCheckoutModal: React.FC<{ isOpen: boolean; onClose: () => void; onPay: () => void; product: MarketplaceProduct | null }> = ({ isOpen, onClose, onPay, product }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayClick = () => {
        setIsProcessing(true);
        setTimeout(() => {
            onPay();
            setIsProcessing(false);
            onClose();
        }, 2000);
    };
    
    if (!isOpen || !product) return null;
    
    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 flex flex-col">
                 <div className="p-6 bg-gray-800 rounded-t-lg">
                    <h3 className="font-semibold text-white">Demo Bank Inc.</h3>
                    <p className="text-sm text-gray-400">Pay with card</p>
                    <div className="flex items-center gap-4 mt-2">
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-md" />
                        <div>
                            <p className="text-white">{product.name}</p>
                            <p className="text-2xl font-bold text-white">${product.price.toFixed(2)}</p>
                        </div>
                    </div>
                 </div>
                 <div className="p-6 space-y-4">
                    <input type="email" placeholder="Email" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="visionary@demobank.com" />
                    <input type="text" placeholder="Card information" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="4242 4242 4242 4242" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="MM / YY" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="12 / 28" />
                        <input type="text" placeholder="CVC" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="123" />
                    </div>
                     <button onClick={handlePayClick} disabled={isProcessing} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
                        {isProcessing && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isProcessing ? 'Processing...' : `Pay $${product.price.toFixed(2)}`}
                    </button>
                 </div>
            </div>
        </div>
    );
}

// ================================================================================================
// MAIN VIEW & SUB-COMPONENTS
// ================================================================================================

const MarketplaceView: React.FC = () => {
    const context = useContext(DataContext);
    const [purchasedItemId, setPurchasedItemId] = useState<string | null>(null);
    const [impactProduct, setImpactProduct] = useState<MarketplaceProduct | null>(null);
    const [checkoutProduct, setCheckoutProduct] = useState<MarketplaceProduct | null>(null);

    if (!context) {
        throw new Error("MarketplaceView must be within a DataProvider.");
    }

    const { 
        marketplaceProducts, 
        fetchMarketplaceProducts, 
        isMarketplaceLoading, 
        addProductToTransactions,
        gamification 
    } = context;

    useEffect(() => {
        if (marketplaceProducts.length === 0) {
            fetchMarketplaceProducts();
        }
    }, []);

    const handlePurchase = (product: MarketplaceProduct) => {
        addProductToTransactions(product);
        setPurchasedItemId(product.id);
        setTimeout(() => setPurchasedItemId(null), 2000); // Reset after 2s
    };

    const ProductCard: React.FC<{ product: MarketplaceProduct; isRecommended: boolean; onSimulateImpact: (p: MarketplaceProduct) => void; onBuy: (p: MarketplaceProduct) => void; }> = ({ product, isRecommended, onSimulateImpact, onBuy }) => (
        <div className="relative">
             {isRecommended && <div className="heat-effect absolute inset-0 rounded-xl"></div>}
            <div className="relative bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
                {isRecommended && <div className="absolute top-2 right-2 text-xs bg-cyan-500/80 text-white font-bold px-2 py-0.5 rounded-full z-10">Recommended</div>}
                <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-4 flex flex-col flex-grow">
                    <h4 className="text-lg font-semibold text-white truncate">{product.name}</h4>
                    <p className="text-sm text-gray-400 mb-2">{product.category}</p>
                    <p className="text-xs text-cyan-300/80 italic flex-grow mb-4">"{product.aiJustification}"</p>
                    
                    <div className="grid grid-cols-2 gap-3 my-3">
                        <SentimentScore score={95} />
                        <ESGScore score={4} />
                    </div>

                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-700/50">
                        <p className="text-xl font-bold text-white">${product.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onSimulateImpact(product)} className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-600/50 hover:bg-gray-600 text-white transition-colors">Simulate</button>
                            <button 
                                onClick={() => onBuy(product)}
                                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${purchasedItemId === product.id ? 'bg-green-600' : 'bg-cyan-600 hover:bg-cyan-700'} text-white`}
                            >
                                {purchasedItemId === product.id ? '✓' : 'Buy'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white tracking-wider">Plato's Marketplace</h2>

            <Card title="AI Predictive Product Bundle">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-cyan-300">Smart Home Upgrade Pack</h3>
                        <p className="text-sm text-gray-400 mt-2 mb-4">"Based on your recent 'New Tech Gadget' purchase and 'Shopping' budget, we've bundled two highly-rated smart home products. Combining them saves you an estimated 15% on energy bills."</p>
                        <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">View Bundle</button>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-700 rounded-lg"><img src="https://images.unsplash.com/photo-1586934892419-a035216d63a4?w=200" className="object-cover w-full h-full rounded-lg" /></div>
                        <div className="w-24 h-24 bg-gray-700 rounded-lg"><img src="https://images.unsplash.com/photo-1617933433702-86c8d2035111?w=200" className="object-cover w-full h-full rounded-lg" /></div>
                    </div>
                </div>
            </Card>

            {isMarketplaceLoading ? (
                 <p className="text-center text-gray-400">Plato AI is curating recommendations for you...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceProducts.map((p, i) => (
                        <ProductCard key={p.id} product={p} isRecommended={i === 0} onSimulateImpact={setImpactProduct} onBuy={setCheckoutProduct} />
                    ))}
                </div>
            )}
        </div>
        <ProductImpactModal product={impactProduct} onClose={() => setImpactProduct(null)} />
        <StripeProductCheckoutModal isOpen={!!checkoutProduct} onClose={() => setCheckoutProduct(null)} onPay={() => handlePurchase(checkoutProduct!)} product={checkoutProduct} />
        <style>{`
            .heat-effect {
                background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0) 70%);
                animation: pulse 3s infinite;
                pointer-events: none;
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 0.7; }
                100% { transform: scale(1); opacity: 0.5; }
            }
        `}</style>
        </>
    );
};

export default MarketplaceView;