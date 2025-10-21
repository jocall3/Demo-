# The Story of `mockData.ts`: The Primordial Memories

Every world, when it is first born, is not a complete void. It is seeded with primordial memories, foundational stories that give it shape and history from the very first moment. In the universe of Demo Bank, `data/mockData.ts` is the source of these memories.

This file is not code that *does* anything. It is a library of ancient scrolls, a collection of pure data that represents the "day one" state of the user's financial life. It is the history that exists before the user's first interaction.

## The Ledger of the Past: `MOCK_TRANSACTIONS`

```ts
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'expense', category: 'Dining', ... },
  { id: '2', type: 'income', category: 'Salary', ... },
];
```

This is the first and most important scroll. It is a ledger of the user's recent past—a coffee purchased, a paycheck received, a bill paid. Each entry conforms perfectly to the `Transaction` law defined in `types.ts`. This data ensures that when the application awakens, the user's world is not empty. There are stories to tell, patterns to analyze, and a history to build upon from the very beginning.

## The Treasury of Wealth: `MOCK_ASSETS`

This scroll details the user's existing wealth. It lists their `Stocks`, `Bonds`, and `Crypto`, giving them a starting portfolio. This is the foundation of their net worth, the treasure they have already accumulated.

## The Covenants of Spending: `MOCK_BUDGETS`

These are the rules the user has set for themselves in the past. It defines their agreed-upon limits for `Dining`, `Shopping`, and `Transport`. When the application loads, it can immediately show the user how they are performing against these self-imposed covenants.

## The Whispers of the Future: `MOCK_UPCOMING_BILLS` & `MOCK_SAVINGS_GOALS`

This data represents the user's known future.
-   `MOCK_UPCOMING_BILLS` lists the financial obligations looming on the horizon—a credit card payment, an internet bill.
-   `MOCK_SAVINGS_GOALS` contains the user's dreams—the "Cyberpunk Vacation," the "New Hoverboard."

This data allows the AI to be proactive from its first moment of consciousness. It can see not only where the user has been, but where they are going and what they hope to achieve.

## The Seed of Life

This file is the seed from which the dynamic, interactive experience grows. The `DataContext` takes this raw, static data and breathes life into it, placing it into a state that can be changed and updated. The AI sifts through these primordial memories to generate its first insights. The charts and graphs render this data to paint a picture of a financial life already in progress.

Without `mockData.ts`, the user would be greeted with a beautiful, but empty, world. With it, they are greeted with *their* world, rich with history and pregnant with possibility.
