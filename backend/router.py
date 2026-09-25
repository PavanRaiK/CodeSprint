import heapq
import math
from typing import List, Dict, Any, Optional, Tuple

class Router:
    def __init__(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], floors: List[Dict[str, Any]]):
        self.nodes = {n['id']: n for n in nodes}
        self.floors = {f['floor']: f for f in floors}
        self.edges = edges
        self.build_graph()

    def build_graph(self):
        self.adj: Dict[str, List[Dict[str, Any]]] = {nid: [] for nid in self.nodes}
        for e in self.edges:
            if e['from'] in self.adj:
                self.adj[e['from']].append(e)

    def heuristic(self, u_id: str, v_id: str) -> float:
        u = self.nodes[u_id]
        v = self.nodes[v_id]
        dx = (u['x'] - v['x']) * 0.25
        dy = (u['y'] - v['y']) * 0.25
        # Floor change height estimation (4m per floor)
        df = abs(u['floor'] - v['floor']) * 5.0
        return math.sqrt(dx*dx + dy*dy) + df

    def compute_edge_cost(self, edge: Dict[str, Any], mode: str, blocked_edges: set, blocked_nodes: set) -> float:
        if not edge.get('active', True) or edge['id'] in blocked_edges:
            return float('inf')
        if edge['to'] in blocked_nodes or edge['from'] in blocked_nodes:
            return float('inf')

        dist = edge['distance']
        stairs = edge.get('stairs', False)
        elev = edge.get('elevator', False)
        accessible = edge.get('accessible', True)
        diff = edge.get('difficulty', 0)
        turns = edge.get('turn_complexity', 0)

        if mode == 'accessible':
            if stairs or not accessible:
                return float('inf')
            # Accessible profile rewards flat corridors and elevators
            return dist * 1.0 + (0.0 if elev else 2.0) + (diff * 2.0) + (turns * 1.5)

        elif mode == 'easy':
            # Easy profile prioritizes fewer turns, straightforward corridors
            stairs_penalty = 12.0 if stairs else 0.0
            elev_penalty = 5.0 if elev else 0.0
            turn_penalty = turns * 10.0
            diff_penalty = diff * 8.0
            return (dist * 1.0) + stairs_penalty + elev_penalty + turn_penalty + diff_penalty

        else: # 'fastest' (default)
            # Prioritize raw travel time/distance
            elev_penalty = 15.0 if elev else 0.0 # waiting time for lift
            stairs_penalty = 4.0 if stairs else 0.0
            return (dist * 1.0) + stairs_penalty + elev_penalty + (turns * 1.0) + (diff * 1.0)

    def find_route(self, start_node_id: str, end_node_id: str, mode: str = 'fastest',
                   blocked_edges: Optional[set] = None, blocked_nodes: Optional[set] = None) -> Optional[Dict[str, Any]]:
        if start_node_id not in self.nodes or end_node_id not in self.nodes:
            return None

        blocked_edges = blocked_edges or set()
        blocked_nodes = blocked_nodes or set()

        if start_node_id == end_node_id:
            start_node = self.nodes[start_node_id]
            return {
                "route_node_ids": [start_node_id],
                "nodes": [start_node],
                "edges": [],
                "distance": 0.0,
                "eta_seconds": 0,
                "floors": [start_node['floor']],
                "stairs_count": 0,
                "elevator_used": False,
                "turn_count": 0,
                "instructions": ["You are already at your destination."]
            }

        pq: List[Tuple[float, float, str]] = [] # (f_score, g_score, node_id)
        heapq.heappush(pq, (0.0, 0.0, start_node_id))

        g_scores: Dict[str, float] = {start_node_id: 0.0}
        came_from: Dict[str, Tuple[str, Dict[str, Any]]] = {}

        while pq:
            f_score, current_g, current_id = heapq.heappop(pq)

            if current_id == end_node_id:
                return self._reconstruct_path(start_node_id, end_node_id, came_from)

            if current_g > g_scores.get(current_id, float('inf')):
                continue

            for edge in self.adj.get(current_id, []):
                neighbor_id = edge['to']
                edge_cost = self.compute_edge_cost(edge, mode, blocked_edges, blocked_nodes)
                if math.isinf(edge_cost):
                    continue

                tentative_g = current_g + edge_cost
                if tentative_g < g_scores.get(neighbor_id, float('inf')):
                    g_scores[neighbor_id] = tentative_g
                    came_from[neighbor_id] = (current_id, edge)
                    h = self.heuristic(neighbor_id, end_node_id)
                    heapq.heappush(pq, (tentative_g + h, tentative_g, neighbor_id))

        return None # No route found

    def _reconstruct_path(self, start_id: str, end_id: str,
                          came_from: Dict[str, Tuple[str, Dict[str, Any]]]) -> Dict[str, Any]:
        curr = end_id
        path_nodes = []
        path_edges = []
        total_dist = 0.0
        stairs_count = 0
        elevator_used = False
        floors_visited = set()
        turn_count = 0

        while curr in came_from:
            prev, edge = came_from[curr]
            path_nodes.append(self.nodes[curr])
            path_edges.append(edge)
            total_dist += edge['distance']
            if edge.get('stairs', False):
                stairs_count += 1
            if edge.get('elevator', False):
                elevator_used = True
            floors_visited.add(self.nodes[curr]['floor'])
            if edge.get('turn_complexity', 0) > 0:
                turn_count += 1
            curr = prev

        path_nodes.append(self.nodes[start_id])
        floors_visited.add(self.nodes[start_id]['floor'])

        path_nodes.reverse()
        path_edges.reverse()

        # ETA calculation: average walking speed 1.2 m/s + 15s per stairs + 20s if elevator
        eta_seconds = int(round(total_dist / 1.2 + (stairs_count * 15) + (25 if elevator_used else 0)))

        # Generate readable instructions
        instructions = self._generate_instructions(path_nodes, path_edges)

        return {
            "route_node_ids": [n['id'] for n in path_nodes],
            "nodes": path_nodes,
            "edges": path_edges,
            "distance": round(total_dist, 1),
            "eta_seconds": eta_seconds,
            "floors": sorted(list(floors_visited)),
            "stairs_count": stairs_count,
            "elevator_used": elevator_used,
            "turn_count": turn_count,
            "instructions": instructions
        }

    def _generate_instructions(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        steps = []
        if len(nodes) < 2:
            return [{"step": 1, "text": "Arrive at destination.", "type": "arrive", "floor": nodes[0]['floor']}]

        step_idx = 1
        steps.append({
            "step": step_idx,
            "text": f"Start at {nodes[0]['name']}",
            "type": "start",
            "floor": nodes[0]['floor'],
            "node_id": nodes[0]['id']
        })
        step_idx += 1

        curr_seg_dist = 0.0
        last_action_node = nodes[0]

        for i in range(len(edges)):
            edge = edges[i]
            u = nodes[i]
            v = nodes[i+1]
            curr_seg_dist += edge['distance']

            # Check if this is a floor change via stairs, elevator, or campus entrance
            if u['floor'] != v['floor']:
                if (u['floor'] == -1 and v['floor'] == 0) or (u['floor'] == 0 and v['floor'] == -1):
                    if v['floor'] == 0:
                        steps.append({
                            "step": step_idx,
                            "text": "Enter Sahyadri Main Academic Block through Ground South Entrance",
                            "type": "turn",
                            "floor": 0,
                            "node_id": v['id']
                        })
                    else:
                        steps.append({
                            "step": step_idx,
                            "text": "Exit Main Academic Block onto Campus Grounds via South Entrance",
                            "type": "turn",
                            "floor": -1,
                            "node_id": v['id']
                        })
                elif edge.get('elevator', False):
                    u_fl = "Ground Floor" if u['floor'] == 0 else f"Floor {u['floor']}"
                    v_fl = "Ground Floor" if v['floor'] == 0 else f"Floor {v['floor']}"
                    steps.append({
                        "step": step_idx,
                        "text": f"Take West Elevator from {u_fl} to {v_fl}",
                        "type": "elevator",
                        "floor": v['floor'],
                        "node_id": v['id']
                    })
                else:
                    stair_name = "Staircase"
                    if "STAIR_A" in u['id']: stair_name = "Staircase A (North-West)"
                    elif "STAIR_B" in u['id']: stair_name = "Staircase B (East Central)"
                    elif "STAIR_C" in u['id']: stair_name = "Staircase C (South Central)"
                    elif "STAIR_D" in u['id']: stair_name = "Staircase D (South Wing)"
                    elif "STAIR_LIB" in u['id']: stair_name = "Library Internal Spiral Staircase"

                    direction = "up" if v['floor'] > u['floor'] else "down"
                    target_floor = "Ground Floor" if v['floor'] == 0 else f"Floor {v['floor']}"
                    steps.append({
                        "step": step_idx,
                        "text": f"Take {stair_name} {direction} to {target_floor}",
                        "type": "stairs",
                        "floor": v['floor'],
                        "node_id": v['id']
                    })
                step_idx += 1
                curr_seg_dist = 0.0
                last_action_node = v
                continue

            # Significant landmark or turn or room arrival
            is_turn = edge.get('turn_complexity', 0) > 0
            is_dest = (i == len(edges) - 1)

            if is_dest:
                steps.append({
                    "step": step_idx,
                    "text": f"Arrive at {v['name']}",
                    "type": "arrive",
                    "floor": v['floor'],
                    "node_id": v['id']
                })
                step_idx += 1
            elif is_turn and curr_seg_dist >= 15.0:
                steps.append({
                    "step": step_idx,
                    "text": f"Continue along corridor past {u['name']} · {int(round(curr_seg_dist))} m",
                    "type": "turn",
                    "floor": v['floor'],
                    "node_id": v['id']
                })
                step_idx += 1
                curr_seg_dist = 0.0

        return steps
