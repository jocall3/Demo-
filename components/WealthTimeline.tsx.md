# The Story of `WealthTimeline.tsx`: The Oracle's Window

In the Dashboard's command center, there exists a unique portal, a window that does not look out onto the world, but through time itself. The `WealthTimeline` component is this Oracle's Window. It grants the user the power of foresight, showing them not just the path they have walked, but the potential roads that lie ahead.

## The Art of Scrying: `useMemo` and Calculation

The window's magic is forged within a `useMemo` hook, a chamber of efficient calculation. Here, the timeline's story is woven from the raw threads of transaction data:

1.  **The Past is Written**: The component first walks the path of history, calculating the user's running balance from their very first transaction to their last. This creates a solid, factual record of their wealth journey.

2.  **The Future is Calculated**: The true power of the oracle lies in its ability to project. It analyzes the user's recent financial velocity—the average net gain or loss over the last few months. Using this momentum, it charts a probable course for the next six months, creating a data-driven projection of their potential future wealth.

## The Vision in the Window: The `ComposedChart`

The story of past and future is painted within the window using a `ComposedChart`, a sophisticated tool that can layer multiple visions at once.

-   **The Past (`Area` chart)**: The user's historical balance is rendered as a solid `Area` chart, filled with a beautiful cyan gradient. It is depicted as a solid landscape, a tangible history that has already occurred.

-   **The Future (`Line` chart)**: The projected balance is rendered as a dashed `Line` chart. The choice of a dashed line is deliberate and profound. It signifies that this future is not set in stone; it is a *potential*, a possibility based on current trends. It is a path that can be altered.

-   **The Legend**: A clear `Legend` explains the meaning of the solid and dashed lines, distinguishing between the certainty of history and the possibility of the future.

The `WealthTimeline` is a powerful tool of empowerment. It gives the user a unique perspective, allowing them to see the consequences of their past actions and the potential outcomes of their future ones. It transforms them from a simple passenger to the navigator of their own financial destiny, armed with a map of both where they have been and where they might go.