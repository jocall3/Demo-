/**
 * @file packages/ui-library/src/components/Card.tsx
 * @description The foundational Card component for the shared UI library.
 * This component is a versatile, state-aware container designed to be the primary building block
 * for UI composition across all Micro-Frontends (MFEs) and the Shell application.
 * It adheres to the architectural directive for a centralized, versioned component library.
 *
 * @see ADR-004: Centralized UI Component Library
 * @see ADR-008: Frontend State Management Separation
 *
 * Core Features:
 * - **Comprehensive JSDoc/TSDoc:** Fully documented props and functionality as per coding standards.
 * - **State Awareness:** Built-in support for `isLoading` and `errorState` props, allowing it to elegantly display skeletons or error messages. This aligns with the TanStack Query data-fetching pattern where parent components manage server state.
 * - **Versatility:** Supports multiple visual `variants`, configurable `padding`, and optional `headerActions` and `footerContent`.
 * - **Interactivity:** Can be made `isCollapsible` or `onClick`-enabled.
 * - **Encapsulation:** Internal sub-components like `LoadingSkeleton` and `ErrorDisplay` are co-located for maintainability.
 */

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// ===============================================================================================
// TYPE DEFINITIONS
// ===============================================================================================

/**
 * Defines the visual style of the card, allowing for contextual variation.
 * @property {'default'} [default] - Standard blurred background card.
 * @property {'outline'} [outline] - A card with only a border, no background fill.
 * @property {'ghost'} [ghost] - A card with no background or border, blending into its parent.
 * @property {'interactive'} [interactive] - A card that visually reacts to hover events, ideal for clickable elements.
 */
export type CardVariant = 'default' | 'outline' | 'ghost' | 'interactive';

/**
 * Defines the structure for an action item (e.g., a button) in the card's header.
 * This allows for dynamic controls like refresh, filter, or menu buttons.
 */
export interface CardHeaderAction {
  /** A unique identifier for the action, used as a key. */
  id: string;
  /** The React icon component to display. */
  icon: React.ReactElement;
  /** The callback function to execute when the action is clicked. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** The accessible label for the button, crucial for screen readers. */
  label: string;
  /** Optional flag to disable the action button. */
  disabled?: boolean;
}

/**
 * The main props interface for the Card component.
 * This API is designed to be comprehensive, enabling a wide range of use cases from simple content
 * display to complex, interactive, and data-driven containers.
 */
export interface CardProps {
  /** The primary title text displayed in the card's header. */
  title?: string;
  /** An optional subtitle displayed below the primary title in the header. */
  subtitle?: string;
  /** The main content to be rendered inside the card. */
  children: ReactNode;

  /** An array of action objects to render buttons in the card's header. */
  headerActions?: CardHeaderAction[];
  /** Optional content to be rendered in a designated footer section of the card. */
  footerContent?: ReactNode;

  /** If true, the card content will be collapsible. Defaults to `false`. */
  isCollapsible?: boolean;
  /** If `isCollapsible` is true, this determines the initial collapsed state. Defaults to `false`. */
  defaultCollapsed?: boolean;
  /** If true, the card will display a loading skeleton instead of its content. */
  isLoading?: boolean;
  /** If a string is provided, the card will display an error message. `null` or `undefined` shows normal content. */
  errorState?: string | null;
  /** A callback function for a "Retry" button displayed in the error state. */
  onRetry?: () => void;

  /** A custom CSS class name to apply to the root card element. */
  className?: string;
  /** The visual style of the card. Defaults to `'default'`. */
  variant?: CardVariant;
  /** Controls the internal padding of the card. Defaults to `'md'`. */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** A callback function to make the entire card clickable. */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** A flag for metric-style cards which may have different default padding or alignment. */
  isMetric?: boolean;

  /** An optional custom component to display during the `isLoading` state, overriding the default skeleton. */
  loadingIndicator?: ReactNode;
}

// ===============================================================================================
// STYLING HELPERS
// ===============================================================================================

/**
 * Generates the appropriate CSS class string for a given card variant.
 * @param variant The card variant.
 * @returns The corresponding Tailwind CSS classes.
 */
const getVariantClasses = (variant: CardVariant): string => {
  switch (variant) {
    case 'outline':
      return 'bg-transparent border-2 border-gray-600/80 shadow-md';
    case 'ghost':
      return 'bg-transparent border-none shadow-none';
    case 'interactive':
      return 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg transition-all duration-300 hover:bg-gray-800/80 hover:border-cyan-500/80 hover:shadow-cyan-500/10';
    case 'default':
    default:
      return 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg';
  }
};

/**
 * Provides CSS classes for different padding sizes.
 * @param padding The desired padding level.
 * @returns The Tailwind CSS classes for padding.
 */
const getPaddingClasses = (padding: 'sm' | 'md' | 'lg' | 'none'): string => {
  switch (padding) {
    case 'sm': return 'p-3';
    case 'md': return 'p-6';
    case 'lg': return 'p-8';
    case 'none': return 'p-0';
    default: return 'p-6';
  }
};

// ===============================================================================================
// INTERNAL SUB-COMPONENTS
// ===============================================================================================

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-6">
    <div className="h-4 bg-gray-700 rounded-md w-3/4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-700 rounded-md w-full"></div>
      <div className="h-4 bg-gray-700 rounded-md w-5/6"></div>
    </div>
  </div>
);

const ErrorDisplay: React.FC<{ message: string; onRetry?: () => void; }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center p-6 bg-red-900/20">
    <p className="text-red-300 mt-1 mb-4 max-w-md">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-500/50 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

const CardHeader: React.FC<Pick<CardProps, 'title' | 'subtitle' | 'isCollapsible' | 'headerActions'> & { isCollapsed: boolean; toggleCollapse: () => void; }> = ({ title, subtitle, isCollapsible, isCollapsed, toggleCollapse, actions }) => {
  if (!title && !subtitle && (!actions || actions.length === 0) && !isCollapsible) {
    return null;
  }
  const headerCursorClass = isCollapsible ? 'cursor-pointer' : 'cursor-default';

  return (
    <div className={`flex items-start justify-between pb-4 ${headerCursorClass}`} onClick={isCollapsible ? toggleCollapse : undefined}>
      <div className="flex-1 pr-4">
        {title && <h3 className="text-xl font-semibold text-gray-100 truncate">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {actions && actions.map(action => (
          <button
            key={action.id}
            onClick={(e) => { e.stopPropagation(); action.onClick(e); }}
            aria-label={action.label}
            disabled={action.disabled}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {React.cloneElement(action.icon, { className: 'h-5 w-5' })}
          </button>
        ))}
        {isCollapsible && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};

const CardFooter: React.FC<{ children?: ReactNode }> = ({ children }) => {
  if (!children) return null;
  return <div className="pt-4 border-t border-gray-700/60">{children}</div>;
};

// ===============================================================================================
// MAIN CARD COMPONENT
// ===============================================================================================

/**
 * A versatile and state-aware container component.
 * @param {CardProps} props - The props for the Card component.
 * @returns {React.ReactElement} The rendered Card component.
 */
const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  headerActions,
  footerContent,
  isCollapsible = false,
  defaultCollapsed = false,
  isLoading = false,
  errorState = null,
  onRetry,
  loadingIndicator,
  onClick,
  isMetric = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(isCollapsible && defaultCollapsed);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | string>('auto');

  const toggleCollapse = useCallback(() => {
    if (isCollapsible) {
      setIsCollapsed(prev => !prev);
    }
  }, [isCollapsible]);

  useEffect(() => {
    if (isCollapsible && contentRef.current) {
      setContentHeight(isCollapsed ? 0 : contentRef.current.scrollHeight);
    }
  }, [isCollapsed, isCollapsible, children]);

  const baseClasses = getVariantClasses(variant);
  const finalPadding = isMetric && padding === 'md' ? 'sm' : padding;
  const paddingClasses = getPaddingClasses(finalPadding);
  const finalContainerClasses = ` ${baseClasses} ${className} overflow-hidden `;

  const renderCardContent = (): ReactNode => {
    if (isLoading) {
      return loadingIndicator || <LoadingSkeleton />;
    }
    if (errorState) {
      return <ErrorDisplay message={errorState} onRetry={onRetry} />;
    }

    const contentWrapperStyle: React.CSSProperties = {
      height: isCollapsible ? contentHeight : 'auto',
      transition: 'height 0.3s ease-in-out',
      overflow: 'hidden',
    };

    const contentPadding = (title || subtitle || isCollapsible || headerActions) ? 'pt-4' : '';

    return (
      <div style={contentWrapperStyle} aria-hidden={isCollapsed}>
        <div ref={contentRef}>
          <div className={contentPadding}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={finalContainerClasses.trim()} onClick={onClick}>
      <div className={`${paddingClasses} ${isMetric ? 'text-center' : ''}`}>
        <CardHeader
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          isCollapsible={isCollapsible}
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
        />
        {(isLoading || errorState) ? (
          renderCardContent()
        ) : (
          <>
            {renderCardContent()}
            <CardFooter>{footerContent}</CardFooter>
          </>
        )}
      </div>
    </div>
  );
};

export default Card;
