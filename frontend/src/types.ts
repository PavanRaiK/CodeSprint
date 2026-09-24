export type RouteMode = 'fastest' | 'accessible' | 'easy';

export interface Floor {
  floor: number;
  id: string;
  name: string;
  short_name: string;
  bg_image: string;
  elevation: number;
}

export interface CampusLocation {
  id: string;
  name: string;
  type: string;
  floor: number;
  node_id: string;
  x: number;
  y: number;
  department?: string;
  aliases: string[];
  accessible: boolean;
  description: string;
}

export interface CampusNode {
  id: string;
  name: string;
  type: 'room' | 'corridor' | 'intersection' | 'staircase' | 'elevator' | 'entrance' | 'landmark';
  floor: number;
  x: number;
  y: number;
  accessible: boolean;
}

export interface CampusEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  travel_time_estimate: number;
  stairs: boolean;
  elevator: boolean;
  accessible: boolean;
  difficulty: number;
  turn_complexity: number;
  active: boolean;
  notes?: string;
}

export interface NavigationInstruction {
  step: number;
  text: string;
  type: 'start' | 'turn' | 'stairs' | 'elevator' | 'arrive';
  floor: number;
  node_id?: string;
}

export interface RouteResult {
  route_node_ids: string[];
  nodes: CampusNode[];
  edges: CampusEdge[];
  distance: number;
  eta_seconds: number;
  floors: number[];
  stairs_count: number;
  elevator_used: boolean;
  turn_count: number;
  instructions: NavigationInstruction[];
}

export interface AlternativeModeSummary {
  distance: number;
  eta_seconds: number;
  stairs_count: number;
  elevator_used: boolean;
  turn_count: number;
}

export interface RouteResponse {
  status: string;
  mode: RouteMode;
  route: RouteResult;
  alternatives: Record<string, AlternativeModeSummary>;
  blocked_applied: {
    nodes: string[];
    edges: string[];
  };
}

export interface QRCheckpoint {
  id: string;
  code: string;
  name: string;
  floor: number;
  node_id: string;
  physical_location: string;
  sample_qr_data: string;
}

export interface IssueReport {
  id: string;
  title: string;
  type: string;
  node_ids: string[];
  edge_ids: string[];
  floor: number;
  status: 'active' | 'resolved';
  severity: 'low' | 'medium' | 'high';
  description?: string;
  reported_at: string;
}
