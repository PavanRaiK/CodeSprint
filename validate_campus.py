import json
import os
import sys
from collections import deque

def validate_campus_graph():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'backend', 'data') if os.path.exists(os.path.join(base_dir, 'backend', 'data')) else os.path.join(base_dir, 'data')

    with open(os.path.join(data_dir, 'floors.json'), 'r', encoding='utf-8') as f:
        floors = json.load(f)
    with open(os.path.join(data_dir, 'locations.json'), 'r', encoding='utf-8') as f:
        locations = json.load(f)
    with open(os.path.join(data_dir, 'nodes.json'), 'r', encoding='utf-8') as f:
        nodes = json.load(f)
    with open(os.path.join(data_dir, 'edges.json'), 'r', encoding='utf-8') as f:
        edges = json.load(f)
    with open(os.path.join(data_dir, 'qr_checkpoints.json'), 'r', encoding='utf-8') as f:
        qr_checkpoints = json.load(f)

    node_ids = {n['id']: n for n in nodes}
    location_ids = {l['id']: l for l in locations}
    errors = []
    warnings = []

    # 1. Validate Nodes
    floor_nums = {fl['floor'] for fl in floors}
    for n in nodes:
        if n['floor'] not in floor_nums:
            errors.append(f"Node {n['id']} references invalid floor {n['floor']}")
        if not (0 <= n['x'] <= 1000 and 0 <= n['y'] <= 1200):
            warnings.append(f"Node {n['id']} has coordinates out of standard bounds: ({n['x']}, {n['y']})")

    # 2. Validate Edges
    adj = {nid: [] for nid in node_ids}
    for e in edges:
        if e['from'] not in node_ids:
            errors.append(f"Edge {e['id']} has nonexistent 'from' node {e['from']}")
        if e['to'] not in node_ids:
            errors.append(f"Edge {e['id']} has nonexistent 'to' node {e['to']}")
        if e['from'] in node_ids and e['to'] in node_ids:
            adj[e['from']].append(e['to'])

    # 3. Validate Locations
    for loc in locations:
        if loc['node_id'] not in node_ids:
            errors.append(f"Location {loc['id']} ('{loc['name']}') references nonexistent node {loc['node_id']}")
        if loc['floor'] not in floor_nums:
            errors.append(f"Location {loc['id']} has invalid floor {loc['floor']}")

    # 4. Validate QR Checkpoints
    for qr in qr_checkpoints:
        if qr['node_id'] not in node_ids:
            errors.append(f"QR {qr['id']} references nonexistent node {qr['node_id']}")
        if qr['floor'] not in floor_nums:
            errors.append(f"QR {qr['id']} has invalid floor {qr['floor']}")

    # 5. Connectivity analysis (Connected Components via BFS)
    visited = set()
    start_node = next(iter(node_ids))
    queue = deque([start_node])
    visited.add(start_node)

    while queue:
        curr = queue.popleft()
        for neighbor in adj.get(curr, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    disconnected = set(node_ids.keys()) - visited
    if disconnected:
        errors.append(f"Graph has {len(disconnected)} disconnected nodes: {list(disconnected)[:5]}")

    print("========================================")
    print("      SAHYADRI NAV CAMPUS VALIDATION    ")
    print("========================================")
    print(f"Floors: {len(floors)}")
    print(f"Locations: {len(locations)}")
    print(f"Nodes: {len(nodes)}")
    print(f"Edges: {len(edges)}")
    print(f"QR Checkpoints: {len(qr_checkpoints)}")
    print(f"Disconnected nodes: {len(disconnected)}")
    print("----------------------------------------")

    if errors:
        print(f"FAILED: Found {len(errors)} errors:")
        for err in errors[:10]:
            print(f"  - {err}")
        return False
    else:
        print("Campus graph valid.")
        if warnings:
            print(f"({len(warnings)} non-blocking warnings)")
        return True

if __name__ == '__main__':
    valid = validate_campus_graph()
    sys.exit(0 if valid else 1)
