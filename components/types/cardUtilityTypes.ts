// components/types/cardUtilityTypes.ts
// This file defines additional TypeScript types and helper interfaces for enhancing
// Card component extensibility and data modeling, promoting stronger type safety
// and clearer data contracts when using the Card component.

import { ReactNode } from 'react';

// ================================================================================================
// CARD-RELATED DATA STRUCTURES
// ================================================================================================

/**
 * @description Defines the structure for displaying a key performance indicator (KPI)
 * or a single significant metric within a Card. This is often used when `isMetric` is true.
 * It provides a standardized way to pass data for metric cards.
 */
export interface CardMetricDisplayData {
  /** The primary value of the metric, often a large number or percentage. */
  value: string | number;
  /** The unit or context for the value (e.g., "$", "%", "users", "points"). */
  unit?: string;
  /** A descriptive label for the metric, displayed below the value. */
  label: string;
  /** An optional trend indicator (e.g., "+5%", "-2%", "↑", "↓"). */
  trend?: string;
  /** Optional Tailwind CSS class for styling the trend text (e.g., 'text-green-400', 'text-red-400'). */
  trendColorClass?: string;
  /** An optional icon to accompany the metric, often indicating its nature or trend. */
  icon?: ReactNode;
  /** A tooltip or detailed description for the metric, providing more context on hover. */
  tooltip?: string;
}

/**
 * @description Represents a generic item that might be displayed in a list or table
 * within a Card's content. Useful for building consistent list displays with varying data.
 */
export interface CardListItem {
  /** A unique identifier for the list item, essential for rendering lists efficiently. */
  id: string;
  /** The primary text content of the item, typically the main label. */
  primaryText: string;
  /** Secondary or descriptive text for the item, offering additional details. */
  secondaryText?: string;
  /** An optional value, status, or component to display on the right side of the item. */
  value?: string | number | ReactNode;
  /** An icon, avatar, or visual embellishment for the item. */
  icon?: ReactNode;
  /** Optional click handler for the list item, making it interactive. */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Additional className for styling the list item container. */
  className?: string;
}

/**
 * @description Defines standard status types that can be used for visual indicators
 * or contextual styling within a card's content, representing different states.
 */
export type CardStatusSeverity = 'success' | 'warning' | 'error' | 'info' | 'default';

/**
 * @description Provides a structured way to define a section of content that could
 * be rendered within a Card's children. This helps in organizing complex card layouts
 * into logical, repeatable blocks.
 */
export interface CardContentSection {
  /** A unique identifier for the section, if multiple sections are used. */
  id: string;
  /** Optional title for this specific content section within the card. */
  title?: string;
  /** The main content of the section, can be any React node. */
  content: ReactNode;
  /** Optional footer content specific to this section. */
  footer?: ReactNode;
  /** Additional CSS classes for the section container. */
  className?: string;
  /** If the section should have internal padding. */
  padded?: boolean;
}

/**
 * @description Defines a general structure for an action link or button
 * that might appear within a card's content, footer, or alongside other text.
 */
export interface CardLinkAction {
  /** The text to display for the link or button. */
  label: string;
  /** The URL or path for the link, if applicable. */
  href?: string;
  /** Optional onClick handler for client-side routing or actions. */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** Whether the link should open in a new browser tab. */
  openInNewTab?: boolean;
  /** An optional icon to display alongside the link text. */
  icon?: ReactNode;
  /** Additional CSS classes for styling the link or button. */
  className?: string;
  /** If true, renders as a button instead of an anchor tag. */
  isButton?: boolean;
  /** If the action is disabled. */
  disabled?: boolean;
}