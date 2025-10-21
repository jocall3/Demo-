# The Story of `InvestmentPortfolio.tsx`: The Observatory

While the `BalanceSummary` shows the total value of a user's liquid assets, the `InvestmentPortfolio` provides a deeper, more cosmic view. It is the observatory, the celestial map that shows how the user's wealth is distributed across the different asset classes—the constellations of their financial universe.

## The Orrery of Wealth: The `PieChart`

At the heart of the observatory is a magnificent orrery, a `PieChart` powered by the `recharts` library. This is not a simple chart; it is a dynamic model of the user's portfolio.

-   **The Celestial Bodies**: Each `asset` from the `DataContext` (Stocks, Bonds, Crypto, Real Estate) is represented as a colored slice of the pie. The size of the slice is directly proportional to its `value`, providing an immediate, intuitive understanding of the portfolio's composition.
-   **The Colors of the Cosmos**: Each asset class is given a distinct `color` from the `MOCK_ASSETS` data. These colors are used to paint the slices of the pie, making the chart a vibrant and beautiful celestial map.
-   **The Legend**: A `Legend` stands beside the chart, a key that explains the meaning of each color, ensuring the map is easy to read and understand.
-   **The Telescope (`Tooltip`)**: When the user hovers over a slice of the pie, a `Tooltip` appears, a magical telescope that provides detailed information about that specific asset class, showing its name and precise value.

## The Grand Totals: The Numbers

Beside the celestial map, the observatory displays the two most important numbers for any investor:

1.  **Total Value**: The sum of all asset values is displayed in a bold, 5xl font. This is the total gravitational pull of the user's investment universe.
2.  **Weighted Performance (YTD)**: This is a more subtle and intelligent calculation. The component doesn't just average the performance of each asset; it calculates a *weighted* average based on the value of each holding. This provides a true and accurate measure of the portfolio's overall growth for the year, displayed in a confident, green font.

## The Calculation Chamber: `useMemo`

Like its cousin, the `BalanceSummary`, the `InvestmentPortfolio` performs its calculations within the efficient and sacred space of a `useMemo` hook. It calculates the `totalValue` and `weightedPerformance` only when the underlying `assets` data changes, ensuring peak performance and preventing unnecessary work.

The `InvestmentPortfolio` component serves a vital role. It elevates the user's perspective from the day-to-day flow of transactions to a grand, strategic view of their accumulated wealth, showing them not just what they have, but how it is structured and how it is growing. It is their personal observatory for navigating the cosmos of investment.
