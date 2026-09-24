# SAHYADRI NAV — ARCHITECTURE SPECIFICATION

## 1. Architectural Philosophy
Sahyadri Nav is built on the principle that indoor campus navigation requires **semantic spatial graphs** rather than continuous GPS or raster grid pathfinding. Indoor buildings present distinct physical barriers (walls, locked zones, one-way gates, steps vs ramps) that GPS cannot resolve reliably.

The core differentiator is:
> **"The shortest route is not always the best route."**

The system models user constraints and building states into cost profiles evaluated dynamically at runtime.

---

## 2. Multi-Tier Architecture

### A. Campus Data Layer (`/backend/data/` & `/frontend/src/data/`)
- Normalized JSON datasets describing Floors, Locations, Graph Nodes, Edges, QR Checkpoints, and Active Hazard Reports.
- 100% synchronized across backend and frontend for dual-mode execution (Online API & Offline Client Fallback).

### B. Pathfinding & Routing Engine (`Router` in Python & `OfflineRouter` in TypeScript)
- Employs an exact **A* (A-Star) Pathfinding Algorithm** using priority queues.
- **Heuristic Function:**
  $$h(u, v) = \sqrt{(x_u - x_v)^2 + (y_u - y_v)^2} \cdot \text{scale} + |\text{floor}_u - \text{floor}_v| \cdot \text{floor\_penalty}$$
- **Weighted Edge Cost Formulation:**
  $$\text{cost}(e) = w_d \cdot \text{dist} + \text{stairs\_penalty} + \text{elevator\_penalty} + w_t \cdot \text{turns} + w_{\text{diff}} \cdot \text{difficulty}$$

#### Route Profiles:
1. **FASTEST Mode:**
   - Focus: Raw travel time minimization.
   - Allows stairs if shorter, treats elevator wait time as $+15\text{s}$.
2. **ACCESSIBLE Mode:**
   - Focus: Physical step-free accessibility.
   - Cost on stairs or non-accessible links: $\infty$ (Strictly disallowed).
   - Strongly prioritizes the West Elevator Bank and level ramps.
3. **EASY Mode:**
   - Focus: Cognitive simplicity for first-time visitors.
   - Penalizes turns ($w_t = 10.0$) and complex corridor intersections.
   - Prefers wide, straightforward arterial corridors with clear sightlines.

---

## 3. Dynamic Hazard Engine
- Obstacles are stored in an active issue register (SQLite on backend, in-memory on frontend).
- When an edge or node is reported as `closed` (e.g. Staircase A painting), its cost is set to $\infty$.
- The routing engine re-evaluates the active route within $<15\text{ms}$, dispatching a push notification and animating the updated path.

---

## 4. Indoor Positioning & "I'm Lost" State Machine
Indoor GPS is unreliable due to concrete slabs. Positioning uses a hybrid model:
- **Primary:** QR Checkpoints installed at entrance pillars, staircase landings, and doorposts.
- **Secondary:** Door Sign Recognition (OCR text matcher resolving to verified room numbers).
- **Manual:** Prominent landmark selection.
