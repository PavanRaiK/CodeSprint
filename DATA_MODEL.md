# SAHYADRI NAV — DATA MODEL SPECIFICATION

## 1. Entities Overview

The Sahyadri campus spatial schema separates physical spaces (Rooms, Labs, Lounges) from topological navigational elements (Corridors, Intersections, Staircases, Elevators).

```
   ┌──────────────┐          ┌──────────────┐
   │    Floor     │          │ QRCheckpoint │
   └──────┬───────┘          └──────┬───────┘
          │ 1:N                     │ N:1
          ▼                         ▼
   ┌──────────────┐  binds   ┌──────────────┐
   │CampusLocation│ ───────> │  CampusNode  │
   └──────────────┘          └──────┬───────┘
                                    │
                                    │ connects
                                    ▼
                             ┌──────────────┐
                             │  CampusEdge  │
                             └──────────────┘
```

---

## 2. Entity Schemas

### Floor (`floors.json`)
| Field | Type | Description |
|---|---|---|
| `floor` | integer | Floor number (0=Ground, 1=1st, 2=2nd, 3=3rd, 4=4th, 5=5th) |
| `id` | string | Short identifier (e.g. `"G"`, `"1"`, `"2"`) |
| `name` | string | Full display name (e.g. `"Ground Floor"`) |
| `short_name` | string | Compact label for selector (e.g. `"Ground"`) |
| `bg_image` | string | Path to high-resolution blueprint image |
| `elevation` | number | Height in meters relative to ground level (4m increments) |

### CampusLocation (`locations.json`)
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique primary key (e.g. `"R214"`, `"LOC_G_PRINCIPAL"`) |
| `name` | string | Human-readable room title (e.g. `"Room 214 (Faculty Department)"`) |
| `type` | string | Category (`"room"`, `"lab"`, `"office"`, `"library"`, `"hall"`, etc.) |
| `floor` | integer | Floor number on which the room resides |
| `node_id` | string | Foreign key referencing the entry `CampusNode` |
| `x`, `y` | number | Canonical coordinates on the 1000x1200 blueprint canvas |
| `department` | string | Academic/administrative department |
| `aliases` | string[] | Search keywords and variations (e.g. `["214", "faculty dept"]`) |
| `accessible` | boolean | True if step-free wheelchair accessible |
| `description`| string | Architectural landmark or navigational context |

### CampusNode (`nodes.json`)
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique node key (e.g. `"N_G_S_ENT"`, `"STAIR_B_2"`, `"ELEV_1_2"`) |
| `name` | string | Landmark or junction title |
| `type` | string | `"room"`, `"corridor"`, `"intersection"`, `"staircase"`, `"elevator"`, `"entrance"` |
| `floor` | integer | Associated floor level |
| `x`, `y` | number | Coordinate position on normalized blueprint coordinate space |
| `accessible`| boolean | Accessibility indicator |

### CampusEdge (`edges.json`)
| Field | Type | Description |
|---|---|---|
| `id` | string | Edge identifier (e.g. `"E_14"`) |
| `from`, `to` | string | Source and target node IDs |
| `distance` | number | Physical walking distance in meters |
| `stairs` | boolean | True if edge traverses physical steps |
| `elevator` | boolean | True if edge represents an elevator ride |
| `accessible`| boolean | True if traversable by wheelchair or mobility aid |
| `turn_complexity` | number | Turn penalty value (0=straight, 1=slight turn, 2=sharp corner) |
| `difficulty` | number | Segment difficulty / crowd factor (0 to 3) |
| `active` | boolean | True if open; set to false when blocked/closed |

### QRCheckpoint (`qr_checkpoints.json`)
| Field | Type | Description |
|---|---|---|
| `id` | string | Tag identifier (e.g. `"QR-ST2-B"`) |
| `code` | string | Scanned payload string (e.g. `"SAHYADRI_QR_ST2_B"`) |
| `name` | string | Human name (e.g. `"2nd Floor · Staircase B Checkpoint"`) |
| `floor` | integer | Physical floor level |
| `node_id` | string | Mapped graph node ID |
| `physical_location` | string | Physical mounting description |
