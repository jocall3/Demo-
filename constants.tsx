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
    { id: View.FinancialDemocracy, label: 'Financial Democracy', icon: <FinancialDemocracyIcon /> },
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

function FinancialDemocracyIcon(props: React.SVGProps<SVGSVGElement>) {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2 1 5 1 7 0 2-1 2.657-1.343 2.657-1.343a8 8 0 010 10z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
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
// BANK & PAYMENT PROVIDER LOGOS
// ================================================================================================

const ChaseLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Chase</title><path d="M12,24A12,12,0,1,0,0,12,12,12,0,0,0,12,24Z" fill="#117aca"/><path d="M12.22,18.25h4.63V12.5H12.22Zm-5.75-5.75H11.1v4.63H6.47Zm5.75-5.75h4.63V11.1H12.22Z" fill="#fff"/><path d="M18.25,6.47V11.1h-4.63V6.47Z" fill="#fff"/></svg>;
const BofALogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Bank of America</title><path d="M9.3 4H14.7L18 10.5H6L9.3 4ZM9.3 19.9H14.7L18 13.4H6L9.3 19.9Z" fill="#005A9C"/><path d="M4 10.5H20V13.4H4V10.5Z" fill="#E2001A"/></svg>;
const WellsFargoLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Wells Fargo</title><path fill="#D71E28" d="M2.57 20.83L.01 4.2h23.98l-2.56 16.63z"/><path fill="#FFC72C" d="M17.84 8.78L16.2 12.8h-1.9L12 5.7l-2.3 7.1H7.8l-1.6-4.02L4.08 17.5h15.84l-2.08-8.72z"/></svg>;
const AmexLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>American Express</title><path d="M22.498 2.5H1.5C.67 2.5 0 3.17 0 4v16c0 .83.67 1.5 1.5 1.5h20.998c.83 0 1.5-.67 1.5-1.5V4c0-.83-.67-1.5-1.502-1.5z" fill="#006FCF"/><path d="M14.65 14.24h-1.02l.62-1.63-2-5.11h-1.3l-3.23 8.24h1.02l.62-1.63h3.04l.3 1.63h1.25zm-2.8-2.67l.95-2.51.95 2.51h-1.9zM15.9 14.24V9.5h1.25v-1h2v1h1.25v4.74h-1.25v2h-2v-2H15.9z" fill="#fff"/></svg>;
const CitiLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Citi</title><path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12Z" fill="#003B70"/><path d="M7.4 17.2h1.4v-7H7.4v7zm4.2 0h1.4v-7h-1.4v7zm4.2 0h1.4v-7h-1.4v7z" fill="#fff"/><path d="M6 9.4c0-.4.3-.8.8-.8h9.4c.5 0 .8.4.8.8v.2a7.1 7.1 0 0 0-11 0v-.2z" fill="#D71E28"/></svg>;
const BinanceLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Binance</title><path fill="#F0B90B" d="M12 24a12 12 0 100-24 12 12 0 000 24z"/><path d="m14.92 12.11 2.05-2.02-2.05-2.02-2.02 2.02-2.8-2.8-2.01 2.02 4.8 4.8-4.8 4.8 2.02 2.02 2.8-2.8 2.02 2.02 2.05-2.02-2.05-2.02z" fill="#fff"/></svg>;
const CoinbaseLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Coinbase</title><path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12z" fill="#0052FF"/><path d="M7 7h10v10H7V7z" fill="#fff"/></svg>;
const VenmoLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Venmo</title><path d="M23.2 14.7c-.2-2-1-3.7-2.3-5.2-1.3-1.4-3-2.5-5-3.3-1-.4-2-.7-3-1-.5-.1-.9-.3-1.4-.4C11.1 4.7 11 5 11 5.3c.1.6.2 1.2.4 1.8.2.6.4 1.2.7 1.7 1.1 2 2.6 3.7 4.5 5 .3.2.6.3.9.4.5.1.9.2 1.3.3.6.1 1.2.2 1.8.3.1.2.1.4.1.6-.2 2.1-1.1 3.9-2.5 5.2-1.4 1.4-3.3 2.3-5.3 2.7-.6.1-1.2.2-1.8.3-.2 0-.4-.1-.5-.2-.1-.2-.1-.5 0-.7.3-.8.6-1.6.8-2.4.2-1 .3-2 .5-3 .1-.4.2-.8.4-1.2l.2-.7.2-.6c.2-.4.3-.7.3-1.1.1-.3.1-.7.1-1 0-.4-.1-.8-.2-1.2-.2-.5-.4-1-.7-1.4-.7-1.1-1.6-2.1-2.8-2.8-.5-.3-1-.6-1.5-.8-1-.4-2-.7-3-1-.3-.1-.5-.2-.8-.3-.2-.1-.5-.1-.7-.2-.4-.1-.9-.2-1.3-.3-.4 0-.9-.1-1.3-.1h-.1c-.1 0-.2.1-.2.2v.2c0 .2 0 .4.1.6s.1.4.1.6l.1.5c.1.3.2.7.3 1 .1.4.2.8.4 1.1.2.3.4.6.6.9.5.6 1 1.2 1.6 1.7.6.5 1.2.9 1.9 1.3 1.1.6 2.2 1 3.4 1.4.5.1.9.3 1.4.4.4.1.9.3 1.3.4.7.2 1.4.3 2.1.5.1 0 .2.1.2.2.1.2.1.4 0 .6-.2.1-.5.3-.7.4-.6.2-1.2.4-1.8.5-1.1.3-2.2.5-3.3.6-2.2.3-4.4.2-6.6-.3L0 12.9V7.1l.8.1c.2 0 .4.1.6.1.7.1 1.4.2 2.1.4.9.2 1.8.5 2.7.9.8.3 1.6.7 2.4 1.2.7.4 1.4.8 2 1.3.6.4 1.2.8 1.8 1.2.2.1.4.3.6.4.3.2.6.4.9.6.1.1.3.1.4.2.1 0 .1.1.2.1Z" fill="#3D95CE"/></svg>;
const PaypalLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>PayPal</title><path d="M7.34 19.32h2.75l1.6-10.87H8.62L7.34 19.32zm8.3-10.6c-.4-.25-1-.41-1.8-.41h-1.8l.52 3.42c.1.34.4.57.75.57h.26c.4 0 .73-.22.82-.59l.4-2.58c.08-.4.04-.6-.15-.81zm.55 5.06c-.2.9-1 1.55-2.04 1.55h-1.06l-.52-3.4h1.1c.73 0 1.22.12 1.5.7.2.4.2.9-.03 1.15zM22.18 8.4h-2.9l-2.07 10.92h2.2l.33-1.83h2.18c2.1 0 3.3-1.12 3.8-3.18.4-1.6-.2-2.9-1.54-3.91z" fill="#003087"/><path d="M24 8.16C22.45 6.9 20.2 6.5 17.7 6.5h-5.23l-.53 3.42-.18 1.15-.02.34c-.1.34.18.63.53.63h.2c.4 0 .73-.22.82-.59l.86-5.46h1.8c.4 0 .74.05.97.16 1.4.65 1.8 2.18 1.4 3.9-.3 1.25-1.1 1.9-2.2 1.9h-1.06l.52-3.42c.1-.34.4-.57.75-.57h.03c.4 0 .73.22.82-.59l.4-2.58c.08-.4.04-.6-.15-.81-.4-.25-1-.41-1.8-.41h-.05c-.4 0-.74-.05-.97-.16-1.4-.65-1.8-2.18-1.4-3.91.4-1.92 2.1-2.95 4.1-2.95h2.9z" fill="#009CDE"/></svg>;
const ZelleLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><title>Zelle</title><path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12z" fill="#6930B5"/><g fill="#fff"><path d="M16.9 8.3h-9.8c-.3 0-.5.2-.5.5s.2.5.5.5h9.8c.3 0 .5-.2.5-.5s-.2-.5-.5-.5z"/><path d="M16.9 11.5h-9.8c-.3 0-.5.2-.5.5s.2.5.5.5h9.8c.3 0 .5-.2.5-.5s-.2-.5-.5-.5zM7.1 14.7h9.8c.3 0 .5.2.5.5s-.2.5-.5.5H7.1c-.3 0-.5-.2-.5-.5s.2-.5.5-.5z"/></g></svg>;

export const banks = [
    { name: 'Chase', logo: <ChaseLogo />, institution_id: 'ins_109960' },
    { name: 'Bank of America', logo: <BofALogo />, institution_id: 'ins_109950' },
    { name: 'Wells Fargo', logo: <WellsFargoLogo />, institution_id: 'ins_109980' },
    { name: 'American Express', logo: <AmexLogo />, institution_id: 'ins_100000' },
    { name: 'Citi', logo: <CitiLogo />, institution_id: 'ins_109970' },
    { name: 'Binance', logo: <BinanceLogo />, institution_id: 'crypto_binance' },
    { name: 'Coinbase', logo: <CoinbaseLogo />, institution_id: 'crypto_coinbase' },
    { name: 'Venmo', logo: <VenmoLogo />, institution_id: 'payment_venmo' },
    { name: 'Paypal', logo: <PaypalLogo />, institution_id: 'payment_paypal' },
    { name: 'Zelle', logo: <ZelleLogo />, institution_id: 'payment_zelle' },
];

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