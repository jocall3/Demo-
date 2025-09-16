# The Story of `constants.tsx`: The Pantheon

In the world of Demo Bank, some truths are eternal and unchanging. These are not mere variables; they are foundational pillars, celestial bodies by which all other components navigate. The file `constants.tsx` is the home of this pantheon. It is where the gods and goddesses of the application reside, their forms and functions defined for all to see and use.

## The Pantheon of Navigation: `NAV_ITEMS`

```tsx
export const NAV_ITEMS = [
    { id: View.Dashboard, label: 'Dashboard', icon: <DashboardIcon /> },
    { id: View.Transactions, label: 'Transactions', icon: <TransactionsIcon /> },
    // ...and so on
];
```

This is the primary council of gods. Each object in this array represents a major realm in the Demo Bank universe, a destination for the user. They are not simple links; they are entities with three parts:

-   **`id`**: Their true name, a `View` enum from the `types.ts` codex. This is how they are known to the application's logic.
-   **`label`**: Their common name, the name they present to the mortal user.
-   **`icon`**: Their divine symbol, a unique glyph that represents their domain.

This pantheon is summoned by the `Sidebar` component, which uses this sacred list to build the grand navigation of the application. By defining them here, `constants.tsx` ensures that the path to every realm is consistent, true, and easily managed from a single, holy source.

## The Glyphs of Power: The Icon Components

Following the great council, the file defines the very essence of their symbols.

```tsx
function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg>...</svg>
    );
}

function TransactionsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg>...</svg>
    );
}
```

These are not just images. They are functional components, divine beings crafted from the pure, mathematical language of SVG. Each one is a self-contained entity, a spell that can be cast anywhere in the application to summon its corresponding symbol.

They are defined with `stroke="currentColor"`, a mark of their adaptability. This means they do not have a fixed color but will adopt the color of the text around them, allowing them to seamlessly blend into any environment, whether it's a humble button or a grand heading.

## The Colors of Creation: `AppTheme`

Finally, the file defines the `AppTheme`, the very color palette of creation.

```tsx
export const AppTheme = {
    colors: {
        primary: {
            DEFAULT: '#06b6d4', // cyan-500
        },
        // ...
    }
};
```

This is the divine artist's palette. It declares the primary `cyan` of innovation, the secondary `indigo` of trust, and the deep, dark `gray` of the cosmos that serves as the canvas. By defining these colors as constants, the file ensures that the entire application shares a consistent and harmonious visual language. A change here would be like changing the color of the sky for all inhabitants of the Demo Bank world.

`constants.tsx` is the bedrock of the application's identity. It holds the map of the world, the symbols of power, and the colors of creation. It is the source of all that is unchanging and true.
