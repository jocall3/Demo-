// components/CardGrid.tsx
// This component provides a flexible and responsive grid container specifically designed
// for arranging multiple Card components or similar content blocks, essential for
// building dashboards, galleries, or item listings with consistent spacing and layout.

import React, { ReactNode } from 'react';

// ================================================================================================
// TYPE DEFINITIONS
// ================================================================================================
// We define types to ensure a predictable and user-friendly API for the CardGrid.

/**
 * @description Defines the maximum number of columns for the grid, with responsive breakpoints.
 * The actual number of columns will adjust based on screen size up to this maximum.
 * '1': Single column across all screen sizes.
 * '2': Max 2 columns (e.g., 1 on sm, 2 on md+).
 * '3': Max 3 columns (e.g., 1 on sm, 2 on md, 3 on lg+).
 * '4': Max 4 columns (e.g., 1 on sm, 2 on md, 3 on lg, 4 on xl+).
 * '5': Max 5 columns (e.g., similar to 4, adding an extra breakpoint for 5).
 * '6': Max 6 columns (e.g., similar to 5, adding an extra breakpoint for 6).
 */
export type CardGridColumns = '1' | '2' | '3' | '4' | '5' | '6';

/**
 * @description Defines the spacing between grid items (both row and column gaps).
 * 'sm': Smaller gap.
 * 'md': Medium gap (default).
 * 'lg': Larger gap.
 * 'none': No gap.
 */
export type CardGridGap = 'sm' | 'md' | 'lg' | 'none';

/**
 * @description The main props interface for the CardGrid component.
 */
export interface CardGridProps {
  children: ReactNode;
  className?: string;
  cols?: CardGridColumns;
  gap?: CardGridGap;
}

// ================================================================================================
// INTERNAL HELPER FUNCTIONS & CONSTANTS
// ================================================================================================

/**
 * @description Generates the appropriate CSS class string for grid columns based on the input.
 * This function translates a simple column count into responsive Tailwind CSS grid classes,
 * ensuring the grid adapts gracefully to different screen sizes.
 * @param {CardGridColumns} cols - The desired maximum number of columns.
 * @returns {string} The corresponding Tailwind CSS classes.
 */
const getColClasses = (cols: CardGridColumns): string => {
  switch (cols) {
    case '1': return 'grid-cols-1';
    case '2': return 'grid-cols-1 sm:grid-cols-2';
    case '3': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    case '4': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    case '5': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    case '6': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
    default: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'; // Default to 3 columns responsive
  }
};

/**
 * @description Provides CSS classes for different grid gap sizes.
 * @param {CardGridGap} gap - The desired gap level.
 * @returns {string} The Tailwind CSS classes for gap.
 */
const getGapClasses = (gap: CardGridGap): string => {
  switch (gap) {
    case 'sm': return 'gap-3';
    case 'md': return 'gap-6';
    case 'lg': return 'gap-8';
    case 'none': return 'gap-0';
    default: return 'gap-6'; // Default to medium gap
  }
};

// ================================================================================================
// MAIN CARD GRID COMPONENT
// ================================================================================================

const CardGrid: React.FC<CardGridProps> = ({
  children,
  className = '',
  cols = '3', // Default to a 3-column responsive grid
  gap = 'md', // Default to medium gap
}) => {

  // --------------------------------------------------------------------------------
  // Dynamic Class Computation
  // --------------------------------------------------------------------------------
  const colClasses = getColClasses(cols);
  const gapClasses = getGapClasses(gap);

  // Combine all base grid classes with column and gap classes, and any custom className.
  const finalGridClasses = `
    grid
    ${colClasses}
    ${gapClasses}
    ${className}
  `;

  // --------------------------------------------------------------------------------
  // Final Render
  // --------------------------------------------------------------------------------
  return (
    <div className={finalGridClasses.trim().replace(/\s+/g, ' ')}>
      {children}
    </div>
  );
};

export default CardGrid;