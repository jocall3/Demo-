import React, { ReactNode } from 'react';
import Card, { CardProps, CardVariant } from './Card'; // Assuming Card.tsx is in the same directory.

// ================================================================================================
// TYPE DEFINITIONS
// ================================================================================================

/**
 * @description Defines the specific props for the MetricCard component.
 * It extends the base CardProps but omits properties that are either
 * set internally for metric display or are typically not used in a metric context
 * to promote a clean and focused layout.
 */
export interface MetricCardProps extends Omit<CardProps, 'children' | 'isMetric' | 'title' | 'subtitle' | 'padding'> {
  /**
   * @description The main value to be displayed, often a number, can be any ReactNode.
   */
  value: ReactNode;
  /**
   * @description A descriptive label for the metric.
   */
  label: string;
  /**
   * @description An optional component to display trend information (e.g., an arrow with a percentage change).
   */
  trendComponent?: ReactNode;
  /**
   * @description An optional unit for the value (e.g., '$', '%', 'units').
   */
  unit?: string;
  /**
   * @description Custom Tailwind CSS classes for the main value display.
   */
  valueClassName?: string;
  /**
   * @description Custom Tailwind CSS classes for the label display.
   */
  labelClassName?: string;
  /**
   * @description Specifies the internal padding of the metric card. Defaults to 'sm'.
   */
  padding?: 'sm' | 'md' | 'lg' | 'none';
}


// ================================================================================================
// MAIN METRIC CARD COMPONENT
// ================================================================================================

/**
 * @description A specialized card component optimized for displaying key performance indicators
 * or single metric values with a clean, focused layout. It leverages the base `Card` component's
 * `isMetric` prop to ensure appropriate styling and behavior.
 *
 * @param {MetricCardProps} props - The properties for the MetricCard.
 * @returns {React.FC} The MetricCard component.
 */
const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  trendComponent,
  unit,
  className = '',
  variant = 'default', // Default variant for metric cards, can be overridden.
  padding = 'sm',      // Metrics often use smaller padding for compactness.
  valueClassName = 'text-4xl font-bold text-white',
  labelClassName = 'text-sm text-gray-400 mt-2',
  ...rest // Captures any other CardProps like headerActions, onClick, etc.
}) => {
  // Construct the children content that will be passed to the base Card component.
  // This content includes the value, unit, label, and an optional trend component,
  // all centrally aligned.
  const metricContent = (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="flex items-baseline mb-1">
        {unit && <span className="text-xl font-bold text-gray-300 mr-1">{unit}</span>}
        <span className={valueClassName}>{value}</span>
      </div>
      <p className={labelClassName}>{label}</p>
      {trendComponent && <div className="mt-2">{trendComponent}</div>}
    </div>
  );

  return (
    <Card
      className={`flex flex-col items-center justify-center ${className}`}
      variant={variant}
      padding={padding} // Explicitly set padding. Card's `isMetric` logic will also ensure 'sm' if default.
      isMetric={true}   // Crucial prop to trigger metric-specific styling within the base Card component.
      {...rest}         // Pass through any remaining CardProps.
    >
      {metricContent}
    </Card>
  );
};

export default MetricCard;