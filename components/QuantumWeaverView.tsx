import React, { useState, useMemo, useEffect, FC } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Card from './Card';
import type { AIPlanStep, AIQuestion, AIPlan } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// ================================================================================================
// GRAPHQL & SERVICE LAYER (NEW ARCHITECTURE)
// Defines interactions with the GraphQL API Gateway, using TanStack Query for state management.
// ================================================================================================

const gql = String.raw;

// A lightweight GraphQL client function. In a real app, this would be a shared utility.
async function graphqlRequest<T, V>(query: string, variables?: V): Promise<T> {
    // In a real app, this would get the auth token from a shared context.
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(errors[0].message);
    return data;
}

// --- GraphQL Operations for Quantum Weaver Workflow ---

const START_ANALYSIS_MUTATION = gql`
  mutation StartBusinessPlanAnalysis($plan: String!) {
    startBusinessPlanAnalysis(plan: $plan) {
      workflowId
      status
    }
  }
`;

const GET_ANALYSIS_STATUS_QUERY = gql`
  query GetBusinessPlanAnalysisStatus($workflowId: ID!) {
    getBusinessPlanAnalysisStatus(workflowId: $workflowId) {
      workflowId
      status
      result {
        feedback
        questions { id question category }
        coachingPlan { feasibilitySummary monthlyContribution steps { title description category timeline } }
        loanAmount
      }
      error
    }
  }
`;

const APPROVE_PLAN_MUTATION = gql`
  mutation ApproveBusinessPlan($workflowId: ID!) {
    approveBusinessPlan(workflowId: $workflowId) {
      workflowId
      status
    }
  }
`;

const GENERATE_AI_CONTENT_MUTATION = gql`
    mutation GenerateAiContent($prompt: String!, $context: String!) {
        generateTextWithContext(prompt: $prompt, context: $context)
    }
`;

// --- Type Definitions for GraphQL Payloads ---

interface WorkflowStatusPayload {
  workflowId: string;
  status: 'PENDING' | 'ANALYSIS_COMPLETE' | 'APPROVED' | 'FAILED';
  result?: {
    feedback?: string;
    questions?: AIQuestion[];
    coachingPlan?: AIPlan;
    loanAmount?: number;
  } | null;
  error?: string | null;
}

interface StartAnalysisResponse { startBusinessPlanAnalysis: { workflowId: string; status: string; } }
interface GetStatusResponse { getBusinessPlanAnalysisStatus: WorkflowStatusPayload; }
interface ApprovePlanResponse { approveBusinessPlan: { workflowId: string; status: string; } }

// --- Custom Hooks for Data Fetching & Mutations ---

const useStartAnalysis = () => useMutation({
    mutationFn: (plan: string) => graphqlRequest<StartAnalysisResponse, { plan: string }>(START_ANALYSIS_MUTATION, { plan }),
});

const useAnalysisStatus = (workflowId: string | null, currentStatus: string | null) => useQuery({
    queryKey: ['analysisStatus', workflowId],
    queryFn: () => graphqlRequest<GetStatusResponse, { workflowId: string }>(GET_ANALYSIS_STATUS_QUERY, { workflowId: workflowId! }),
    enabled: !!workflowId && !['APPROVED', 'FAILED', 'ANALYSIS_COMPLETE'].includes(currentStatus || ''),
    refetchInterval: 3000, // Poll every 3 seconds while workflow is running
});

const useApprovePlan = () => useMutation({
    mutationFn: (workflowId: string) => graphqlRequest<ApprovePlanResponse, { workflowId: string }>(APPROVE_PLAN_MUTATION, { workflowId }),
});

const useGenerateAiContent = () => useMutation({
    mutationFn: (variables: { prompt: string, context: string }) => graphqlRequest<{ generateTextWithContext: string }>(GENERATE_AI_CONTENT_MUTATION, variables)
});

// ================================================================================================
// HELPER & UI SUB-COMPONENTS
// ================================================================================================

const AIGeneratorWidget: FC<{
    title: string;
    prompt: string;
    businessPlan: string;
    children?: (result: string) => React.ReactNode;
}> = ({ title, prompt, businessPlan, children }) => {
    const { mutate, data, isPending, error, isSuccess } = useGenerateAiContent();
    const result = data?.generateTextWithContext;

    const handleGenerate = () => {
        if (!isPending && !isSuccess) {
            mutate({ prompt, context: businessPlan });
        }
    };

    return (
        <Card title={title}>
            <div className="space-y-3 min-h-[8rem] flex flex-col justify-center">
                {error && <p className="text-red-400 text-sm text-center">{error.message}</p>}
                {isPending && (
                    <div className="flex items-center justify-center space-x-2">
                        <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-400">Generating...</span>
                    </div>
                )}
                {!isPending && result && (children ? children(result) : <p className="text-gray-300 whitespace-pre-wrap text-sm italic">"{result}"</p>)}
                {!isPending && !result && !error && (
                    <button onClick={handleGenerate} className="w-full py-2 px-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-sm font-medium transition-colors">
                        {`Generate ${title}`}
                    </button>
                )}
            </div>
        </Card>
    );
};

const Scorecard: FC<{ scores: { viability: number, marketFit: number, risk: number } }> = ({ scores }) => {
    const ScoreBar: FC<{ label: string, value: number, color: string, isRisk?: boolean }> = ({ label, value, color, isRisk }) => (
        <div>
            <div className="flex justify-between text-xs text-gray-300">
                <span>{label}</span>
                <span>{value.toFixed(0)}{isRisk ? '' : '%'}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${isRisk ? 100 - value : value}%` }}></div>
            </div>
        </div>
    );

    return (
        <Card title="Heuristic API Scorecard" variant='outline'>
            <div className="space-y-3">
                <ScoreBar label="Viability Score" value={scores.viability} color="bg-cyan-500" />
                <ScoreBar label="Market Fit" value={scores.marketFit} color="bg-indigo-500" />
                <ScoreBar label="Risk Index" value={scores.risk} color="bg-red-500" isRisk />
            </div>
        </Card>
    );
};

const PitchStage: FC<{ onSubmit: (plan: string) => void; isLoading: boolean; }> = ({ onSubmit, isLoading }) => {
    const [businessPlanInput, setBusinessPlanInput] = useState('');
    const [scores, setScores] = useState({ viability: 0, marketFit: 0, risk: 100 });

    useEffect(() => {
        const handler = setTimeout(() => {
            if (businessPlanInput.length > 0) {
                const length = businessPlanInput.length;
                const newViability = Math.min(80, (length / 500) * 100) + Math.random() * 15;
                const newMarketFit = Math.min(85, (length / 600) * 100) + Math.random() * 10;
                const newRisk = Math.max(10, 100 - (length / 400) * 100 - Math.random() * 20);
                setScores({ viability: newViability, marketFit: newMarketFit, risk: newRisk });
            } else {
                setScores({ viability: 0, marketFit: 0, risk: 100 });
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [businessPlanInput]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (businessPlanInput.trim()) onSubmit(businessPlanInput);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card title="Quantum Weaver: Business Incubator">
                    <p className="text-gray-400 mb-4">Welcome to the Plato Program. Pitch your business idea to our AI venture capitalist to apply for seed funding and receive personalized coaching.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                            value={businessPlanInput}
                            onChange={(e) => setBusinessPlanInput(e.target.value)}
                            placeholder="Describe your business idea, target market, and what makes it unique..."
                            className="w-full h-48 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!businessPlanInput.trim() || isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? 'Submitting...' : 'Pitch to Plato AI'}
                        </button>
                    </form>
                </Card>
            </div>
            <div className="lg:col-span-1"><Scorecard scores={scores} /></div>
        </div>
    );
};

const AnalysisStage: FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <Card>
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                <div className="absolute inset-2 border-4 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-cyan-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.636 4.364l.707-.707M17.657 6.343l-.707.707M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>
                </div>
            </div>
            <h3 className="text-2xl font-semibold text-white mt-6">{title}</h3>
            <p className="text-gray-400 mt-2">{subtitle}</p>
        </div>
    </Card>
);

const TestStage: FC<{ feedback: string; questions: AIQuestion[]; onPass: () => void; isLoading: boolean; }> = ({ feedback, questions, onPass, isLoading }) => {
    return (
        <Card title="Plato's Assessment">
            <p className="text-lg text-cyan-300 mb-2">Initial Feedback:</p>
            <p className="text-gray-300 italic mb-6">"{feedback}"</p>
            <p className="text-lg text-cyan-300 mb-4">Sample Assessment Questions:</p>
            <div className="space-y-4 mb-6">
                {questions.map((q) => (
                    <div key={q.id} className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="font-semibold text-gray-200">{q.question}</p>
                        <p className="text-xs text-cyan-400 mt-1 uppercase tracking-wider">{q.category}</p>
                    </div>
                ))}
            </div>
            <button onClick={onPass} disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50">
                {isLoading ? "Finalizing..." : "Simulate Passing Assessment"}
            </button>
        </Card>
    );
};

const ApprovedStage: FC<{ loanAmount: number; coachingPlan: AIPlan; businessPlan: string; }> = ({ loanAmount, coachingPlan, businessPlan }) => {
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const handleCompleteStep = (stepIndex: number) => setCompletedSteps(prev => prev.includes(stepIndex) ? prev.filter(i => i !== stepIndex) : [...prev, stepIndex]);
    const completionProgress = (completedSteps.length / coachingPlan.steps.length) * 100;

    return (
        <div className="space-y-6">
            <Card>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">Congratulations! Your vision is funded.</h2>
                    <p className="text-cyan-300 text-4xl font-light my-2">${loanAmount.toLocaleString()}</p>
                    <p className="text-gray-400">seed funding has been deposited into your account.</p>
                </div>
            </Card>
            <h3 className="text-xl font-semibold text-gray-200 tracking-wider">Your Founder's Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card title="Milestone Tracker" className="lg:col-span-2">
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-300 mb-1"><span>Progress</span><span>{completionProgress.toFixed(0)}%</span></div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${completionProgress}%` }}></div></div>
                    </div>
                    <div className="space-y-4">
                        {coachingPlan.steps.map((step, index) => {
                            const isCompleted = completedSteps.includes(index);
                            return (
                                <div key={index} className={`p-3 rounded-lg flex items-start transition-colors ${isCompleted ? 'bg-green-900/30' : 'bg-gray-800/50'}`}>
                                    <div className="flex-grow">
                                        <h4 className={`font-semibold text-white ${isCompleted ? 'line-through' : ''}`}>{step.title}</h4>
                                        <p className="text-sm text-gray-400">{step.description}</p>
                                        <p className="text-xs text-cyan-400 mt-1">Timeline: {step.timeline}</p>
                                    </div>
                                    <button onClick={() => handleCompleteStep(index)} className="ml-4 flex-shrink-0 text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white">{isCompleted ? 'Undo' : 'Complete'}</button>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                <AIGeneratorWidget title="Plato's Pro-Tip" prompt="Give me a single, powerful pro-tip for a new founder based on this business idea. Be concise and inspiring." businessPlan={businessPlan} />
                <AIGeneratorWidget title="Elevator Pitch" prompt="Craft a compelling one-sentence elevator pitch for this business." businessPlan={businessPlan} />
                <AIGeneratorWidget title="Brand Identity" prompt="Suggest one creative company name and a catchy tagline for this business." businessPlan={businessPlan} />
                <AIGeneratorWidget title="Funding Allocation" prompt="Suggest a simple percentage-based budget allocation for this new funding across 3-4 key areas (e.g., Product, Marketing, Operations)." businessPlan={businessPlan}>
                    {(result) => {
                        const allocations = result.split('\n').map(line => {
                            const match = line.match(/([\w\s]+):\s*(\d+)%/);
                            return match ? { name: match[1].trim(), value: parseInt(match[2], 10) } : null;
                        }).filter(Boolean) as { name: string, value: number };
                        const COLORS = ['#06b6d4', '#6366f1', '#f59e0b', '#10b981'];
                        return (
                            <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocations} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>{allocations.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} /><Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }}/></PieChart></ResponsiveContainer></div>
                        );
                    }}
                </AIGeneratorWidget>
            </div>
        </div>
    );
};

const ErrorStage: FC<{ error: string }> = ({ error }) => (
    <Card>
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-xl font-semibold text-white mb-2">An Error Occurred</h3>
            <p className="text-red-300">{error}</p>
        </div>
    </Card>
);

// ================================================================================================
// MAIN ORCHESTRATOR COMPONENT
// ================================================================================================

const QuantumWeaverViewInternal: FC = () => {
    const [workflowId, setWorkflowId] = useState<string | null>(localStorage.getItem('weaverWorkflowId'));
    const [currentStatus, setCurrentStatus] = useState<string | null>(localStorage.getItem('weaverWorkflowStatus'));
    const [businessPlan, setBusinessPlan] = useState<string>(localStorage.getItem('weaverBusinessPlan') || "");

    const startAnalysisMutation = useStartAnalysis();
    const approvePlanMutation = useApprovePlan();
    const { data: statusData, isFetching: isPollingStatus } = useAnalysisStatus(workflowId, currentStatus);

    const workflowState = statusData?.getBusinessPlanAnalysisStatus;

    useEffect(() => {
        if (workflowState?.status && workflowState.status !== currentStatus) {
            setCurrentStatus(workflowState.status);
            localStorage.setItem('weaverWorkflowStatus', workflowState.status);
        }
    }, [workflowState, currentStatus]);

    const handlePitchSubmit = (plan: string) => {
        setBusinessPlan(plan);
        localStorage.setItem('weaverBusinessPlan', plan);
        startAnalysisMutation.mutate(plan, {
            onSuccess: (data) => {
                const newWorkflowId = data.startBusinessPlanAnalysis.workflowId;
                setWorkflowId(newWorkflowId);
                setCurrentStatus('PENDING');
                localStorage.setItem('weaverWorkflowId', newWorkflowId);
                localStorage.setItem('weaverWorkflowStatus', 'PENDING');
            }
        });
    };

    const handlePassTest = () => {
        if (workflowId) {
            approvePlanMutation.mutate(workflowId, {
                onSuccess: () => {
                    setCurrentStatus('PENDING_APPROVAL'); // A local state before polling confirms the backend change
                    localStorage.setItem('weaverWorkflowStatus', 'PENDING_APPROVAL');
                }
            });
        }
    };

    const stage = workflowState?.status || currentStatus;
    const isLoading = startAnalysisMutation.isPending || approvePlanMutation.isPending || isPollingStatus;

    switch (stage) {
        case 'PENDING':
        case 'PENDING_APPROVAL':
            return <AnalysisStage title="Plato is Analyzing Your Plan" subtitle="The AI is reviewing your business model, market fit, and potential..." />;
        case 'ANALYSIS_COMPLETE':
            if (!workflowState?.result?.questions || !workflowState?.result?.feedback) {
                return <AnalysisStage title="Processing Results" subtitle="Finalizing analysis from Plato AI..." />;
            }
            return <TestStage feedback={workflowState.result.feedback} questions={workflowState.result.questions} onPass={handlePassTest} isLoading={isLoading} />;
        case 'APPROVED':
            if (!workflowState?.result?.coachingPlan) {
                return <ErrorStage error="There was an issue loading your approval details." />;
            }
            return <ApprovedStage loanAmount={workflowState.result.loanAmount || 50000} coachingPlan={workflowState.result.coachingPlan} businessPlan={businessPlan} />;
        case 'FAILED':
            return <ErrorStage error={workflowState?.error || "An unknown error occurred in the workflow."} />;
        case 'Pitch':
        default:
            return <PitchStage onSubmit={handlePitchSubmit} isLoading={isLoading} />;
    }
};

const queryClient = new QueryClient();

const QuantumWeaverView: FC = () => (
    <QueryClientProvider client={queryClient}>
        <QuantumWeaverViewInternal />
    </QueryClientProvider>
);

export default QuantumWeaverView;
