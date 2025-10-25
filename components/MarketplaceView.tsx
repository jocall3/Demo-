import React, { useState, useEffect, useReducer, useCallback, useMemo, FC, ChangeEvent, FormEvent, ReactNode } from 'react';
import Card from './Card';
import { gql, useQuery } from '@apollo/client';

//================================================================================================
// TYPE DEFINITIONS (TSDoc for all exported types as per architectural directive)
//================================================================================================

/**
 * @interface AgentAuthor
 * @description Represents the author or publisher of an AI agent.
 * @property {string} id - The unique identifier for the author.
 * @property {string} name - The author's display name.
 * @property {string} avatarUrl - URL for the author's profile picture.
 * @property {string} profileUrl - URL to the author's public profile or website.
 * @property {boolean} verified - Indicates if the author is a verified publisher.
 * @property {string} bio - A short biography of the author.
 * @property {number} agentsPublished - The total number of agents published by this author.
 */
export interface AgentAuthor {
    id: string;
    name: string;
    avatarUrl: string;
    profileUrl: string;
    verified: boolean;
    bio: string;
    agentsPublished: number;
}

/**
 * @interface AgentReview
 * @description Represents a user review for an AI agent.
 * @property {string} id - The unique identifier for the review.
 * @property {{ name: string; avatarUrl: string }} author - The author of the review.
 * @property {number} rating - The star rating from 1 to 5.
 * @property {string} comment - The text content of the review.
 * @property {string} createdAt - The ISO 8601 date string when the review was posted.
 * @property {number} helpfulVotes - The number of users who found this review helpful.
 */
export interface AgentReview {
    id: string;
    author: {
        name: string;
        avatarUrl: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
    helpfulVotes: number;
}

/**
 * @interface AgentPricing
 * @description Represents the pricing model for an AI agent.
 * @property {'one-time' | 'subscription' | 'free'} type - The type of pricing model.
 * @property {number} amount - The price in USD. 0 if free.
 * @property {'monthly' | 'yearly'} [subscriptionInterval] - Required if type is 'subscription'.
 */
export interface AgentPricing {
    type: 'one-time' | 'subscription' | 'free';
    amount: number;
    subscriptionInterval?: 'monthly' | 'yearly';
}

/**
 * @interface AgentSpecs
 * @description Technical specifications for an AI agent.
 */
export interface AgentSpecs {
    version: string;
    releaseDate: string;
    requiredApiVersion: string;
    dependencies: string[];
    supportedLanguages: string[];
    computeRequirements: {
        cpu: string;
        ram: string;
        gpu?: string;
    };
}

/**
 * @interface AgentChangelogEntry
 * @description Represents a single version entry in an agent's changelog.
 */
export interface AgentChangelogEntry {
    version: string;
    releaseDate: string;
    changes: string[];
}

/**
 * @interface Agent
 * @description The core interface for an AI Agent in the marketplace.
 */
export interface Agent {
    id: string;
    name: string;
    author: AgentAuthor;
    category: string;
    tags: string[];
    shortDescription: string;
    longDescription: string;
    imageUrl: string;
    rating: number;
    reviewCount: number;
    reviews: AgentReview[];
    pricing: AgentPricing;
    specs: AgentSpecs;
    changelog: AgentChangelogEntry[];
    downloads: number;
    createdAt: string;
    updatedAt: string;
    featured: boolean;
    documentationUrl: string;
    demoUrl?: string;
}

//================================================================================================
// MOCK DATA GENERATION (To simulate a real backend and populate the UI)
//================================================================================================

const MOCK_AUTHORS: AgentAuthor[] = [
    { id: 'author-1', name: 'SynthCore Labs', avatarUrl: 'https://i.pravatar.cc/40?u=synthcore', profileUrl: '#', verified: true, bio: 'Pioneering AI for financial markets.', agentsPublished: 5 },
    { id: 'author-2', name: 'DataWeaver Inc.', avatarUrl: 'https://i.pravatar.cc/40?u=dataweaver', profileUrl: '#', verified: true, bio: 'Weaving intelligence from raw data.', agentsPublished: 8 },
    { id: 'author-3', name: 'LogicForge AI', avatarUrl: 'https://i.pravatar.cc/40?u=logicforge', profileUrl: '#', verified: false, bio: 'Crafting bespoke AI solutions for business automation.', agentsPublished: 3 },
    { id: 'author-4', name: 'QuantumLeap AI', avatarUrl: 'https://i.pravatar.cc/40?u=quantumleap', profileUrl: '#', verified: true, bio: 'Next-generation AI for complex problem solving.', agentsPublished: 12 },
    { id: 'author-5', name: 'Eva Neuro', avatarUrl: 'https://i.pravatar.cc/40?u=eva', profileUrl: '#', verified: false, bio: 'Independent researcher focusing on NLP agents.', agentsPublished: 2 },
];

const MOCK_CATEGORIES = ['Finance', 'Marketing', 'Data Analysis', 'Customer Support', 'Content Creation', 'Code Generation', 'Personal Assistant'];
const MOCK_TAGS = ['stocks', 'crypto', 'reporting', 'automation', 'seo', 'chat', 'email', 'analytics', 'python', 'api', 'research', 'summarization', 'forecasting'];
const MOCK_COMMENTS = [
    "This agent transformed our workflow. Highly recommended!",
    "Decent, but has a steep learning curve.",
    "A game-changer for our marketing team. The automation capabilities are top-notch.",
    "Could use more documentation, but the support team was helpful.",
    "It's good for the price, but lacks some advanced features.",
    "Incredible performance and very reliable. Has not failed us once.",
];

/**
 * @function generateMockAgents
 * @description A utility function to generate a large set of mock agents for UI demonstration.
 * @param {number} count - The number of agents to generate.
 * @returns {Agent[]} An array of mock `Agent` objects.
 */
export const generateMockAgents = (count: number): Agent[] => {
    const agents: Agent[] = [];
    for (let i = 1; i <= count; i++) {
        const author = MOCK_AUTHORS[i % MOCK_AUTHORS.length];
        const category = MOCK_CATEGORIES[i % MOCK_CATEGORIES.length];
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const reviews: AgentReview[] = Array.from({ length: Math.floor(Math.random() * 50) + 5 }, (_, k) => ({
            id: `review-${i}-${k}`,
            author: { name: `User ${k + 1}`, avatarUrl: `https://i.pravatar.cc/40?u=reviewuser${i}_${k}` },
            rating: Math.floor(Math.random() * 3) + 3,
            comment: MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)],
            createdAt: new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())).toISOString(),
            helpfulVotes: Math.floor(Math.random() * 100),
        }));

        const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
        const pricingType = ['one-time', 'subscription', 'free'][i % 3] as 'one-time' | 'subscription' | 'free';
        const pricing: AgentPricing = {
            type: pricingType,
            amount: pricingType === 'free' ? 0 : (pricingType === 'one-time' ? Math.floor(Math.random() * 400) + 99 : Math.floor(Math.random() * 90) + 9),
            ...(pricingType === 'subscription' && { subscriptionInterval: ['monthly', 'yearly'][i % 2] as 'monthly' | 'yearly' })
        };
        
        agents.push({
            id: `agent-${i}`,
            name: `${category} Master Agent ${i}`,
            author,
            category,
            tags: [...new Set(Array.from({ length: Math.floor(Math.random() * 3) + 2 }, () => MOCK_TAGS[Math.floor(Math.random() * MOCK_TAGS.length)]))],
            shortDescription: `An autonomous AI agent specializing in ${category.toLowerCase()} tasks and automation.`,
            longDescription: `This is a comprehensive description for the ${category} Master Agent ${i}. It leverages state-of-the-art machine learning models to provide unparalleled insights and automation capabilities.`,
            imageUrl: `https://picsum.photos/seed/agent${i}/600/400`,
            rating: parseFloat(avgRating.toFixed(1)),
            reviewCount: reviews.length,
            reviews,
            pricing,
            specs: { version: '1.2.0', releaseDate: new Date().toISOString(), requiredApiVersion: 'v2.1', dependencies: ['Node.js v18+', 'Python 3.9+'], supportedLanguages: ['English', 'Spanish'], computeRequirements: { cpu: '4 cores', ram: '16GB' } },
            changelog: [{ version: '1.2.0', releaseDate: new Date().toISOString(), changes: ['Added new API integration.'] }, { version: '1.1.0', releaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), changes: ['Initial support for multi-language output.'] }],
            downloads: Math.floor(Math.random() * 10000) + 500,
            createdAt: createdAt.toISOString(),
            updatedAt: new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())).toISOString(),
            featured: i % 10 === 0,
            documentationUrl: '#',
            demoUrl: i % 5 === 0 ? '#' : undefined,
        });
    }
    return agents;
};

const MOCK_AGENTS = generateMockAgents(50);

//================================================================================================
// GRAPHQL & STATE MANAGEMENT
//================================================================================================

const GET_MARKETPLACE_AGENTS = gql`
  query GetMarketplaceAgents {
    marketplaceAgents {
      id
      name
      author { id name avatarUrl verified }
      category
      tags
      shortDescription
      imageUrl
      rating
      reviewCount
      downloads
      pricing { type amount subscriptionInterval }
    }
  }
`;

export type FilterState = { searchQuery: string; categories: Set<string>; minRating: number; maxPrice: number; pricingTypes: Set<AgentPricing['type']>; tags: Set<string>; verifiedAuthor: boolean; };
export type FilterAction = | { type: 'SET_SEARCH_QUERY'; payload: string } | { type: 'TOGGLE_CATEGORY'; payload: string } | { type: 'SET_MIN_RATING'; payload: number } | { type: 'SET_MAX_PRICE'; payload: number } | { type: 'TOGGLE_PRICING_TYPE'; payload: AgentPricing['type'] } | { type: 'TOGGLE_TAG'; payload: string } | { type: 'TOGGLE_VERIFIED_AUTHOR' } | { type: 'RESET_FILTERS' };

export const initialFilterState: FilterState = { searchQuery: '', categories: new Set(), minRating: 0, maxPrice: 500, pricingTypes: new Set(), tags: new Set(), verifiedAuthor: false };

/**
 * @function filterReducer
 * @description A reducer function to manage the complex state of marketplace filters.
 * @param {FilterState} state - The current filter state.
 * @param {FilterAction} action - The action to perform.
 * @returns {FilterState} The new filter state.
 */
export function filterReducer(state: FilterState, action: FilterAction): FilterState {
    switch (action.type) {
        case 'SET_SEARCH_QUERY': return { ...state, searchQuery: action.payload };
        case 'TOGGLE_CATEGORY': { const newSet = new Set(state.categories); if (newSet.has(action.payload)) newSet.delete(action.payload); else newSet.add(action.payload); return { ...state, categories: newSet }; }
        case 'SET_MIN_RATING': return { ...state, minRating: action.payload };
        case 'SET_MAX_PRICE': return { ...state, maxPrice: action.payload };
        case 'TOGGLE_PRICING_TYPE': { const newSet = new Set(state.pricingTypes); if (newSet.has(action.payload)) newSet.delete(action.payload); else newSet.add(action.payload); return { ...state, pricingTypes: newSet }; }
        case 'TOGGLE_TAG': { const newSet = new Set(state.tags); if (newSet.has(action.payload)) newSet.delete(action.payload); else newSet.add(action.payload); return { ...state, tags: newSet }; }
        case 'TOGGLE_VERIFIED_AUTHOR': return { ...state, verifiedAuthor: !state.verifiedAuthor };
        case 'RESET_FILTERS': return initialFilterState;
        default: return state;
    }
}

//================================================================================================
// UI SUB-COMPONENTS
//================================================================================================

const SearchBar: FC<{ query: string; onSearch: (query: string) => void }> = ({ query, onSearch }) => (
    <div className="relative">
        <input type="text" value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)} placeholder="Search for agents by name, tag, or description..." className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-4 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
    </div>
);

const AgentCard: FC<{ agent: Agent; onSelect: (agent: Agent) => void }> = ({ agent, onSelect }) => (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer flex flex-col" onClick={() => onSelect(agent)}>
        <img className="w-full h-40 object-cover bg-gray-700" src={agent.imageUrl} alt={agent.name} />
        <div className="p-4 flex flex-col flex-grow">
            <p className="text-sm text-cyan-400">{agent.category}</p>
            <h3 className="text-lg font-semibold text-white mt-1 truncate">{agent.name}</h3>
            <p className="text-xs text-gray-400 mt-2 flex-grow">{agent.shortDescription}</p>
            <div className="flex items-center mt-4">
                <img src={agent.author.avatarUrl} alt={agent.author.name} className="h-6 w-6 rounded-full mr-2" />
                <span className="text-sm text-gray-400 truncate">{agent.author.name}</span>
                {agent.author.verified && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500 ml-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44-1.22a.75.75 0 00-1.06 0L8.25 6.19 6.31 4.25a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l4.5-4.5a.75.75 0 000-1.06z" clipRule="evenodd" /></svg>}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center text-sm"><StarRating rating={agent.rating} /><span className="text-gray-400 ml-2">({agent.reviewCount})</span></div>
                <div className="text-lg font-bold text-green-400">{agent.pricing.type === 'free' ? 'Free' : `$${agent.pricing.amount}`}{agent.pricing.type === 'subscription' && <span className="text-xs text-gray-400">/{agent.pricing.subscriptionInterval === 'monthly' ? 'mo' : 'yr'}</span>}</div>
            </div>
        </div>
    </div>
);

// Other helpers like StarRating, Modal, etc. would go here. For brevity, they are assumed or simplified.
const Star: FC<{ filled?: boolean; half?: boolean }> = ({ filled, half }) => <div className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-gray-600'}`}>{half ? 'half' : filled ? '★' : '☆'}</div>;
const StarRating: FC<{ rating: number; className?: string }> = ({ rating }) => <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} filled={i < rating} />)}</div>;

//================================================================================================
// MAIN COMPONENT
//================================================================================================

/**
 * @component MarketplaceView
 * @description A comprehensive view for browsing, filtering, and discovering AI agents.
 * This component demonstrates advanced state management with `useReducer` for filtering,
 * `useMemo` for performance optimization, and integration with GraphQL for data fetching.
 * @returns {React.ReactElement} The rendered marketplace view.
 */
const MarketplaceView: React.FC = () => {
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [filters, dispatch] = useReducer(filterReducer, initialFilterState);

    // As per new architecture, data fetching is done via GraphQL hooks.
    // Using mock data as a fallback to ensure the UI is fully functional for demonstration.
    const { data, loading, error } = useQuery(GET_MARKETPLACE_AGENTS);
    const allAgents = useMemo(() => data?.marketplaceAgents || MOCK_AGENTS, [data]);

    const filteredAgents = useMemo(() => {
        return allAgents.filter((agent: Agent) => {
            const searchMatch = filters.searchQuery.length < 3 || agent.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) || agent.shortDescription.toLowerCase().includes(filters.searchQuery.toLowerCase()) || agent.tags.some(t => t.toLowerCase().includes(filters.searchQuery.toLowerCase()));
            const categoryMatch = filters.categories.size === 0 || filters.categories.has(agent.category);
            const ratingMatch = agent.rating >= filters.minRating;
            const priceMatch = agent.pricing.type === 'free' || agent.pricing.amount <= filters.maxPrice;
            const pricingTypeMatch = filters.pricingTypes.size === 0 || filters.pricingTypes.has(agent.pricing.type);
            const verifiedAuthorMatch = !filters.verifiedAuthor || agent.author.verified;
            const tagMatch = filters.tags.size === 0 || Array.from(filters.tags).every(tag => agent.tags.includes(tag));
            return searchMatch && categoryMatch && ratingMatch && priceMatch && pricingTypeMatch && verifiedAuthorMatch && tagMatch;
        });
    }, [allAgents, filters]);

    return (
        <>
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white tracking-wider">Agent Marketplace</h2>
                <SearchBar query={filters.searchQuery} onSearch={(q) => dispatch({ type: 'SET_SEARCH_QUERY', payload: q })} />
                
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Filter Sidebar would be here, omitted for brevity but its state is managed by the reducer */}
                    
                    <main className="flex-1">
                        <Card isLoading={loading} errorState={error?.message}>
                            {filteredAgents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredAgents.map(agent => (
                                        <AgentCard key={agent.id} agent={agent} onSelect={setSelectedAgent} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">No agents found matching your criteria.</div>
                            )}
                        </Card>
                    </main>
                </div>
            </div>

            {/* Agent Detail Modal would be here, opened when `selectedAgent` is not null */}
            {selectedAgent && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full h-[90vh] border border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xl font-semibold text-white">{selectedAgent.name}</h3>
                            <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                           <h4 className="font-bold text-lg text-cyan-300">Description</h4>
                           <p className="text-gray-300 mt-2 text-sm">{selectedAgent.longDescription}</p>
                           <h4 className="font-bold text-lg text-cyan-300 mt-6">Reviews ({selectedAgent.reviewCount})</h4>
                           {/* Reviews would be rendered here */}
                           <p className="text-gray-400 mt-2 text-sm">Review rendering logic goes here...</p>
                           {/* ... and so on for all other agent details ... */}
                        </div>
                         <div className="p-4 mt-auto border-t border-gray-700 bg-gray-900/50 flex justify-end">
                            <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Install Agent</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MarketplaceView;
