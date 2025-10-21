# The Story of `Card.tsx`: The Building Block of Reality

In the universe of Demo Bank, every piece of information, every widget, every insight needs a home. It needs a frame, a container that gives it structure, beauty, and a defined space. The `Card` component is that home. It is the fundamental building block of reality, the atom from which almost every view in the application is constructed.

The `Card` is a master of its craft, a chameleon that can adapt its form and function to any purpose. It is defined not by what it *contains*, but by the elegant and versatile vessel it *provides*.

## The Many Faces of the Card: `CardVariant`

The Card can wear many masks, each suited to a different occasion. Its `variant` property allows it to change its very essence:

-   **`default`**: Its most common form. A semi-transparent vessel with a soft, blurred background and a subtle border. It floats gently above the application's cosmic background.
-   **`outline`**: A more defined, ethereal form. It sheds its background, appearing as a simple, elegant border, perfect for containing secondary information.
-   **`interactive`**: A living card. It senses the user's presence, glowing with a cyan light and rising slightly when the cursor hovers over it. It is a silent invitation to "click me, explore what's inside."

## The Soul of the Card: The `children`

A card is nothing without its soul, the content it is meant to hold. The `children` prop is where this soul resides. Whatever is placed inside the `<Card>` tags in another component—a chart, a list of transactions, a complex form—is accepted and cradled within the Card's beautiful frame.

## A Mind of Its Own: Intelligence and State

The Card is no mere dumb container. It has a mind of its own, with built-in intelligence to handle various states of being:

-   **`isCollapsible`**: It can be given the power to hide its own contents, collapsing into just a header to save space and reduce complexity for the user. It manages its own animation, smoothly transitioning its height from full to zero.
-   **`isLoading`**: It understands the concept of waiting. When `isLoading` is true, it replaces its children with a `LoadingSkeleton`, a beautiful, pulsing representation of data that is yet to arrive. This provides a graceful and engaging loading experience.
-   **`errorState`**: It knows how to handle failure. If given an `errorState` message, it transforms its interior into an `ErrorDisplay`, clearly and calmly communicating that something went wrong, and even providing a `Retry` button to attempt recovery.

## The Structure of Power: Header and Footer

The Card has a well-defined anatomy:

-   **`CardHeader`**: Its head. It holds the `title` and can be adorned with `headerActions`—small, powerful buttons that allow the user to interact with the card's content.
-   **`CardFooter`**: Its feet. A designated area at the bottom for secondary actions or summary information, neatly separated by a subtle line.

The `Card` is the most important visual component in Demo Bank. It is a testament to the power of good design: creating a single, robust, intelligent, and beautiful component that can be reused to build a complex and varied world with elegance and consistency. It is the architectural DNA of the application's interface.
