/**
 * @file components/Card.tsx
 * @description A highly versatile and state-aware container component.
 * This component is designed to be a fundamental building block for the UI, capable of displaying content,
 * handling loading and error states, and providing interactive features like collapsibility.
 * It is documented according to TSDoc standards to be suitable for a shared component library.
 */

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// ===============================================================================================
// TYPE DEFINITIONS
// ===============================================================================================

/**
 * Defines the visual style of the card.
 * @property {'default'} [default] - Standard blurred background card.
 * @property {'outline'} [outline] - A card with a more prominent border.
 * @property {'ghost'} [ghost] - A card with no background, blending into the parent container.
 * @property {'interactive'} [interactive] - A card that visually reacts to hover events, suitable for clickable cards.
 */
export type CardVariant = 'default' | 'outline' | 'ghost' | 'interactive';

/**
 * Defines the structure for an action item in the card's header, such as a settings or refresh button.
 */
export interface CardHeaderAction {
  /** A unique identifier for the action button. */
  id: string;
  /** The React element to use as the icon for the button. */
  icon: React.ReactElement;
  /** The callback function to execute when the button is clicked. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** The accessible label for the button, used for `aria-label`. */
  label: string;
  /** Whether the button should be disabled. */
  disabled?: boolean;
}

/**
 * The main props interface for the Card component, offering a rich API for various use cases.
 */
export interface CardProps {
  /** The main title of the card, displayed in the header. */
  title?: string;
  /** An optional subtitle displayed below the main title in the header. */
  subtitle?: string;
  /** The primary content to be rendered inside the card's body. */
  children: ReactNode;

  /** An array of action objects to render buttons in the card's header. */
  headerActions?: CardHeaderAction[];
  /** Optional content to be rendered in the card's footer. */
  footerContent?: ReactNode;

  /** If true, the card's content will be collapsible. */
  isCollapsible?: boolean;
  /** If true and `isCollapsible` is true, the card will be collapsed by default. */
  defaultCollapsed?: boolean;
  /** If true, the card will display a loading skeleton instead of its children. */
  isLoading?: boolean;
  /** If a string is provided, the card will display an error message instead of its children. */
  errorState?: string | null;
  /** An optional callback function for a 'Retry' button displayed in the error state. */
  onRetry?: () => void;

  /** Additional CSS classes to apply to the card's root element. */
  className?: string;
  /** The visual variant of the card. @default 'default' */
  variant?: CardVariant;
  /** Controls the internal padding of the card's content area. @default 'md' */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** An optional click handler to make the entire card interactive. */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** If true, applies styling suitable for a single metric display (e.g., centered text, smaller padding). */
  isMetric?: boolean;

  /** An optional custom component to display during the loading state, overriding the default skeleton. */
  loadingIndicator?: ReactNode;
}

// ===============================================================================================
// INTERNAL HELPER FUNCTIONS
// ===============================================================================================

/**
 * Generates the appropriate CSS class string for a given card variant.
 * @param variant - The card variant.
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
 * @param padding - The desired padding level.
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
}

// ===============================================================================================
// INTERNAL SUB-COMPONENTS
// ===============================================================================================

/**
 * A visually appealing loading skeleton component displayed when the card is in `isLoading` state.
 * @returns A loading skeleton element.
 */
const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse p-6">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-700 rounded-md w-1/3"></div>
        <div className="h-6 bg-gray-700 rounded-full w-6"></div>
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-4 bg-gray-700 rounded-md w-full"></div>
        <div className="h-4 bg-gray-700 rounded-md w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded-md w-3/4"></div>
      </div>
    </div>
  );
};

/**
 * A standardized display for showing error messages within the card.
 * @param props - The properties for the ErrorDisplay component.
 * @param props.message - The error message to display.
 * @param props.onRetry - An optional callback for a retry button.
 * @returns An error display element.
 */
const ErrorDisplay: React.FC<{ message: string; onRetry?: () => void; }> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-red-900/20 border-t border-b border-red-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h4 className="text-lg font-semibold text-red-200">An Error Occurred</h4>
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
};

/**
 * The header component for the card.
 * @internal
 */
const CardHeader: React.FC<{
  title?: string;
  subtitle?: string;
  isCollapsible?: boolean;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  actions?: CardHeaderAction[];
}> = ({ title, subtitle, isCollapsible, isCollapsed, toggleCollapse, actions }) => {
  if (!title && !subtitle && (!actions || actions.length === 0) && !isCollapsible) {
    return null;
  }

  const handleHeaderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCollapsible && (e.target as HTMLElement).closest('button') === null) {
      toggleCollapse();
    }
  };

  const headerCursorClass = isCollapsible ? 'cursor-pointer' : 'cursor-default';

  return (
    <div
      className={`flex items-start justify-between pb-4 ${headerCursorClass}`}
      onClick={handleHeaderClick}
    >
      <div className="flex-1 pr-4">
        {title && (
          <h3 className="text-xl font-semibold text-gray-100 truncate">{title}</h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {actions?.map(action => (
          <button
            key={action.id}
            onClick={action.onClick}
            aria-label={action.label}
            disabled={action.disabled}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {React.cloneElement(action.icon, { className: 'h-5 w-5' })}
          </button>
        ))}
        {isCollapsible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * The footer component for the card.
 * @internal
 */
const CardFooter: React.FC<{ children?: ReactNode }> = ({ children }) => {
  if (!children) return null;
  return (
    <div className="pt-4 border-t border-gray-700/60">
      {children}
    </div>
  );
};

// ===============================================================================================
// MAIN CARD COMPONENT
// ===============================================================================================

/**
 * A highly versatile and state-aware container component for displaying content.
 * It serves as a fundamental building block for the application's UI.
 * @param props - The properties for the Card component, see {@link CardProps}.
 * @returns A card element.
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
    if (isCollapsible) {
      if (isCollapsed) {
        setContentHeight(0);
      } else {
        const contentEl = contentRef.current;
        setContentHeight(contentEl ? contentEl.scrollHeight : 'auto');
      }
    }
  }, [isCollapsed, isCollapsible, children]);

  useEffect(() => {
    if (!isCollapsible && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isCollapsible, isCollapsed]);

  const baseClasses = getVariantClasses(variant);
  const finalPadding = (isMetric && padding === 'md' ? 'sm' : padding) as 'sm' | 'md' | 'lg' | 'none';
  const paddingClasses = getPaddingClasses(finalPadding);

  const finalContainerClasses = `
    ${baseClasses}
    ${className}
    overflow-hidden
  `;

  const renderCardContent = (): ReactNode => {
    if (isLoading) {
      return loadingIndicator || <LoadingSkeleton />;
    }

    if (errorState) {
      return <ErrorDisplay message={errorState} onRetry={onRetry} />;
    }

    const contentWrapperStyle = {
      height: isCollapsible ? contentHeight : 'auto',
    };

    const contentPadding = (title || subtitle || isCollapsible || headerActions) ? 'pt-4' : '';

    return (
      <div
        style={contentWrapperStyle}
        className="transition-[height] duration-500 ease-in-out overflow-hidden"
        aria-hidden={isCollapsed}
      >
        <div ref={contentRef}>
          <div className={contentPadding}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={finalContainerClasses.trim().replace(/\s+/g, ' ')} onClick={onClick}>
      <div className={`${paddingClasses} ${isMetric ? 'text-center' : ''}`}>
        <CardHeader
          title={title}
          subtitle={subtitle}
          isCollapsible={isCollapsible}
          isCollapsed={!!isCollapsed}
          toggleCollapse={toggleCollapse}
          actions={headerActions}
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
