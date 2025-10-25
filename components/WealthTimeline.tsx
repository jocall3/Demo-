// components/WealthTimeline.tsx
// RE-ARCHITECTED: This component is now a self-contained feature that fetches its own data.
// It uses a dedicated data-fetching hook (`useWealthTimeline`) which aligns with the new
// TanStack Query + GraphQL architecture, replacing the previous dependency on a monolithic DataContext.
// All complex calculations (historical balance, projection) are now assumed to be handled by the backend/BFF.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import Card from './Card';

// ===================================================================================
// GraphQL Query Definition & Data Fetching Hook
// ===================================================================================

const GET_WEALTH_TIMELINE_QUERY = `
  query GetWealthTimeline {
    userData {
      wealthTimeline {
        month
        balance
        projection
      }
    }
  }
`;

/**
 * Represents a single data point for the wealth timeline chart.
 */
interface TimelineDataPoint {
  month: string;
  balance?: number | null;
  projection?: number | null;
}

/**
 * Expected structure of the GraphQL response.
 */
interface WealthTimelineResponse {
  userData: {
    wealthTimeline: TimelineDataPoint[];
  };
}

/**
 * A generic fetcher for making GraphQL requests.
 * In a real app, this would be a shared utility.
 */
async function fetchGraphQL<T>(query: string): Promise<T> {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}

/**
 * Custom hook to fetch pre-calculated wealth timeline data from the GraphQL supergraph.
 * It uses React Query for server state management, caching, and background refetching.
 */
const useWealthTimeline = () => {
  return useQuery<TimelineDataPoint[], Error>({
    queryKey: ['wealthTimeline'],
    queryFn: async () => {
      const response = await fetchGraphQL<WealthTimelineResponse>(GET_WEALTH_TIMELINE_QUERY);
      return response.userData.wealthTimeline;
    },
    staleTime: 1000 * 60 * 15, // Data is considered fresh for 15 minutes
  });
};


// ===================================================================================
// UI Sub-components
// ===================================================================================

/**
 * A custom tooltip component for the chart, providing better styling and formatting.
 */
const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const history = payload.find(p => p.dataKey === 'balance');
        const projection = payload.find(p => p.dataKey === 'projection');

        return (
            <div className="p-3 bg-gray-800/90 border border-gray-700 rounded-lg shadow-lg text-sm backdrop-blur-sm">
                <p className="label text-gray-300 font-semibold mb-2">{`Month: ${label}`}</p>
                {history && history.value != null && (
                    <p style={{ color: history.color }}>
                        History: ${Number(history.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                )}
                {projection && projection.value != null && (
                     <p style={{ color: projection.color }}>
                        Projection: ${Number(projection.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                )}
            </div>
        );
    }
    return null;
};


// ===================================================================================
// Main Component
// ===================================================================================

const WealthTimeline: React.FC = () => {
    const { data: timelineData, isLoading, isError, error } = useWealthTimeline();

    // Formatter for the Y-axis labels.
    const formatYAxis = (tick: number): string => `$${(tick / 1000).toFixed(0)}k`;

    // The Card component now handles the loading and error states for a consistent UX.
    return (
        <Card
            title="Wealth Timeline (Past & Projected)"
            isLoading={isLoading}
            errorState={isError ? error.message : null}
            className="min-h-[24rem]" // Set min-height to prevent layout shift
        >
            <div className="h-80">
                {(!isLoading && !isError && timelineData && timelineData.length > 0) && (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.5)" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>

                            {/* The solid area represents the user's historical balance. */}
                            <Area
                                type="monotone"
                                dataKey="balance"
                                name="History"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorHistory)"
                            />
                            
                            {/* The dashed line represents the AI-generated future projection. */}
                            <Line
                                type="monotone"
                                dataKey="projection"
                                name="Projection"
                                stroke="#818cf8"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
                {/* Display an empty state if data is successfully fetched but is empty */}
                 {(!isLoading && !isError && (!timelineData || timelineData.length === 0)) && (
                     <div className="flex items-center justify-center h-full text-center text-gray-500">
                         <p>Not enough transaction data to generate a timeline.<br/>Link an account to get started.</p>
                     </div>
                 )}
            </div>
        </Card>
    );
};

export default WealthTimeline;
