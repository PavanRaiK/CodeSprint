import {
  Floor,
  CampusLocation,
  CampusNode,
  CampusEdge,
  QRCheckpoint,
  IssueReport,
  RouteMode,
  RouteResponse,
  RouteResult
} from '../types';
import { OfflineRouter } from './offlineRouter';

// Import local static fallback data
import localFloors from '../data/floors.json';
import localLocations from '../data/locations.json';
import localNodes from '../data/nodes.json';
import localEdges from '../data/edges.json';
import localQr from '../data/qr_checkpoints.json';
import localIssues from '../data/issues.json';

const API_BASE = '/api';

// Initialize offline router instance with local static data
const offlineRouter = new OfflineRouter(
  localNodes as CampusNode[],
  localEdges as CampusEdge[]
);

let activeLocalIssues: IssueReport[] = [...(localIssues as IssueReport[])];

export const CampusAPI = {
  async getFloors(): Promise<Floor[]> {
    try {
      const res = await fetch(`${API_BASE}/floors`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, using local floors fallback', e);
    }
    return localFloors as Floor[];
  },

  async getLocations(floor?: number): Promise<CampusLocation[]> {
    try {
      const url = floor !== undefined ? `${API_BASE}/locations?floor=${floor}` : `${API_BASE}/locations`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, using local locations fallback', e);
    }
    const locs = localLocations as CampusLocation[];
    return floor !== undefined ? locs.filter(l => l.floor === floor) : locs;
  },

  async searchLocations(q: string): Promise<CampusLocation[]> {
    if (!q || !q.trim()) return [];
    try {
      const res = await fetch(`${API_BASE}/locations/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, using client fuzzy search fallback', e);
    }

    // Client-side fuzzy / alias search fallback
    const query = q.trim().toLowerCase();
    const locs = localLocations as CampusLocation[];
    const scored: Array<{ score: number; loc: CampusLocation }> = [];

    for (const loc of locs) {
      let score = 0;
      const name = loc.name.toLowerCase();
      const dept = (loc.department || '').toLowerCase();
      const aliases = loc.aliases.map(a => a.toLowerCase());

      if (loc.id.toLowerCase() === query) score += 100;
      else if (aliases.includes(query)) score += 90;
      else if (aliases.some(a => a.startsWith(query))) score += 80;
      else if (name.includes(query)) score += 70;
      else if (aliases.some(a => a.includes(query))) score += 60;
      else if (dept.includes(query)) score += 40;

      const digits = query.match(/\d+/g);
      if (digits) {
        for (const d of digits) {
          if (aliases.includes(d) || name.includes(d)) score += 50;
        }
      }

      if (score > 0) scored.push({ score, loc });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 20).map(s => s.loc);
  },

  async getNodes(floor?: number): Promise<CampusNode[]> {
    try {
      const url = floor !== undefined ? `${API_BASE}/nodes?floor=${floor}` : `${API_BASE}/nodes`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, using local nodes fallback', e);
    }
    const nds = localNodes as CampusNode[];
    return floor !== undefined ? nds.filter(n => n.floor === floor) : nds;
  },

  async getEdges(): Promise<CampusEdge[]> {
    try {
      const res = await fetch(`${API_BASE}/edges`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, using local edges fallback', e);
    }
    return localEdges as CampusEdge[];
  },

  async getRoute(
    startNodeId: string,
    destinationNodeId: string,
    mode: RouteMode = 'fastest'
  ): Promise<RouteResponse> {
    try {
      const res = await fetch(`${API_BASE}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_node: startNodeId,
          destination_node: destinationNodeId,
          mode
        })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, running local offline A* router fallback', e);
    }

    // Resolve location ID to node ID if needed
    let start = startNodeId;
    let dest = destinationNodeId;
    const locMap = new Map((localLocations as CampusLocation[]).map(l => [l.id, l]));
    if (locMap.has(start)) start = locMap.get(start)!.node_id;
    if (locMap.has(dest)) dest = locMap.get(dest)!.node_id;

    // Collect blocked elements from active issues
    const blockedNodes = new Set<string>();
    const blockedEdges = new Set<string>();
    for (const iss of activeLocalIssues) {
      if (iss.status === 'active') {
        iss.node_ids.forEach(n => blockedNodes.add(n));
        iss.edge_ids.forEach(e => blockedEdges.add(e));
      }
    }

    const route = offlineRouter.findRoute(start, dest, mode, blockedEdges, blockedNodes);
    if (!route) {
      throw new Error('No connected route is available between these locations.');
    }

    // Compute alternatives
    const alternatives: Record<string, any> = {};
    for (const m of ['fastest', 'accessible', 'easy'] as RouteMode[]) {
      if (m !== mode) {
        const alt = offlineRouter.findRoute(start, dest, m, blockedEdges, blockedNodes);
        if (alt) {
          alternatives[m] = {
            distance: alt.distance,
            eta_seconds: alt.eta_seconds,
            stairs_count: alt.stairs_count,
            elevator_used: alt.elevator_used,
            turn_count: alt.turn_count
          };
        }
      }
    }

    return {
      status: 'success',
      mode,
      route,
      alternatives,
      blocked_applied: {
        nodes: Array.from(blockedNodes),
        edges: Array.from(blockedEdges)
      }
    };
  },

  async getQRCheckpoints(): Promise<QRCheckpoint[]> {
    try {
      const res = await fetch(`${API_BASE}/qr/checkpoints`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, using local QR fallback', e);
    }
    return localQr as QRCheckpoint[];
  },

  async resolveQR(code: string): Promise<{ checkpoint: QRCheckpoint; floor: number; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/qr/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, resolving QR locally', e);
    }

    const qrs = localQr as QRCheckpoint[];
    const cleaned = code.trim();
    const matched = qrs.find(
      q => q.code === cleaned || q.id === cleaned || cleaned.includes(q.code)
    );
    if (!matched) {
      throw new Error(`Campus QR code '${code}' not recognized.`);
    }

    return {
      checkpoint: matched,
      floor: matched.floor,
      message: `Location updated: ${matched.name}`
    };
  },

  async getIssues(): Promise<IssueReport[]> {
    try {
      const res = await fetch(`${API_BASE}/issues`);
      if (res.ok) {
        const remote = await res.json();
        activeLocalIssues = remote;
        return remote;
      }
    } catch (e) {
      console.warn('API unreachable, using local issues', e);
    }
    return activeLocalIssues;
  },

  async reportIssue(issue: Omit<IssueReport, 'id' | 'reported_at' | 'status'>): Promise<IssueReport> {
    const newIssue: IssueReport = {
      ...issue,
      id: `ISSUE-${Date.now()}`,
      status: 'active',
      reported_at: new Date().toISOString()
    };
    try {
      const res = await fetch(`${API_BASE}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue)
      });
      if (res.ok) {
        const created = await res.json();
        activeLocalIssues.push(created);
        return created;
      }
    } catch (e) {
      console.warn('API unreachable, reporting issue locally', e);
    }
    activeLocalIssues.push(newIssue);
    return newIssue;
  },

  async toggleIssue(issueId: string, newStatus: 'active' | 'resolved'): Promise<void> {
    try {
      await fetch(`${API_BASE}/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.warn('API unreachable, toggling issue locally', e);
    }
    const target = activeLocalIssues.find(i => i.id === issueId);
    if (target) target.status = newStatus;
  },

  async detectSign(text: string): Promise<{ matched_location?: CampusLocation; message: string; confidence: number }> {
    try {
      const res = await fetch(`${API_BASE}/ocr/detect-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detected_text: text })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API unreachable, running local sign matching fallback', e);
    }

    const matches = await this.searchLocations(text);
    if (matches.length > 0) {
      return {
        matched_location: matches[0],
        message: `Detected: ${matches[0].name}`,
        confidence: 0.92
      };
    }
    return {
      message: `Could not identify a room sign for '${text}'.`,
      confidence: 0.0
    };
  }
};
