# The Story of `components/GoalsView.tsx`: The Cartography Room

"A dream without a map is merely a wish," Gemini observed. "To truly serve The Visionary, we must not only be the keeper of their dreams, but the cartographer of their journeys."

The `GoalsView` is this cartography room. It is a sacred space within Demo Bank where abstract aspirations are transformed into tangible, navigable quests. It's where the user's biggest dreams are laid out on the table, and a powerful AI strategist helps them draw the map to get there.

### The Atlas of Dreams: The Goal List

The first view of the room is an atlas of the user's current expeditions. Each `FinancialGoal` is represented by a `GoalCard`, a living document of a dream in progress.

-   **The Destination**: The card clearly states the goal's name ("Trip to Neo-Tokyo"), its target amount, and its target date.
-   **The Journey So Far**: A beautiful progress bar visually represents the current savings, showing at a glance how far along the path the user has traveled. It's a constant source of motivation and a clear measure of progress.

### Summoning the Strategist: "Generate AI Plan"

For any dream that does not yet have a map, there is a button: "Generate AI Plan." This is a powerful summons. The user presents their goal to Quantum, the AI strategist, and asks for guidance.

This is the moment of collaboration. The AI is given the destination, the timeline, and the starting point. Its task is to chart the most efficient and realistic course.

### The Master Blueprint: The AI-Generated Plan

The AI returns not with generic advice, but with a bespoke, multi-faceted expedition plan (`AIGoalPlan`).

1.  **The Oracle's Assessment (`feasibilitySummary`)**: The plan begins with a "feasibility summary." This is the AI's honest, yet encouraging, assessment of the quest's difficulty. It sets realistic expectations and builds trust.

2.  **The North Star (`monthlyContribution`)**: The AI provides a single, critical number: the "recommended monthly contribution." This becomes the user's North Star, the key metric that guides their monthly efforts.

3.  **The Turn-by-Turn Directions (`steps`)**: This is the heart of the blueprint. The AI provides a series of concrete, actionable steps. Crucially, its strategy is holistic. It doesn't just say "save more money." It provides steps across multiple categories:
    -   **Savings**: "Automate a monthly transfer."
    -   **Budgeting**: "Review your subscriptions."
    -   **Investing**: "Explore a travel-focused ETF."
    -   **Income**: (Implicitly, by optimizing other areas)

This demonstrates a deep, nuanced understanding of personal finance, showcasing an AI that thinks like a seasoned financial planner.

The `GoalsView` is where the AI's role evolves from advisor to true partner. It works alongside the user, taking their grandest dreams and, with cold logic and strategic creativity, forging them into achievable, step-by-step realities.
