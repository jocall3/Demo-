/**
 * @file packages/ui-library/src/index.ts
 * @description Main entry point for the `@demobank/ui-library`.
 *
 * This file serves as the public API for the shared UI component library. It exports
 * all reusable components, types, and utilities intended for consumption by the Shell
 * application and various Micro-Frontends (MFEs).
 *
 * By centralizing these shared elements, we enforce consistency across the frontend
 * ecosystem, reduce code duplication, and facilitate independent development and deployment,
 * aligning with the "Decompose Monolithic Frontend" architectural directive.
 *
 * @see /docs/adr/0002-micro-frontend-architecture.txt
 * @see /docs/adr/0009-frontend-state-management.txt
 */

// ===================================================================================
// SHARED TYPES
// ===================================================================================
/**
 * Re-exports all shared type definitions from the central types file. This ensures a
 * single source of truth for data structures across the entire frontend, from the
 * Shell to every MFE. Consumers can import types like `Transaction` or `Asset` directly
 * from `@demobank/ui-library`.
 */
export * from './types';

// ===================================================================================
// SHARED COMPONENTS
// ===================================================================================

// --- Core Layout & Interactive Components ---

/**
 * @component Card
 * @description A versatile container component for displaying content in a structured format.
 * Includes built-in support for loading skeletons, error states, and collapsible sections.
 * This is a fundamental building block for the application's UI.
 */
export { default as Card, type CardProps } from './components/Card';

/**
 * @component Header
 * @description The main application header, designed to be used in the MFE Shell.
 * It's a presentational component that receives user data and notifications via props.
 */
export { default as Header, type HeaderProps } from './components/Header';

/**
 * @component Sidebar
 * @description The main application navigation sidebar, designed for the MFE Shell.
 * It is a controlled component that receives navigation items and active state via props.
 */
export { default as Sidebar, type SidebarProps } from './components/Sidebar';

/**
 * @component PlaidLinkButton
 * @description A specialized button component that encapsulates the logic for initiating the
 * Plaid Link flow. It provides a consistent and reusable way to connect bank accounts.
 */
export { default as PlaidLinkButton, type PlaidLinkButtonProps } from './components/PlaidLinkButton';


// --- Reusable Dashboard Widgets ---
// These are higher-order components, often composed of smaller primitives, that are
// reused across different dashboards or MFEs.

/**
 * @component AIInsights
 * @description A widget that displays AI-generated financial insights, complete with
 * urgency indicators and optional charts.
 */
export { default as AIInsights } from './components/AIInsights';

/**
 * @component BalanceSummary
 * @description A widget that displays the user's total balance and a historical chart
 * of their wealth over time.
 */
export { default as BalanceSummary } from './components/BalanceSummary';

/**
 * @component ImpactTracker
 * @description A gamified widget that tracks the user's positive environmental impact
 * based on their spending habits.
 */
export { default as ImpactTracker } from './components/ImpactTracker';

/**
 * @component InvestmentPortfolio
 * @description A widget that visualizes the user's investment portfolio breakdown using
 * a pie chart and key performance metrics.
 */
export { default as InvestmentPortfolio } from './components/InvestmentPortfolio';

/**
 * @component RecentTransactions
 * @description A widget that displays a list of the most recent financial transactions,
 * complete with icons and carbon footprint data.
 */
export { default as RecentTransactions } from './components/RecentTransactions';

/**
 * @component WealthTimeline
 * @description A widget that shows a historical and AI-projected timeline of the user's
 * net worth.
 */
export { default as WealthTimeline } from './components/WealthTimeline';
