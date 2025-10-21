# The Story of `SendMoneyView.tsx`: The Portal of Exchange

This is the Portal of Exchange, the conduit through which value flows from the user's world to another's. It is one of the most critical and sensitive realms in the Demo Bank universe, and it is guarded by powerful technology and beautiful design.

## The Two Rails: A Bridge to Any World

The portal is versatile. It understands that value can travel on different rails. The user is presented with a clear choice:

1.  **QuantumPay (ISO20022)**: This is the futuristic, bank-grade rail. It represents a connection to the formal, international banking system, complete with fields for standardized "Remittance Info." This demonstrates the platform's enterprise-level capabilities. When a transaction is sent via this rail, the component simulates a call to the Open Bank Project API, showing its readiness to connect to real-world financial infrastructure.

2.  **Cash App**: This is the familiar, peer-to-peer rail. It represents a connection to the modern, agile world of consumer fintech. By including this, Demo Bank shows it understands and embraces the entire financial ecosystem.

This dual-rail system is a powerful statement about the platform's philosophy: to be a universal hub, capable of speaking any financial language.

## The Guardian: The `BiometricModal`

The act of sending money is protected by a powerful guardian: the `BiometricModal`. Before any value can be transferred, the user must prove their identity not by what they know (a password), but by who they are.

This is a high-fidelity simulation designed to inspire confidence and awe:

1.  **The Scan**: The modal requests camera access and displays a live feed of the user's face within a circular frame, overlaid with an animated "scanning" grid. It creates the feeling of a futuristic identity scan.
2.  **The Confirmation**: After a few moments, the scan succeeds, and a large, animated checkmark appears. Identity is confirmed.
3.  **The Quantum Ledger Verification**: This is the most impressive step. The view shifts to a `QuantumLedgerAnimation`, a grid of pulsing, interconnected blocks. A series of messages appears, simulating the "Heuristic API's" multi-step process:
    -   "Validating identity..."
    -   "Checking sufficient funds..."
    -   "Executing transaction on secure ledger..."
    -   "Confirming transfer..."

This sequence transforms a simple transaction into a secure, transparent, and technologically advanced event. It builds a profound sense of trust and security.

The `SendMoneyView` is a masterclass in user experience design for a critical function. It provides choice, simulates robust, multi-step security, and makes the simple act of sending money feel both effortless and incredibly secure.