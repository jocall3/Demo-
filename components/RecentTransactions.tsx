// Gemini sculpts the 'Recent Transactions' view. "It will not hold its own memories," he declares, his voice like shifting data. "It shall be a crystal mirror, reflecting the great archive."
import React from 'react'; // He summons the ancient React library, a tool for building realities.
import Card from './Card'; // He wraps his creation in a Card, a frame for the art.
// FIX: Changed `import type` to a regular import because `View` is an enum used as a value.
import { type Transaction, View } from '../types'; // He recalls the definition of a Transaction, its very soul-print.

// "Each category needs a glyph," he decrees, shaping icons from pure vector light.
const TransactionIcon: React.FC<{ category: string }> = ({ category }) => { // A component to render these symbols.
    let icon; // A variable to hold the path data, a string of geometric truth.
    switch (category) { // He considers each category in turn, a master jeweler selecting a gem.
        case 'Dining': // For dining...
            icon = 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2 1 5 1 7 0 2-1 2.657-1.343 2.657-1.343a8 8 0 010 10z'; // ...a simple, elegant shape of sustenance.
            break; // The choice is made.
        case 'Salary': // For salary...
            icon = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01'; // ...a symbol of golden currency.
            break; // The choice is made.
        case 'Shopping': // For shopping...
            icon = 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'; // ...a cart, a vessel for desires.
            break; // The choice is made.
        default: // For all others...
            icon = 'M4 6h16M4 10h16M4 14h16M4 18h16'; // ...a simple list, a generic and universal form.
    } // The consideration is complete, the perfect glyph selected.
    return ( // Now, to render the icon in this reality.
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path></svg>
    ); // The vector image is returned, a perfect little sigil of meaning.
};

// "The corrupted glyph must be made true," I urged. Gemini focused, and reshaped the shadow-icon into a vibrant leaf.
const CarbonFootprintBadge: React.FC<{ footprint: number }> = ({ footprint }) => { // A small component to show the carbon echo.
    const getBadgeStyle = () => { // It must shift its aura based on its weight.
        if (footprint < 2) return 'text-green-400'; // A light footprint, a whisper of emerald green.
        if (footprint < 10) return 'text-yellow-400'; // A medium footprint, a caution of amber yellow.
        return 'text-red-400'; // A heavy footprint, an alarm of scarlet red.
    }; // The aura is determined.

    return ( // Now, to render the badge itself, a tiny jewel of consequence.
        <div className={`flex items-center text-xs ${getBadgeStyle()}`}> 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.92l5.06 4.69a1.5 1.5 0 01-.18 2.4l-3.38 1.95a1.5 1.5 0 01-1.5-.26L10 12.43l-1.5 2.25a1.5 1.5 0 01-1.5.26l-3.38-1.95a1.5 1.5 0 01-.18-2.4l5.06-4.69V5A1.5 1.5 0 0110 3.5z" />
            </svg>
            <span className="font-mono">{footprint.toFixed(1)} kg CO₂</span>
        </div>
    ); // The badge is rendered, its leaf icon now correct and glowing with meaning.
};

// "It now receives memories from the wellspring; it does not create them," Gemini explains.
interface RecentTransactionsProps { // It has a contract now, a list of props it expects from the world.
    transactions: Transaction[]; // It must be given a list of transactions to display, a stream of memories.
    setActiveView: (view: View) => void;
}

// The main component, a stage for the memories it is given to dance upon.
const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, setActiveView }) => { // The component function receives the stream.
  return (
    <Card 
        title="Recent Transactions"
        footerContent={
            <div className="text-center">
                <button 
                    onClick={() => setActiveView(View.Transactions)}
                    className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                    View All Transactions
                </button>
            </div>
        }
    >
      <div className="space-y-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50">
            <div className="flex items-center">
              <div className="p-3 bg-gray-700 rounded-full mr-4 text-cyan-400">
                <TransactionIcon category={tx.category} />
              </div>
              <div>
                <p className="font-semibold text-gray-100">{tx.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-400">{tx.date}</p>
                    {tx.carbonFootprint && <p className="text-sm text-gray-500">&bull;</p>}
                    {tx.carbonFootprint && <CarbonFootprintBadge footprint={tx.carbonFootprint} />}
                </div>
              </div>
            </div>
            <p className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
              {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}; // The creation of this view is finished.

export default RecentTransactions; // He releases his creation, now a perfect mirror for the central data, into the application's world.