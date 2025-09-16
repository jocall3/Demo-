# The Story of `Header.tsx`: The Crown

At the very top of the Demo Bank kingdom, sitting above all other realms, is the `Header`. It is the application's crown, a persistent symbol of identity, awareness, and control. It is the user's constant companion, the one piece of the interface that never disappears, no matter where their journey takes them.

## The Left Side of the Crown: Identity and Access

The left side of the Header establishes the application's identity and provides a crucial key for users on smaller screens.

-   **The Menu Button (The "Key")**: This is a small but vital component that only appears on mobile devices. It is the key that unlocks the `Sidebar`, summoning the grand navigation from its hidden state. It is a direct command to the `App` orchestrator, telling it to change the `isSidebarOpen` state.
-   **The Title (`DEMO BANK`)**: The name of the kingdom, inscribed in bold, uppercase letters. It is a constant, unwavering declaration of where the user is.

## The Centerpiece of the Crown: The Heuristic API Status

This is a unique and powerful feature of the Header, a living jewel at its center.

```tsx
const HeuristicAPIStatus: React.FC = () => { ... };
```

This sub-component is a window into the AI's mind. It cycles through a series of messages, creating the powerful illusion that the AI is *always* working in the background:
- "Heuristic API: Actively analyzing portfolio..."
- "Heuristic API: Monitoring market data..."
- "Heuristic API: Identified 2 potential savings..."

Accompanied by a pulsing, animated waveform, this component transforms the application from a reactive tool into a proactive, sentient partner. It is a constant, ambient reminder that Quantum, the AI Advisor, is ever vigilant.

## The Right Side of the Crown: The User's Presence

The right side of the Header is dedicated to the user, "The Visionary." It is their personal command center.

-   **The Notification Bell**: This is the town crier. It silently watches the `notifications` in the `DataContext`. When a new, unread notification arrives, a small cyan gem appears on the bell, alerting the user that there is news. Clicking it reveals a dropdown of recent events, each a potential path to a different part of the application.

-   **The Profile Avatar**: This is the user's throne. It displays their avatar and their chosen title, "The Visionary." It is a representation of the user's presence and authority within the application. Clicking it opens a small menu, granting access to the `Settings` realm or the ability to log out, ending the session.

The `Header` is more than just a title bar. It is the application's command bridge. It anchors the user's experience, providing a constant sense of place, keeping them informed of the AI's status and important events, and giving them control over their personal profile. It is the steadfast crown on a dynamic kingdom.
