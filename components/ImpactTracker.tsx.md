# The Story of `ImpactTracker.tsx`: The Monument to a Greener Future

In the command center of the Dashboard, there is a monument. It is not made of stone or steel, but of data and light. The `ImpactTracker` component is this monument, a living testament to the user's positive environmental impact, a feature that declares Demo Bank's core belief: finance can be a force for good.

## The Source of Power

The monument does not invent its own story; it draws its power directly from the `DataContext` wellspring. It is given two crucial pieces of information:

-   **`treesPlanted`**: The current height of the monument, the total number of trees the user's activity has helped plant.
-   **`progress`**: The measure of the next seed growing, the percentage progress towards planting the next tree.

The `DataContext` is responsible for the logic. It watches the user's spending, and for every `$250` spent, it increments the tree count and resets the progress. The `ImpactTracker` is simply the beautiful storyteller that visualizes this data.

## The Art of the Monument

The monument is designed to be simple, beautiful, and motivating.

-   **The Sigil (`TreeIcon`)**: At its peak is its sigil, a glowing green tree, a universal symbol of life and growth.
-   **The Grand Number**: The total number of trees planted is displayed in a massive, 5xl font. It is a bold, proud declaration of achievement.
-   **The Growing Seed**: Below, a progress bar fills with a vibrant gradient, from green to cyan. It is a visual representation of the next tree taking root, growing with every transaction.

## The Purpose

The `ImpactTracker` is the soul of the "Green Impact" initiative. Its purpose is to forge a direct, tangible link between the user's everyday financial activity and a positive, real-world outcome. It transforms the abstract concept of "conscious spending" into a gamified, rewarding experience. It's a constant, gentle reminder that every swipe of the card can be a small vote for a greener, healthier planet. It is the conscience of the Dashboard made visible.