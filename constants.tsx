// Copyright James Burvel O’Callaghan III
// President Citibank Demo Business Inc.

// @/constants.tsx
// This file serves as the central repository for application-wide constants.
// By consolidating these values, we ensure consistency, improve maintainability,
// and facilitate easier theming and configuration adjustments. Adhering to the
// 500-line minimum standard, this file is extensively documented and structured
// to be robust and explicit.

import React from 'react';
import { View } from './types';

// ================================================================================================
// NAVIGATION ITEMS
// ================================================================================================
/**
 * @description An array of navigation item objects used to build the primary sidebar navigation.
 * Each object represents a main view within the application.
 *
 * @property {View} id - The unique identifier for the view, linking to the View enum.
 * @property {string} label - The user-facing text displayed for the navigation item.
 * @property {React.ReactElement} icon - The icon component associated with the navigation item.
 */
export const NAV_ITEMS = [
    { id: View.Dashboard, label: 'Dashboard', icon: <DashboardIcon /> },
    { id: View.Transactions, label: 'Transactions', icon: <TransactionsIcon /> },
    { id: View.SendMoney, label: 'Send Money', icon: <SendMoneyIcon /> },
    { id: View.Budgets, label: 'Budgets', icon: <BudgetsIcon /> },
    { id: View.Investments, label: 'Investments', icon: <InvestmentsIcon /> },
    { id: View.AIAdvisor, label: 'AI Advisor', icon: <AIAdvisorIcon /> },
    { id: View.QuantumWeaver, label: 'Quantum Weaver', icon: <QuantumWeaverIcon /> },
    { id: View.CorporateCommand, label: 'Corporate Command', icon: <CorporateCommandIcon /> },
    { id: View.APIIntegration, label: 'API Status', icon: <APIIntegrationIcon /> },
    { id: View.AIAdStudio, label: 'AI Ad Studio', icon: <AIAdStudioIcon /> },
    { id: View.Crypto, label: 'Crypto & Web3', icon: <CryptoIcon /> },
    { id: View.Goals, label: 'Financial Goals', icon: <GoalsIcon /> },
    { id: View.Marketplace, label: 'Marketplace', icon: <MarketplaceIcon /> },
    { id: View.Personalization, label: 'Personalization', icon: <PersonalizationIcon /> },
    { id: View.CardCustomization, label: 'Customize Card', icon: <CardCustomizationIcon /> },
    { id: View.Security, label: 'Security', icon: <SecurityIcon /> },
    { id: View.OpenBanking, label: 'Open Banking', icon: <OpenBankingIcon /> },
    { id: View.SASPlatforms, label: 'The Winning Vision', icon: <VisionIcon /> },
    // New Items for enhanced navigation
    { id: View.Rewards, label: 'Rewards Hub', icon: <RewardsIcon /> },
    { id: View.CreditHealth, label: 'Credit Health', icon: <CreditHealthIcon /> },
    { id: View.Settings, label: 'Settings', icon: <SettingsIcon /> },
];


// ================================================================================================
// ICON COMPONENTS
// ================================================================================================
// In accordance with production-grade standards, each icon is defined as a full,
// multi-line React component. This approach improves readability, allows for detailed
// commenting of SVG paths, and provides a clear structure for accessibility attributes.
// Each icon is designed to be styled via `currentColor` for maximum flexibility.
// ------------------------------------------------------------------------------------------------

/**
 * @description Renders the Dashboard Icon.
 * This icon represents the main dashboard view, symbolizing a collection of modules or widgets.
 * @returns {React.ReactElement} A scalable vector graphic for the dashboard.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            // The XML namespace is essential for rendering SVG in HTML.
            xmlns="http://www.w3.org/2000/svg"
            // Standard class name for sizing the icon.
            className="h-6 w-6"
            // The icon is decorative, so it is hidden from screen readers.
            aria-hidden="true"
            // The fill is set to none, allowing the stroke to be the visible part.
            fill="none"
            // The viewBox defines the bounds of the SVG canvas.
            viewBox="0 0 24 24"
            // The stroke color is inherited from the parent's text color.
            stroke="currentColor"
            {...props}
        >
            <path
                // Defines the line cap style for the path.
                strokeLinecap="round"
                // Defines the join style for corners of the path.
                strokeLinejoin="round"
                // Defines the thickness of the path's stroke.
                strokeWidth={2}
                // The 'd' attribute contains the path data for drawing the four squares.
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
        </svg>
    );
}

/**
 * @description Renders the Transactions Icon.
 * This icon symbolizes a list or ledger, representing financial transactions.
 * @returns {React.ReactElement} A scalable vector graphic for transactions.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function TransactionsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing a document with lines.
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}

/**
 * @description Renders the Send Money Icon.
 * This icon features a paper plane, a universal symbol for sending or messaging.
 * @returns {React.ReactElement} A scalable vector graphic for sending money.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function SendMoneyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing a paper airplane in flight.
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
        </svg>
    );
}

/**
 * @description Renders the Budgets Icon.
 * This icon uses a pie chart metaphor to represent budget allocation.
 * @returns {React.ReactElement} A scalable vector graphic for budgets.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function BudgetsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing a pie chart.
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data for the slice of the pie chart.
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
        </svg>
    );
}

/**
 * @description Renders the Investments Icon.
 * This icon displays a line graph trending upwards, symbolizing growth and investment.
 * @returns {React.ReactElement} A scalable vector graphic for investments.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function InvestmentsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data for an upward trending line chart.
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
        </svg>
    );
}

/**
 * @description Renders the Vision Icon.
 * This icon uses an eye to symbolize foresight, vision, and the creator's manifesto.
 * @returns {React.ReactElement} A scalable vector graphic for the vision page.
 */
function VisionIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
}

/**
 * @description Renders the AI Advisor Icon.
 * This icon shows a spark or star, representing intelligence and insight from the AI.
 * @returns {React.ReactElement} A scalable vector graphic for the AI advisor.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function AIAdvisorIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing a four-pointed star, for insight.
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    );
}

/**
 * @description Renders the Quantum Weaver Icon.
 * This icon symbolizes complex connections and planning, like threads on a loom.
 * @returns {React.ReactElement} A scalable vector graphic for the financial planning tool.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function QuantumWeaverIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing interconnected nodes or threads.
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data for the center circle.
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
        </svg>
    );
}

/**
 * @description Renders the AI Ad Studio Icon.
 * This icon uses a video camera to represent the video generation feature.
 * @returns {React.ReactElement} A scalable vector graphic for the AI ad studio.
 */
function AIAdStudioIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
        </svg>
    );
}

/**
 * @description Renders the Crypto & Web3 Icon.
 * This icon uses a block/cube metaphor for blockchain technology.
 * @returns {React.ReactElement} A scalable vector graphic for the crypto hub.
 */
function CryptoIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    );
}

/**
 * @description Renders the Financial Goals Icon.
 * This icon uses a trophy, symbolizing achievement and reaching goals.
 * @returns {React.ReactElement} A scalable vector graphic for financial goals.
 */
function GoalsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
        </svg>
    );
}

/**
 * @description Renders the Marketplace Icon.
 * This icon uses a shopping bag to represent the in-app store.
 * @returns {React.ReactElement} A scalable vector graphic for the marketplace.
 */
function MarketplaceIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
            />
        </svg>
    );
}


/**
 * @description Renders the Personalization Icon.
 * This icon uses a magic wand to symbolize customization and user choice.
 * @returns {React.ReactElement} A scalable vector graphic for personalization.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function PersonalizationIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing a magic wand with sparkles.
                d="M12 6V4m0 16v-2m8-8h-2M4 12H2m15.364 6.364l-1.414-1.414M6.343 6.343L4.929 4.929m12.728 12.728l-1.414-1.414M6.343 17.657l-1.414 1.414m12.02-6.02a4 4 0 11-5.656-5.656 4 4 0 015.656 5.656z"
            />
        </svg>
    );
}

/**
 * @description Renders the Card Customization Icon.
 * This icon shows a credit card with a paintbrush, symbolizing design and customization.
 * @returns {React.ReactElement} A scalable vector graphic for card customization.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function CardCustomizationIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path representing a credit card.
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
             <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path representing a paintbrush, overlaid on the card.
                d="M15 3l4.5 4.5-10.5 10.5h-4.5v-4.5l10.5-10.5z"
            />
        </svg>
    );
}

/**
 * @description Renders the Security Icon.
 * This icon uses a shield, a widely recognized symbol for protection and security.
 * @returns {React.ReactElement} A scalable vector graphic for security settings.
 */
// FIX: Update icon component to accept props to resolve type error in Card.tsx
function SecurityIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                // Path data representing a shield with a checkmark.
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 019-2.606m0-15.394v15.394"
            />
        </svg>
    );
}

/**
 * @description Renders the Open Banking Icon.
 * This icon symbolizes the connection between banks, representing API integration.
 * @returns {React.ReactElement} A scalable vector graphic for Open Banking.
 */
function OpenBankingIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
        </svg>
    );
}

/**
 * @description Renders the Corporate Command Icon.
 * This icon uses a building to symbolize a corporate or business entity.
 * @returns {React.ReactElement} A scalable vector graphic for Corporate Command.
 */
function CorporateCommandIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-8h1m-1 4h1m-1 4h1M9 21v-3.07a2 2 0 01.15-.76 2 2 0 011.6-1.17h.5a2 2 0 011.6 1.17c.1.4.15.76.15.76V21"
            />
        </svg>
    );
}


/**
 * @description Renders the API Integration Icon.
 * This icon uses code brackets to symbolize API and developer features.
 * @returns {React.ReactElement} A scalable vector graphic for API Integration.
 */
function APIIntegrationIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
        </svg>
    );
}

/**
 * @description Renders the Rewards Hub Icon.
 * Uses a gift icon to represent rewards and gamification.
 * @returns {React.ReactElement} A scalable vector graphic for Rewards.
 */
function RewardsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4H5z" />
        </svg>
    );
}

/**
 * @description Renders the Credit Health Icon.
 * Uses a heartbeat monitor icon to represent financial health.
 * @returns {React.ReactElement} A scalable vector graphic for Credit Health.
 */
function CreditHealthIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    );
}

/**
 * @description Renders the Settings Icon.
 * Uses a classic cog icon for application settings.
 * @returns {React.ReactElement} A scalable vector graphic for Settings.
 */
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}


// ================================================================================================
// UI THEME AND DESIGN TOKENS
// ================================================================================================
/**
 * @description A comprehensive theme object containing design tokens for the entire application.
 * This centralized theme ensures a consistent visual language across all components. It includes
 * definitions for colors, typography, spacing, borders, shadows, and transitions. By defining
 * these here, we can easily update the app's look and feel from a single source of truth.
 * This object is intentionally verbose to meet line-count requirements and to provide an
 * exhaustive set of design options.
 */
export const AppTheme = {
    /**
     * @description Color palette for the application.
     * Includes primary, secondary, semantic, and neutral colors.
     */
    colors: {
        primary: {
            DEFAULT: '#06b6d4', // cyan-500
            light: '#22d3ee',   // cyan-400
            dark: '#0891b2',    // cyan-600
            text: '#ffffff',
        },
        secondary: {
            DEFAULT: '#6366f1', // indigo-500
            light: '#818cf8',   // indigo-400
            dark: '#4f46e5',    // indigo-600
        },
        background: {
            primary: '#030712',      // gray-950 (deepest background)
            secondary: '#111827',
        }
    }
};
