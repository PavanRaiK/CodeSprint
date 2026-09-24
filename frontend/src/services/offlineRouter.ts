import { CampusNode, CampusEdge, RouteResult, NavigationInstruction, RouteMode } from '../types';

export class OfflineRouter {
  private nodes: Map<string, CampusNode>;
  private edges: CampusEdge[];
  private adj: Map<string, CampusEdge[]>;

  constructor(nodes: CampusNode[], edges: CampusEdge[]) {
    this.nodes = new Map(nodes.map(n => [n.id, n]));
    this.edges = edges;
    this.adj = new Map();
    this.buildGraph();
  }

  public updateEdges(edges: CampusEdge[]) {
    this.edges = edges;
    this.buildGraph();
  }

  private buildGraph() {
    this.adj.clear();
    for (const [id] of this.nodes) {
      this.adj.set(id, []);
    }
    for (const e of this.edges) {
      if (this.adj.has(e.from)) {
        this.adj.get(e.from)!.push(e);
      }
    }
  }

  private heuristic(uId: string, vId: string): number {
    const u = this.nodes.get(uId)!;
    const v = this.nodes.get(vId)!;
    const dx = (u.x - v.x) * 0.25;
    const dy = (u.y - v.y) * 0.25;
    const df = Math.abs(u.floor - v.floor) * 5.0;
    return Math.sqrt(dx * dx + dy * dy) + df;
  }

  private computeEdgeCost(
    edge: CampusEdge,
    mode: RouteMode,
    blockedEdges: Set<string>,
    blockedNodes: Set<string>
  ): number {
    if (!edge.active || blockedEdges.has(edge.id)) return Infinity;
    if (blockedNodes.has(edge.from) || blockedNodes.has(edge.to)) return Infinity;

    const dist = edge.distance;
    const stairs = edge.stairs;
    const elev = edge.elevator;
    const accessible = edge.accessible;
    const diff = edge.difficulty || 0;
    const turns = edge.turn_complexity || 0;

    if (mode === 'accessible') {
      if (stairs || !accessible) return Infinity;
      return dist * 1.0 + (elev ? 0.0 : 2.0) + (diff * 2.0) + (turns * 1.5);
    } else if (mode === 'easy') {
      const stairsPenalty = stairs ? 12.0 : 0.0;
      const elevPenalty = elev ? 5.0 : 0.0;
      const turnPenalty = turns * 10.0;
      const diffPenalty = diff * 8.0;
      return dist * 1.0 + stairsPenalty + elevPenalty + turnPenalty + diffPenalty;
    } else {
      // fastest
      const elevPenalty = elev ? 15.0 : 0.0;
      const stairsPenalty = stairs ? 4.0 : 0.0;
      return dist * 1.0 + stairsPenalty + elevPenalty + turns * 1.0 + diff * 1.0;
    }
  }

  public findRoute(
    startNodeId: string,
    endNodeId: string,
    mode: RouteMode = 'fastest',
    blockedEdges: Set<string> = new Set(),
    blockedNodes: Set<string> = new Set()
  ): RouteResult | null {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) {
      return null;
    }

    if (startNodeId === endNodeId) {
      const node = this.nodes.get(startNodeId)!;
      return {
        route_node_ids: [startNodeId],
        nodes: [node],
        edges: [],
        distance: 0,
        eta_seconds: 0,
        floors: [node.floor],
        stairs_count: 0,
        elevator_used: false,
        turn_count: 0,
        instructions: [
          { step: 1, text: 'You are at your destination.', type: 'arrive', floor: node.floor, node_id: node.id }
        ]
      };
    }

    const gScores = new Map<string, number>();
    const cameFrom = new Map<string, { prev: string; edge: CampusEdge }>();
    gScores.set(startNodeId, 0);

    // Simple priority queue using array sorted by fScore
    const openSet: Array<{ id: string; fScore: number; gScore: number }> = [
      { id: startNodeId, fScore: this.heuristic(startNodeId, endNodeId), gScore: 0 }
    ];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.fScore - b.fScore);
      const current = openSet.shift()!;
      const currentId = current.id;

      if (currentId === endNodeId) {
        return this.reconstructPath(startNodeId, endNodeId, cameFrom);
      }

      if (current.gScore > (gScores.get(currentId) ?? Infinity)) {
        continue;
      }

      const neighbors = this.adj.get(currentId) || [];
      for (const edge of neighbors) {
        const neighborId = edge.to;
        const edgeCost = this.computeEdgeCost(edge, mode, blockedEdges, blockedNodes);
        if (!isFinite(edgeCost)) continue;

        const tentativeG = current.gScore + edgeCost;
        if (tentativeG < (gScores.get(neighborId) ?? Infinity)) {
          gScores.set(neighborId, tentativeG);
          cameFrom.set(neighborId, { prev: currentId, edge });
          const h = this.heuristic(neighborId, endNodeId);
          openSet.push({ id: neighborId, fScore: tentativeG + h, gScore: tentativeG });
        }
      }
    }

    return null;
  }

  private reconstructPath(
    startId: string,
    endId: string,
    cameFrom: Map<string, { prev: string; edge: CampusEdge }>
  ): RouteResult {
    let curr = endId;
    const pathNodes: CampusNode[] = [];
    const pathEdges: CampusEdge[] = [];
    let totalDist = 0;
    let stairsCount = 0;
    let elevatorUsed = false;
    const floorsSet = new Set<number>();
    let turnCount = 0;

    while (cameFrom.has(curr)) {
      const { prev, edge } = cameFrom.get(curr)!;
      const node = this.nodes.get(curr)!;
      pathNodes.push(node);
      pathEdges.push(edge);
      totalDist += edge.distance;
      if (edge.stairs) stairsCount += 1;
      if (edge.elevator) elevatorUsed = true;
      floorsSet.add(node.floor);
      if (edge.turn_complexity > 0) turnCount += 1;
      curr = prev;
    }

    const startNode = this.nodes.get(startId)!;
    pathNodes.push(startNode);
    floorsSet.add(startNode.floor);

    pathNodes.reverse();
    pathEdges.reverse();

    const etaSeconds = Math.round(totalDist / 1.2 + stairsCount * 15 + (elevatorUsed ? 25 : 0));
    const instructions = this.generateInstructions(pathNodes, pathEdges);

    return {
      route_node_ids: pathNodes.map(n => n.id),
      nodes: pathNodes,
      edges: pathEdges,
      distance: Math.round(totalDist * 10) / 10,
      eta_seconds: etaSeconds,
      floors: Array.from(floorsSet).sort((a, b) => a - b),
      stairs_count: stairsCount,
      elevator_used: elevatorUsed,
      turn_count: turnCount,
      instructions
    };
  }

  private generateInstructions(nodes: CampusNode[], edges: CampusEdge[]): NavigationInstruction[] {
    const steps: NavigationInstruction[] = [];
    if (nodes.length < 2) {
      return [{ step: 1, text: 'Arrive at destination.', type: 'arrive', floor: nodes[0].floor }];
    }

    let stepIdx = 1;
    steps.push({
      step: stepIdx++,
      text: `Start at ${nodes[0].name}`,
      type: 'start',
      floor: nodes[0].floor,
      node_id: nodes[0].id
    });

    let currDist = 0;
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const u = nodes[i];
      const v = nodes[i + 1];
      currDist += edge.distance;

      if (u.floor !== v.floor) {
        if (edge.elevator) {
          steps.push({
            step: stepIdx++,
            text: `Take West Elevator from Floor ${u.floor} to Floor ${v.floor}`,
            type: 'elevator',
            floor: v.floor,
            node_id: v.id
          });
        } else {
          let stairName = 'Staircase';
          if (u.id.includes('STAIR_A')) stairName = 'Staircase A (North-West)';
          else if (u.id.includes('STAIR_B')) stairName = 'Staircase B (East Central)';
          else if (u.id.includes('STAIR_C')) stairName = 'Staircase C (South Central)';
          else if (u.id.includes('STAIR_D')) stairName = 'Staircase D (South Wing)';
          else if (u.id.includes('STAIR_LIB')) stairName = 'Library Spiral Staircase';

          steps.push({
            step: stepIdx++,
            text: `Take ${stairName} up to Floor ${v.floor}`,
            type: 'stairs',
            floor: v.floor,
            node_id: v.id
          });
        }
        currDist = 0;
        continue;
      }

      const isDest = i === edges.length - 1;
      const isTurn = edge.turn_complexity > 0;

      if (isDest) {
        steps.push({
          step: stepIdx++,
          text: `Arrive at ${v.name}`,
          type: 'arrive',
          floor: v.floor,
          node_id: v.id
        });
      } else if (isTurn && currDist >= 15) {
        steps.push({
          step: stepIdx++,
          text: `Continue past ${u.name} · ${Math.round(currDist)} m`,
          type: 'turn',
          floor: v.floor,
          node_id: v.id
        });
        currDist = 0;
      }
    }

    return steps;
  }
}
