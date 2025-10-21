import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../context/DataContext';
import { WeaverStage, AIPlanStep, AIQuestion, AIPlan } from '../types';
import Card from './Card';
import { GoogleGenAI } from "@google/genai";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// ================================================================================================
// HELPER & WIDGET COMPONENTS
// ================================================================================================

/**
 * @description A reusable widget for generating and displaying AI content on demand.
 * It handles the loading and error states for an individual API call.
 */
const AIGeneratorWidget: React.FC<{
    title: string;
    prompt: string;
    businessPlan: string;
    children?: (result: string) => React.ReactNode;
}> = ({ title, prompt, businessPlan, children }) => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("AIGeneratorWidget must be inside DataProvider");
    }
    const { geminiApiKey } = context;
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setResult('');
        if (!geminiApiKey) {
            setError('Please set your Gemini API key in the API Status view.');
            setIsLoading(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const fullPrompt = `${prompt}\n\nHere is the business plan for context:\n\n"${businessPlan}"`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });
            setResult(response.text.trim());
        } catch (err) {
            console.error(`Error generating ${title}:`, err);
            setError('Plato AI could not generate this insight.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title={title}>
            <div className="space-y-3 min-h-[8rem] flex flex-col justify-center">
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                
                {isLoading && (
                    <div className="flex items-center justify-center space-x-2">
                        <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-400">Generating...</span>
                    </div>
                )}

                {!isLoading && result && (
                    children ? children(result) : <p className="text-gray-300 whitespace-pre-wrap text-sm">{result}</p>
                )}

                {!isLoading && !result && !error && (
                    <button
                        onClick={handleGenerate}
                        className="w-full py-2 px-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        {`Generate ${title}`}
                    </button>
                )}
            </div>
        </Card>
    );
};

const Scorecard: React.FC<{ scores: { viability: number, marketFit: number, risk: number } }> = ({ scores }) => {
    const ScoreBar: React.FC<{ label: string, value: number, color: string, isRisk?: boolean }> = ({ label, value, color, isRisk }) => (
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


// ================================================================================================
// STAGE COMPONENTS
// ================================================================================================

const PitchStage: React.FC<{
    onSubmit: (plan: string) => void;
    isLoading: boolean;
}> = ({ onSubmit, isLoading }) => {
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
        }, 500); // Debounce time

        return () => clearTimeout(handler);
    }, [businessPlanInput]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (businessPlanInput.trim()) {
            onSubmit(businessPlanInput);
        }
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
                        <button
                            type="submit"
                            disabled={!businessPlanInput.trim() || isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Submitting...' : 'Pitch to Plato AI'}
                        </button>
                    </form>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Scorecard scores={scores} />
            </div>
        </div>
    );
};

const AnalysisStage: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <Card>
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                <div className="absolute inset-2 border-4 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-cyan-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.636 4.364l.707-.707M17.657 6.343l-.707.707M12 21a9 9 0 110-18 9 9 0 010 18z" />
                    </svg>
                </div>
            </div>
            <h3 className="text-2xl font-semibold text-white mt-6">{title}</h3>
            <p className="text-gray-400 mt-2">{subtitle}</p>
        </div>
    </Card>
);

const TestStage: React.FC<{
    feedback: string;
    questions: AIQuestion[];
    onPass: () => void;
    isLoading: boolean;
}> = ({ feedback, questions, onPass, isLoading }) => {
    const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);
    const mockDetailedFeedback = " This is a strong concept, but market penetration could be challenging given the established players. Your financial projections seem optimistic; we'll need to stress-test these assumptions. The operational plan lacks detail on supply chain management. Overall, promising but requires refinement in key areas.";
    
    return (
        <Card title="Plato's Assessment">
            <p className="text-lg text-cyan-300 mb-2">Initial Feedback:</p>
            <div className="text-gray-300 italic mb-6">
                <p>"{feedback}{!isFeedbackExpanded && '...'}"</p>
                {isFeedbackExpanded && <p className="mt-2">{mockDetailedFeedback}</p>}
                <button onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)} className="text-cyan-400 text-sm mt-2 hover:underline">
                    {isFeedbackExpanded ? "Show Less" : "Drilldown for Detail"}
                </button>
            </div>
            
            <p className="text-lg text-cyan-300 mb-4">Sample Assessment Questions:</p>
            <div className="space-y-4 mb-6">
                {questions.map((q) => (
                    <div key={q.id} className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="font-semibold text-gray-200">{q.question}</p>
                        <p className="text-xs text-cyan-400 mt-1 uppercase tracking-wider">{q.category}</p>
                    </div>
                ))}
            </div>
            <button
                onClick={onPass}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
            >
                {isLoading ? "Finalizing..." : "Simulate Passing the Test"}
            </button>
        </Card>
    );
};


const ApprovedStage: React.FC<{
    loanAmount: number;
    coachingPlan: AIPlan;
    businessPlan: string;
}> = ({ loanAmount, coachingPlan, businessPlan }) => {
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    
    const handleCompleteStep = (stepIndex: number) => {
        setCompletedSteps(prev => {
            if (prev.includes(stepIndex)) {
                return prev.filter(i => i !== stepIndex); // Un-complete
            }
            return [...prev, stepIndex]; // Complete
        });
    };
    
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
                        <div className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>Progress</span>
                            <span>{completionProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${completionProgress}%` }}></div>
                        </div>
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
                                    <button onClick={() => handleCompleteStep(index)} className="ml-4 flex-shrink-0 text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white">
                                        {isCompleted ? 'Undo' : 'Complete'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <AIGeneratorWidget title="Plato's Pro-Tip" prompt="Give me a single, powerful pro-tip for a new founder based on this business idea. Be concise and inspiring." businessPlan={businessPlan} />
                
                <AIGeneratorWidget title="Competitor Landscape" prompt="Briefly identify 2-3 potential competitors for this business. For each, give a name, a one-sentence description of their focus, and a key strength." businessPlan={businessPlan}>
                    {(result) => {
                        const competitors = result.split('\n\n').map(c => {
                            const nameMatch = c.match(/\*\*(.*?)\*\*/);
                            const focusMatch = c.match(/Focus: (.*?)\./);
                            const strengthMatch = c.match(/Strength: (.*?)\./);
                            return {
                                name: nameMatch ? nameMatch[1] : 'N/A',
                                focus: focusMatch ? focusMatch[1] : '',
                                strength: strengthMatch ? strengthMatch[1] : '',
                            };
                        });
                        return (
                            <div className="space-y-3">
                                {competitors.map((comp, i) => (
                                    <div key={i} className="p-2 bg-gray-900/50 rounded-lg">
                                        <p className="font-semibold text-cyan-300 text-sm">{comp.name}</p>
                                        <p className="text-xs text-gray-300"><strong>Focus:</strong> {comp.focus}</p>
                                        <p className="text-xs text-gray-300"><strong>Strength:</strong> {comp.strength}</p>
                                    </div>
                                ))}
                            </div>
                        );
                    }}
                </AIGeneratorWidget>

                <AIGeneratorWidget title="Risk Assessment" prompt="List the top 3 potential risks for this business idea in a bulleted list." businessPlan={businessPlan} />

                <AIGeneratorWidget title="Target Audience Persona" prompt="Create a brief user persona for the ideal customer of this business. Include a name, age, and a key motivation." businessPlan={businessPlan} />
                
                <AIGeneratorWidget title="SWOT Analysis" prompt="Generate a simple SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for this business. Use one bullet point for each." businessPlan={businessPlan} />
                
                <AIGeneratorWidget title="Elevator Pitch" prompt="Craft a compelling one-sentence elevator pitch for this business." businessPlan={businessPlan} />
                
                <AIGeneratorWidget title="Team Builder AI" prompt="Suggest the first two key hires this founder should make, and provide a one-sentence justification for each." businessPlan={businessPlan} />
                
                <AIGeneratorWidget title="Brand Identity" prompt="Suggest one creative company name and a catchy tagline for this business." businessPlan={businessPlan} />
                
                <Card title="Burn Rate & Runway">
                     <div className="space-y-3 text-sm">
                        <p className="text-gray-400">Enter your estimated monthly expenses to calculate your financial runway with the new funding.</p>
                        <input type="number" placeholder="e.g., 15000" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    </div>
                </Card>

                <AIGeneratorWidget title="Funding Allocation" prompt="Suggest a simple percentage-based budget allocation for this new funding across 3-4 key areas (e.g., Product, Marketing, Operations)." businessPlan={businessPlan}>
                    {(result) => {
                        // A more complex child to parse the result and render a chart
                        const allocations = result.split('\n').map(line => {
                            const match = line.match(/([\w\s]+):\s*(\d+)%/);
                            if (match) {
                                return { name: match[1].trim(), value: parseInt(match[2], 10) };
                            }
                            return null;
                        }).filter(Boolean) as { name: string, value: number }[];
                        
                        const COLORS = ['#06b6d4', '#6366f1', '#f59e0b', '#10b981'];

                        return (
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={allocations} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                                            {allocations.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                                        <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    }}
                </AIGeneratorWidget>
            </div>
        </div>
    );
};


const ErrorStage: React.FC<{ error: string }> = ({ error }) => (
    <Card>
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">An Error Occurred</h3>
            <p className="text-red-300">{error}</p>
        </div>
    </Card>
);

// ================================================================================================
// MAIN COMPONENT & EXPORT
// ================================================================================================

const QuantumWeaverView: React.FC = () => {
    const context = useContext(DataContext);

    if (!context) {
        throw new Error("QuantumWeaverView must be used within a DataProvider.");
    }

    const { weaverState, pitchBusinessPlan, simulateTestPass } = context;
    const { stage, businessPlan, feedback, questions, loanAmount, coachingPlan, error } = weaverState;

    const isLoading = stage === WeaverStage.Analysis || stage === WeaverStage.FinalReview;

    switch (stage) {
        case WeaverStage.Pitch:
            return <PitchStage onSubmit={pitchBusinessPlan} isLoading={isLoading} />;
        case WeaverStage.Analysis:
            return <AnalysisStage title="Plato is Analyzing Your Plan" subtitle="The AI is reviewing your business model, market fit, and potential." />;
        case WeaverStage.Test:
            if (!questions || questions.length === 0) {
                 return <AnalysisStage title="Generating Assessment" subtitle="Plato is preparing your personalized questions." />;
            }
            return <TestStage feedback={feedback} questions={questions} onPass={simulateTestPass} isLoading={isLoading} />;
        case WeaverStage.FinalReview:
             return <AnalysisStage title="Final Review in Progress" subtitle="Plato is determining the loan amount and generating your coaching plan." />;
        case WeaverStage.Approved:
            if (!coachingPlan) {
                return <ErrorStage error="There was an issue loading your approval details." />;
            }
            return <ApprovedStage loanAmount={loanAmount} coachingPlan={coachingPlan} businessPlan={businessPlan} />;
        case WeaverStage.Error:
            return <ErrorStage error={error || "An unknown error occurred."} />;
        default:
            return <PitchStage onSubmit={pitchBusinessPlan} isLoading={isLoading} />;
    }
};

export default QuantumWeaverView;