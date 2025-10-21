export type AIInsightUrgency = 'low' | 'medium' | 'high';

export interface AIInsightChartDataItem {
    name: string;
    value: number;
}

export interface AIInsight {
    id: string;
    title: string;
    description: string;
    urgency: AIInsightUrgency;
    chartData?: AIInsightChartDataItem[];
}