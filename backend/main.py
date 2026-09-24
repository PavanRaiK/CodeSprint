import json
import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.router import Router
from backend.database import init_db, get_all_issues, add_issue, update_issue_status, delete_issue

app = FastAPI(
    title="Sahyadri Nav API",
    description="Context-Aware Indoor Campus Navigation System for Sahyadri College of Engineering & Management",
    version="1.0.0"
)

# Enable CORS for local Vite dev and any production client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def load_json(filename: str):
    with open(os.path.join(DATA_DIR, filename), 'r', encoding='utf-8') as f:
        return json.load(f)

# Load campus dataset into memory
floors = load_json('floors.json')
locations = load_json('locations.json')
nodes = load_json('nodes.json')
edges = load_json('edges.json')
qr_checkpoints = load_json('qr_checkpoints.json')

# Initialize DB
init_db()

router = Router(nodes, edges, floors)

# Pydantic Request/Response Models
class RouteRequest(BaseModel):
    start_node: str = Field(..., description="ID of start node or location node")
    destination_node: str = Field(..., description="ID of destination node or location node")
    mode: str = Field("fastest", description="Route profile: fastest | accessible | easy")
    extra_blocked_nodes: Optional[List[str]] = Field(default_factory=list)
    extra_blocked_edges: Optional[List[str]] = Field(default_factory=list)

class QRResolveRequest(BaseModel):
    code: str = Field(..., description="Scanned QR code text, e.g. SAHYADRI_QR_ST2_B")

class IssueCreateRequest(BaseModel):
    title: str
    type: str = "staircase_closed" # staircase_closed | corridor_blocked | elevator_unavailable | maintenance
    node_ids: List[str] = Field(default_factory=list)
    edge_ids: List[str] = Field(default_factory=list)
    floor: int = 0
    severity: str = "medium"
    description: Optional[str] = ""

class OCRDetectRequest(BaseModel):
    detected_text: str = Field(..., description="Text extracted from door sign image")

# Helper to get current active blocked nodes & edges from issues
def get_current_blockages():
    active_issues = [iss for iss in get_all_issues() if iss.get('status') == 'active']
    blocked_nodes = set()
    blocked_edges = set()
    for iss in active_issues:
        for nid in iss.get('node_ids', []):
            blocked_nodes.add(nid)
        for eid in iss.get('edge_ids', []):
            blocked_edges.add(eid)
    return blocked_nodes, blocked_edges

@app.get("/")
def root():
    return {
        "system": "Sahyadri Nav Indoor Navigation API",
        "tagline": "Navigate the campus. Know the way.",
        "status": "online",
        "floors_count": len(floors),
        "locations_count": len(locations),
        "nodes_count": len(nodes),
        "edges_count": len(edges)
    }

@app.get("/api/floors")
def get_floors():
    return floors

@app.get("/api/locations")
def get_locations(floor: Optional[int] = None, type: Optional[str] = None):
    results = locations
    if floor is not None:
        results = [l for l in results if l['floor'] == floor]
    if type is not None:
        results = [l for l in results if l['type'] == type]
    return results

@app.get("/api/locations/search")
def search_locations(q: str = Query("", min_length=1)):
    query = q.strip().lower()
    matches = []
    
    # Exact or prefix match scores higher
    for loc in locations:
        score = 0
        name = loc['name'].lower()
        dept = loc.get('department', '').lower()
        desc = loc.get('description', '').lower()
        aliases = [a.lower() for a in loc.get('aliases', [])]

        if query == loc['id'].lower():
            score += 100
        elif any(query == a for a in aliases):
            score += 90
        elif any(a.startswith(query) for a in aliases):
            score += 80
        elif query in name:
            score += 70
        elif any(query in a for a in aliases):
            score += 60
        elif query in dept:
            score += 40
        elif query in desc:
            score += 20

        # Number extraction (e.g. searching '214' or 'room 214')
        q_numbers = re.findall(r'\d+', query)
        if q_numbers:
            for num in q_numbers:
                if num in aliases or num in name:
                    score += 50

        if score > 0:
            matches.append((score, loc))

    matches.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in matches[:25]]

@app.get("/api/nodes")
def get_nodes(floor: Optional[int] = None):
    if floor is not None:
        return [n for n in nodes if n['floor'] == floor]
    return nodes

@app.get("/api/edges")
def get_edges():
    return edges

@app.post("/api/route")
def calculate_route(req: RouteRequest):
    # Normalize start & destination node IDs (in case user passed location ID like R214 instead of RN_R214)
    start_id = req.start_node
    dest_id = req.destination_node

    # If start is a location ID, resolve to location's node_id
    loc_by_id = {l['id']: l for l in locations}
    if start_id in loc_by_id:
        start_id = loc_by_id[start_id]['node_id']
    if dest_id in loc_by_id:
        dest_id = loc_by_id[dest_id]['node_id']

    blocked_nodes, blocked_edges = get_current_blockages()
    if req.extra_blocked_nodes:
        blocked_nodes.update(req.extra_blocked_nodes)
    if req.extra_blocked_edges:
        blocked_edges.update(req.extra_blocked_edges)

    route_res = router.find_route(
        start_node_id=start_id,
        end_node_id=dest_id,
        mode=req.mode.lower(),
        blocked_edges=blocked_edges,
        blocked_nodes=blocked_nodes
    )

    if not route_res:
        raise HTTPException(
            status_code=404,
            detail="No connected route is available between the selected locations with the current constraints."
        )

    # Calculate alternative modes for fast comparison
    alt_modes = {}
    for m in ['fastest', 'accessible', 'easy']:
        if m != req.mode.lower():
            alt = router.find_route(start_id, dest_id, mode=m, blocked_edges=blocked_edges, blocked_nodes=blocked_nodes)
            if alt:
                alt_modes[m] = {
                    "distance": alt['distance'],
                    "eta_seconds": alt['eta_seconds'],
                    "stairs_count": alt['stairs_count'],
                    "elevator_used": alt['elevator_used'],
                    "turn_count": alt['turn_count']
                }

    return {
        "status": "success",
        "mode": req.mode.lower(),
        "route": route_res,
        "alternatives": alt_modes,
        "blocked_applied": {
            "nodes": list(blocked_nodes),
            "edges": list(blocked_edges)
        }
    }

@app.get("/api/qr/checkpoints")
def list_qr_checkpoints():
    return qr_checkpoints

@app.post("/api/qr/resolve")
def resolve_qr(req: QRResolveRequest):
    code = req.code.strip()
    # Check by code or id or query parameter
    matched = next((qr for qr in qr_checkpoints if qr['code'] == code or qr['id'] == code or code.endswith(qr['code'])), None)
    if not matched:
        # Check if URL parameter matches
        if "code=" in code:
            extracted = code.split("code=")[-1].split("&")[0]
            matched = next((qr for qr in qr_checkpoints if qr['code'] == extracted or qr['id'] == extracted), None)

    if not matched:
        raise HTTPException(
            status_code=404,
            detail=f"Campus QR checkpoint '{code}' was not recognized. Please scan a verified Sahyadri Nav checkpoint."
        )

    matched_node = next((n for n in nodes if n['id'] == matched['node_id']), None)
    return {
        "status": "success",
        "checkpoint": matched,
        "node": matched_node,
        "floor": matched['floor'],
        "message": f"Location updated: {matched['name']}"
    }

@app.get("/api/issues")
def list_issues():
    return get_all_issues()

@app.post("/api/issues", status_code=status.HTTP_201_CREATED)
def report_issue(req: IssueCreateRequest):
    issue_id = f"ISSUE-{int(datetime.now().timestamp())}"
    issue_dict = {
        "id": issue_id,
        "title": req.title,
        "type": req.type,
        "node_ids": req.node_ids,
        "edge_ids": req.edge_ids,
        "floor": req.floor,
        "status": "active",
        "severity": req.severity,
        "description": req.description,
        "reported_at": datetime.utcnow().isoformat() + "Z"
    }
    created = add_issue(issue_dict)
    return created

@app.patch("/api/issues/{issue_id}")
def update_issue(issue_id: str, status_payload: Dict[str, str]):
    new_status = status_payload.get('status', 'resolved')
    ok = update_issue_status(issue_id, new_status)
    if not ok:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"status": "success", "id": issue_id, "new_status": new_status}

@app.delete("/api/issues/{issue_id}")
def delete_issue_by_id(issue_id: str):
    ok = delete_issue(issue_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"status": "success", "message": f"Issue {issue_id} removed"}

@app.post("/api/ocr/detect-sign")
def detect_room_sign(req: OCRDetectRequest):
    text = req.detected_text.strip()
    digits = re.findall(r'\d+', text)
    candidate_locations = []

    if digits:
        for d in digits:
            for loc in locations:
                if d in loc['aliases'] or d in loc['name']:
                    candidate_locations.append(loc)

    # Also fuzzy match text
    if not candidate_locations:
        for loc in locations:
            if text.lower() in loc['name'].lower() or any(text.lower() in a.lower() for a in loc['aliases']):
                candidate_locations.append(loc)

    if not candidate_locations:
        return {
            "status": "uncertain",
            "message": f"Could not confidently resolve '{text}' to a verified campus room.",
            "detected_raw": text,
            "confidence": 0.0,
            "candidates": []
        }

    best = candidate_locations[0]
    return {
        "status": "matched",
        "confidence": 0.94 if digits else 0.78,
        "detected_raw": text,
        "matched_location": best,
        "destination_node": best['node_id'],
        "floor": best['floor'],
        "message": f"Detected: {best['name']} ({floors[best['floor']]['name']})"
    }
