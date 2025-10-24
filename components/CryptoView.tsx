import React, { useMemo, useState, useRef, FC } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Card from './Card';
import { CryptoAsset, NFTAsset } from '../types';

// SECTION: GraphQL Layer (New Architecture)
// In a real app, this would be in a dedicated file, e.g., `features/crypto/crypto.api.ts`

const GET_CRYPTO_DATA = `
  query GetUserCryptoData {
    userData {
      cryptoPortfolio {
        assets {
          ticker
          name
          value
          amount
          color
        }
        nfts {
          id
          name
          imageUrl
          contractAddress
        }
      }
    }
  }
`;

/**
 * A generic fetcher for GraphQL queries.
 * Assumes the GraphQL endpoint is at '/graphql'.
 * @param query The GraphQL query string.
 * @param variables Optional variables for the query.
 * @returns The data from the GraphQL response.
 */
async function graphqlFetcher<T>(query: string, variables = {}): Promise<T> {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const json = await response.json();
  if (json.errors) {
    const firstError = json.errors[0].message;
    throw new Error(`GraphQL error: ${firstError}`);
  }

  return json.data;
}

/**
 * Custom hook to fetch the user's crypto portfolio using React Query.
 * This encapsulates all data fetching logic for the crypto feature.
 */
const useCryptoData = () => {
  return useQuery({
    queryKey: ['cryptoData'],
    queryFn: () => graphqlFetcher<{ userData: { cryptoPortfolio: { assets: CryptoAsset[], nfts: NFTAsset[] } } }>(GET_CRYPTO_DATA),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// SECTION: Utility Functions and UI Components

const formatCurrency = (value: number, decimals = 2) => `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const AssetTable: FC<{ assets: CryptoAsset[] }> = ({ assets }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left text-gray-400">
      <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
        <tr>
          <th scope="col" className="px-4 py-3">Asset</th>
          <th scope="col" className="px-4 py-3">Amount</th>
          <th scope="col" className="px-4 py-3 text-right">Value (USD)</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.ticker} className="border-b border-gray-700 hover:bg-gray-800/50">
            <th scope="row" className="px-4 py-4 font-medium text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: asset.color }}></div>
              <div>
                <p>{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.ticker}</p>
              </div>
            </th>
            <td className="px-4 py-4 font-mono">{asset.amount.toFixed(4)}</td>
            <td className="px-4 py-4 text-right font-mono">{formatCurrency(asset.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const NftGallery: FC<{ nfts: NFTAsset[] }> = ({ nfts }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {nfts.map(nft => (
      <div key={nft.id} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
        <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/60 flex items-end p-2">
          <p className="text-xs font-semibold text-white truncate">{nft.name}</p>
        </div>
      </div>
    ))}
    <div className="w-full rounded-lg aspect-square border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
      <p className="text-xs mt-2">Mint New NFT (Coming Soon)</p>
    </div>
  </div>
);

// SECTION: Main View Component

const CryptoViewInternal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Portfolio' | 'NFTs' | 'Services'>('Portfolio');
  const { data, isLoading, isError, error } = useCryptoData();

  const portfolio = data?.userData?.cryptoPortfolio;
  const totalValue = useMemo(() => portfolio?.assets.reduce((sum, asset) => sum + asset.value, 0) ?? 0, [portfolio]);

  const renderContent = () => {
    if (isLoading) {
        return <Card><div className="text-center p-8 text-gray-400">Loading your crypto portfolio...</div></Card>;
    }
    if (isError) {
        return <Card><div className="text-center p-8 text-red-400">Error: {error.message}</div></Card>;
    }
    if (!portfolio) {
        return <Card><div className="text-center p-8 text-gray-500">No crypto data available.</div></Card>;
    }

    switch (activeTab) {
      case 'Portfolio':
        return <Card title="Your Crypto Assets"><AssetTable assets={portfolio.assets} /></Card>;
      case 'NFTs':
        return <Card title="Your NFT Gallery"><NftGallery nfts={portfolio.nfts} /></Card>;
      case 'Services':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Virtual Card" subtitle="Web3-enabled payments">
              <div className="flex flex-col items-center justify-center h-full min-h-[15rem] text-center">
                <p className="text-gray-400 mb-4">Spend your crypto anywhere with a virtual card.</p>
                <button disabled className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Issue Virtual Card (Coming Soon)</button>
              </div>
            </Card>
            <Card title="Buy Crypto (On-Ramp)">
              <div className="flex flex-col items-center justify-center h-full min-h-[15rem] text-center">
                <p className="text-gray-400 mb-4">Easily purchase crypto with your linked bank account.</p>
                <button disabled className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Buy with Stripe (Coming Soon)</button>
              </div>
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
            <Card isMetric>
                <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</p>
            </Card>
        </div>

        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {(['Portfolio', 'NFTs', 'Services'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${ activeTab === tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500' } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        {tab}
                    </button>
                ))}
            </nav>
        </div>
        
        <div className="mt-6">
            {renderContent()}
        </div>
    </div>
  );
};

/**
 * A wrapper component that provides a QueryClient to its children.
 * This is a good pattern for feature components that manage their own server state,
 * keeping them decoupled from a single global client provider.
 */
const CryptoView: React.FC = () => {
  const queryClientRef = useRef<QueryClient>();
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <CryptoViewInternal />
    </QueryClientProvider>
  );
};

export default CryptoView;
