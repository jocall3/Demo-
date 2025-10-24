// components/RecentTransactions.tsx
// REFACTORED: This component is now self-contained and data-aware.
// It fetches its own data via a custom hook, manages its own loading/error states,
// and encapsulates its detail view modal, adhering to the new architectural directive.

import React, { useState, useEffect } from 'react';
import Card from './Card';
import { Transaction, View } from '../types';
import { MOCK_TRANSACTIONS } from '../data/mockData';

// ===================================================================================
// ARCHITECTURAL NOTE: In a real React Query implementation, the service layer and
// custom hook would exist in separate files. They are included here for demonstration.
//
// --- Service Layer (e.g., /services/transactionService.ts) ---
/*
  export const transactionService = {
    getRecent: async (limit: number = 5): Promise<Transaction[]> => {
      // The BFF is expected to sort by date descending.
      const response = await fetch(`/api/transactions?_limit=${limit}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }
  };
*/
//
// --- Custom Hook (e.g., /hooks/useTransactions.ts) ---
/*
  import { useQuery } from '@tanstack/react-query';
  import { transactionService } from '../services/transactionService';
  
  export const useTransactions = (limit: number = 5) => {
    return useQuery<Transaction[], Error>({
      queryKey: ['transactions', 'recent', limit],
      queryFn: () => transactionService.getRecent(limit),
    });
  };
*/
// ===================================================================================

/**
 * MOCK useQuery HOOK for DEMONSTRATION
 * This simulates the behavior of React Query for this file.
 */
const useQuery = (queryKey: any[]) => {
  const [data, setData] = useState<Transaction[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate API call success/failure
        if (Math.random() < 0.1) { // 10% chance of failure
          throw new Error("Failed to fetch from simulated API.");
        }
        
        // Return sorted and limited mock data
        const sorted = [...MOCK_TRANSACTIONS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setData(sorted.slice(0, 5));

      } catch (err) {
        setIsError(true);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryKey)]); // Re-run if queryKey changes

  return { data, isLoading, isError, error };
};


// --- UI Sub-components ---

const TransactionIcon: React.FC<{ category: string }> = ({ category }) => {
    let iconPath;
    switch (category) {
        case 'Dining':
            iconPath = "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2 1 5 1 7 0 2-1 2.657-1.343 2.657-1.343a8 8 0 010 10z";
            break;
        case 'Salary':
        case 'Freelance':
            iconPath = "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01";
            break;
        case 'Shopping':
            iconPath = "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z";
            break;
        case 'Groceries':
            iconPath = "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z";
            break;
        case 'Utilities':
            iconPath = "M13 10V3L4 14h7v7l9-11h-7z";
            break;
        case 'Transport':
            iconPath = "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M12 11a3 3 0 100-6 3 3 0 000 6z";
            break;
        case 'Entertainment':
            iconPath = "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z";
            break;
        case 'Rent':
            iconPath = "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6";
            break;
        case 'Travel':
            iconPath = 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8';
            break;
        default:
            iconPath = "M4 6h16M4 10h16M4 14h16M4 18h16";
    }
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath}></path></svg>
    );
};

const CarbonFootprintBadge: React.FC<{ footprint: number }> = ({ footprint }) => {
    const getBadgeStyle = () => {
        if (footprint < 2) return 'text-green-400';
        if (footprint < 10) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className={`flex items-center text-xs ${getBadgeStyle()}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.92l5.06 4.69a1.5 1.5 0 01-.18 2.4l-3.38 1.95a1.5 1.5 0 01-1.5-.26L10 12.43l-1.5 2.25a1.5 1.5 0 01-1.5.26l-3.38-1.95a1.5 1.5 0 01-.18-2.4l5.06-4.69V5A1.5 1.5 0 0110 3.5z" />
            </svg>
            <span className="font-mono">{footprint.toFixed(1)} kg CO₂</span>
        </div>
    );
};

const TransactionDetailModal: React.FC<{ transaction: Transaction | null; onClose: () => void }> = ({ transaction, onClose }) => {
    if (!transaction) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Transaction Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Description:</span> <span className="text-white font-semibold">{transaction.description}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Amount:</span> <span className={`font-mono font-semibold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Date:</span> <span className="text-white">{transaction.date}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Category:</span> <span className="text-white">{transaction.category}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Transaction ID:</span> <span className="text-white font-mono text-xs">{transaction.id}</span></div>
                    {transaction.carbonFootprint && <div className="flex justify-between text-sm"><span className="text-gray-400">Carbon Footprint:</span> <span className="text-green-300">{transaction.carbonFootprint.toFixed(1)} kg CO₂</span></div>}
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---

interface RecentTransactionsProps {
  setActiveView: (view: View) => void;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ setActiveView }) => {
  const { data: transactions, isLoading, isError, error } = useQuery(['transactions', 'recent', 5]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const onViewAllClick = () => {
    setActiveView(View.Transactions);
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center p-2 animate-pulse">
              <div className="p-3 bg-gray-700 rounded-full mr-4 w-12 h-12 flex-shrink-0"></div>
              <div className="flex-grow">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-5 bg-gray-700 rounded w-1/4 ml-4"></div>
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-center py-8 text-red-400">
          <p>Could not load transactions.</p>
          <p className="text-xs mt-1">{error?.message}</p>
        </div>
      );
    }
    
    if (!transactions || transactions.length === 0) {
        return <p className="text-center py-8 text-gray-500">No recent transactions found.</p>
    }

    return (
      <div className="space-y-4">
        {transactions.map((tx: Transaction) => (
          <div key={tx.id} onClick={() => setSelectedTransaction(tx)} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors">
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
    );
  }

  return (
    <>
      <Card 
          title="Recent Transactions"
          footerContent={
              <div className="text-center">
                  <button 
                      onClick={onViewAllClick}
                      className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                  >
                      View All Transactions
                  </button>
              </div>
          }
      >
        {renderContent()}
      </Card>
      <TransactionDetailModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
    </>
  );
};

export default RecentTransactions;
