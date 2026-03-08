# Industrial UPS Digital Twin - Project Context

## Project Overview
This project is a high-fidelity **Industrial Uninterruptible Power Supply (UPS) Digital Twin Simulator**. It is designed as a training and simulation tool for electrical engineers and operators to practice critical switching operations (like maintenance bypass, black starts) in a 100% safe, virtual environment.

### Main Technologies
- **Frontend:** React 19 (TypeScript)
- **Styling:** Vanilla CSS with Tailwind CSS utilities (via Vite)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Build Tool:** Vite

### Core Architecture
The application is split into a clear UI layer and a simulation engine layer:

1.  **Entry Point (`Launcher.tsx`):** A cinematic boot screen and mode selector where users choose between **Single Module** and **Parallel System** simulations.
2.  **Simulation Containers (`App.tsx`, `ParallelApp.tsx`):** Manage the top-level state, simulation clock (ticks every 200ms), and coordinate between the engine and UI components.
3.  **Physics Engine (`services/engine.ts`, `services/parallel_engine.ts`):** 
    - Calculates real-time voltages, currents, and frequencies.
    - Implements advanced battery physics (Peukert's Law, temperature effects, State of Health).
    - Models thermal behavior of components (Rectifiers, Inverters) based on load.
4.  **Logic Controller (`services/UPSController.ts`):**
    - Implements a Finite State Machine (FSM) for UPS modes (ONLINE, BATTERY_MODE, STATIC_BYPASS, etc.).
    - Enforces mechanical and electrical interlocks (e.g., preventing closing maintenance bypass at the wrong time).
    - Manages protection logic and fault responses based on industrial standards (IEC 62040-3, IEEE 142).
5.  **UI Components (`components/`):**
    - **SLD (Single Line Diagram):** Interactive schematic for toggling breakers and inspecting components.
    - **Dashboard:** Real-time gauges and health metrics.
    - **Faceplates:** Detailed control panels for individual modules (Rectifier, Inverter, STS).
    - **Procedure Panel:** Guided Standard Operating Procedures (SOPs) for training.
    - **Waveforms:** Real-time AC/DC signal visualization.

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)

### Key Commands
- `npm install`: Install project dependencies.
- `npm run dev`: Start the local development server (Vite).
- `npm run build`: Generate a production build in the `dist/` directory.
- `npm run preview`: Preview the production build locally.

### Environment Configuration
- Set `GEMINI_API_KEY` in `.env.local` if utilizing Gemini-powered features (though the core simulator is local physics-based).

## Development Conventions

### Physics-First Logic
All state changes should ideally flow through the `UPSController` or the `engine`. Avoid direct state manipulation in UI components. The simulation runs on a "Tick" interval (200ms) which updates the `SimulationState`.

### Industrial Standards
The project references specific industrial standards for its logic:
- **IEC 62040-3:** UPS performance and test requirements (VFI classification, efficiency curves).
- **IEEE 142:** Grounding of industrial and commercial power systems (High-Resistance Grounding simulation).

### Component Design
- Use **Framer Motion** for all interactive transitions and "glowing" electrical effects.
- Icons should come from **Lucide React**.
- Keep components modular and reusable (e.g., `BatteryUnit`, `Breaker`).

### State Management
The project uses standard React `useState` and `useEffect` hooks for local simulation state. For complex parallel systems, look at `parallel_types.ts` and how it extends the base `SimulationState`.

## Key Files
- `types.ts` / `parallel_types.ts`: TypeScript definitions for the entire simulation state.
- `constants.ts` / `parallel_constants.ts`: Initial states, thresholds, and procedure definitions.
- `services/engine.ts`: The "heart" of the physics calculations.
- `services/UPSController.ts`: The "brain" of the logic and protections.
