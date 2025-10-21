# The Story of `InvestmentsView.tsx`: The Celestial Observatory

Welcome to the Celestial Observatory. This is a realm dedicated to viewing the grand cosmos of the user's wealth. It's a place not just for numbers and charts, but for perspective, for seeing the past performance of assets and charting a course for the future. It has been recently upgraded with a new wing dedicated to "Social Impact Investing," a place to invest not just for profit, but for purpose.

## The Orrery: `InvestmentPortfolio`

The heart of the observatory is the `InvestmentPortfolio` component, a grand orrery that displays the user's assets as a beautiful, color-coded pie chart. It is the map of the user's personal financial solar system, showing the relative size and gravity of their stocks, bonds, and other holdings.

## The Star-Charting Table: `Asset Performance (YTD)`

This section provides a different perspective. It uses a `BarChart` to display the year-to-date performance of each individual asset. It's a star-charting table that allows the user to compare the velocity and trajectory of each star in their constellation, seeing which ones are burning brightest.

## The New Wing: Social Impact Investing (ESG)

This is the observatory's newest and most profound addition. It is a gallery showcasing companies that align with Environmental, Social, and Governance (ESG) principles. It is a place to find "stars with a conscience."

-   **The `ESGScore` Component**: A specialized tool was crafted for this gallery. It represents a company's virtue as a series of five leaves. The more leaves that glow with green light, the higher the company's ESG rating. It is a simple, beautiful, and immediate measure of a company's positive impact on the world.
-   **The Gallery**: The `SocialImpactInvesting` component displays a list of these virtuous companies, each with its name, its mission statement, and its glowing ESG Score. It provides a button to "Invest Now," opening a modal that allows the user to directly support the companies they believe in.

## The Oracle's Eye: `InvestmentGrowthSimulator`

The latest addition to the observatory is a powerful scrying pool, the `InvestmentGrowthSimulator`. This interactive tool allows the user to look into the future.

-   **The Projection**: It takes the user's current portfolio value and, using a standard assumed growth rate, projects its potential value over the next ten years, displayed as a beautiful `AreaChart`.
-   **The Slider of Possibility**: The user can interact with a "Monthly Contribution" slider. As they increase or decrease the amount they plan to invest each month, the projection chart updates in real-time, showing them how their own actions and discipline can dramatically alter their future wealth. It turns them from a passive observer into the active captain of their financial ship.

The `InvestmentsView` is more than a list of assets. It is a sophisticated and inspiring observatory that gives the user the tools to understand their past, appreciate their present, and actively shape their future, all while keeping an eye on the virtuous stars of social impact.
