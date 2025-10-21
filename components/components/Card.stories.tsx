import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Card, { CardProps } from './Card'; // Assuming the Card component is in the same directory

// Dummy icons for header actions
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);


const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    children: { control: 'text' },
    className: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost', 'interactive'],
    },
    padding: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'none'],
    },
    isCollapsible: { control: 'boolean' },
    defaultCollapsed: { control: 'boolean' },
    isLoading: { control: 'boolean' },
    errorState: { control: 'text' },
    onRetry: { action: 'retryClicked', control: false },
    onClick: { action: 'cardClicked', control: false },
    isMetric: { control: 'boolean' },
    // headerActions and footerContent are complex objects, control handled by templates
    headerActions: { control: false },
    footerContent: { control: false },
    loadingIndicator: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] bg-gray-900 p-8 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    title: 'Default Card Title',
    children: (
      <p className="text-gray-300">
        This is the default card content. It can hold any React node.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </p>
    ),
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'Card with Subtitle',
    subtitle: 'This is a descriptive subtitle',
    children: (
      <p className="text-gray-300">
        This card demonstrates the use of a subtitle beneath the main title.
      </p>
    ),
  },
};

export const OutlineVariant: Story = {
  args: {
    title: 'Outline Card',
    children: (
      <p className="text-gray-300">
        This card uses the `outline` variant, giving it a prominent border.
      </p>
    ),
    variant: 'outline',
  },
};

export const GhostVariant: Story = {
  args: {
    title: 'Ghost Card',
    children: (
      <p className="text-gray-300">
        The `ghost` variant blends into the background, having no explicit background or border.
      </p>
    ),
    variant: 'ghost',
  },
};

export const InteractiveVariant: Story = {
  args: {
    title: 'Interactive Card',
    children: (
      <p className="text-gray-300">
        This card has the `interactive` variant, showing hover effects. Click it!
      </p>
    ),
    variant: 'interactive',
    onClick: () => alert('Card clicked!'),
  },
};

export const SmallPadding: Story = {
  args: {
    title: 'Card with Small Padding',
    children: (
      <p className="text-gray-300">
        This card uses `padding="sm"` for a more compact layout.
      </p>
    ),
    padding: 'sm',
  },
};

export const NoPadding: Story = {
  args: {
    title: 'Card with No Padding',
    children: (
      <div className="bg-blue-600 p-4 text-white">
        This content is directly inside the card with `padding="none"`.
        The blue background highlights the lack of internal padding.
      </div>
    ),
    padding: 'none',
  },
};

export const CollapsibleCard: Story = {
  args: {
    title: 'Collapsible Section',
    children: (
      <div className="space-y-3 text-gray-300">
        <p>
          This card is collapsible. Click the header or the arrow icon to expand/collapse.
        </p>
        <p>
          More content to show the collapsing effect.
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p>
          Even more content here.
        </p>
      </div>
    ),
    isCollapsible: true,
  },
};

export const DefaultCollapsedCard: Story = {
  args: {
    title: 'Default Collapsed Card',
    children: (
      <p className="text-gray-300">
        This card is collapsible and starts in a collapsed state.
      </p>
    ),
    isCollapsible: true,
    defaultCollapsed: true,
  },
};

export const WithHeaderActions: Story = {
  args: {
    title: 'Card with Actions',
    subtitle: 'Manage this section',
    children: (
      <p className="text-gray-300">
        Header actions allow custom buttons or controls in the card's header.
      </p>
    ),
    headerActions: [
      { id: 'settings', icon: <SettingsIcon />, onClick: () => alert('Settings clicked!'), label: 'Settings' },
      { id: 'add', icon: <PlusIcon />, onClick: () => alert('Add clicked!'), label: 'Add New Item' },
      { id: 'download', icon: <DownloadIcon />, onClick: () => alert('Download clicked!'), label: 'Download Data' },
    ],
  },
};

export const WithFooterContent: Story = {
  args: {
    title: 'Card with Footer',
    children: (
      <p className="text-gray-300">
        The footer content is displayed at the bottom of the card, separated by a border.
      </p>
    ),
    footerContent: (
      <div className="flex justify-end text-sm text-gray-400">
        <button className="text-cyan-400 hover:underline">View All</button>
      </div>
    ),
  },
};

export const LoadingState: Story = {
  args: {
    title: 'Loading Data...',
    isLoading: true,
    children: (
      <p className="text-gray-300">
        This content should be hidden when `isLoading` is true.
      </p>
    ),
  },
};

export const ErrorState: Story = {
  args: {
    title: 'Data Load Failed',
    errorState: 'Failed to fetch the latest financial data. Please check your internet connection and try again.',
    onRetry: () => alert('Retry button clicked!'),
    children: (
      <p className="text-gray-300">
        This content should be hidden when `errorState` is set.
      </p>
    ),
  },
};

export const MetricCard: Story = {
  args: {
    title: 'Total Revenue',
    subtitle: 'Last 30 days',
    children: (
      <div className="text-center">
        <p className="text-5xl font-bold text-green-400">$1,234,567.89</p>
        <p className="text-lg text-gray-400 mt-2">+5.2% from previous period</p>
      </div>
    ),
    isMetric: true,
  },
};

export const ComplexCard: Story = {
  args: {
    title: 'Advanced Dashboard Widget',
    subtitle: 'Comprehensive overview of your portfolio',
    children: (
      <div className="space-y-4">
        <p className="text-gray-300">
          This is a complex card combining various features: collapsible, interactive,
          with header actions, a footer, and the ability to show loading/error states.
        </p>
        <ul className="list-disc list-inside text-gray-400">
          <li>Feature A: Enabled</li>
          <li>Feature B: Active</li>
          <li>Feature C: Pending review</li>
        </ul>
      </div>
    ),
    variant: 'interactive',
    isCollapsible: true,
    headerActions: [
      { id: 'refresh', icon: <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 12m7-9L7.293 2.5a1 1 0 00-1.414 1.414L7 7m10 7a8 8 0 01-14 4H4m7 9l-3.293-3.293a1 1 0 011.414-1.414L17 17m-1.414 1.414L17 17" /></svg>, onClick: () => alert('Refresh!'), label: 'Refresh Data' },
      { id: 'info', icon: <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, onClick: () => alert('More Info!'), label: 'More Information' },
    ],
    footerContent: (
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Last updated: 5 minutes ago</span>
        <button className="text-cyan-400 hover:underline">Full Report</button>
      </div>
    ),
    onClick: () => console.log('Complex Card Clicked'),
  },
};