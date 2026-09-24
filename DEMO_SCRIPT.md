# SAHYADRI NAV — HACKATHON LIVE DEMO SCRIPT

## 🎯 The Core Pitch (30-second hook)
> *"Most college navigation systems only answer: **WHERE IS THE ROOM?**"*
> *"Sahyadri Nav answers: **HOW SHOULD I REACH IT?**"*
>
> *"Because on a multi-floor campus, the shortest path is not always the best path. A student carrying heavy project gear needs an elevator. A visitor needs a path with fewer turns. And when a staircase is blocked for painting, the system must adapt dynamically in real-time."*

---

## 🎬 Step-by-Step Live Demo Presentation

### Step 1: The Blueprint & Campus Graph
1. Open the Sahyadri Nav application at `http://localhost:5173`.
2. Point to the interface:
   - Notice the dark, technical Mapbox-style console interface (`DESIGN.md`).
   - The map displays the real Sahyadri College building blueprint floor plan.
   - Click through the floor selector: **Ground**, **1st**, **2nd**, **3rd**, **4th**, **5th**.
   - Notice how all staircases, the West Elevator Bank, and wings align seamlessly across floors.

### Step 2: Search & The 3 Route Profiles
1. In the search box ("Where do you want to go?"), type `Room 214` (or click the quick chip).
2. Select **Room 214 (Faculty Department)**.
3. Show the judges the 3 calculated route profiles:
   - **⚡ Fastest:** ~4 min · 284 m · stairs.
   - **♿ Accessible:** ~4 min · 273 m · 100% step-free via West Elevator.
   - **🧭 Easy:** Fewer turns and simpler corridor transitions.
4. Select **Accessible**:
   - The blue route halo appears across the floor plan.
   - Follow the turn-by-turn guidance: Main Entrance $\rightarrow$ level corridor $\rightarrow$ West Elevator $\rightarrow$ 2nd Floor $\rightarrow$ Room 214.

### Step 3: Dynamic Hazard Rerouting
1. Click **Demo Controls** in the header.
2. Click **2. Dynamic Reroute: Close Staircase A**.
3. **The 'WOW' Moment:**
   - The system displays a banner: *"Staircase A Closed for Maintenance. Dynamic rerouting triggered."*
   - A red hazard beacon appears over Staircase A on the map.
   - The A* engine instantly recalculates an alternative route avoiding Staircase A.

### Step 4: Indoor Positioning via QR Checkpoint
1. Click **Demo Controls** $\rightarrow$ **3. Simulate QR Checkpoint Scan** (or click **Update Location** and choose `2nd Floor · Staircase B Checkpoint`).
2. The blue "YOU ARE HERE" marker snaps to the 2nd Floor Staircase B landing.
3. The remaining path updates to show the final steps into Room 214.

### Step 5: "I'm Lost" Recovery
1. Click the **I'm Lost** button in the header.
2. Demonstrate the 3 recovery modes:
   - Scan nearby QR code
   - Type in a visible room number or sign (e.g., `214` or `Library`)
   - Pick a known campus landmark
3. Conclude:
   > *"Sahyadri Nav turns physical blueprints into an intelligent, accessible, living indoor navigation system."*
