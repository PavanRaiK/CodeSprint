import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Floor,
  CampusLocation,
  CampusNode,
  CampusEdge,
  RouteResult,
  IssueReport
} from '../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Compass,
  Footprints,
  MoveVertical
} from 'lucide-react';

interface InteractiveMapProps {
  currentFloor: Floor;
  floors: Floor[];
  nodes: CampusNode[];
  edges: CampusEdge[];
  locations: CampusLocation[];
  activeRoute: RouteResult | null;
  startNode: CampusNode | null;
  destinationLocation: CampusLocation | null;
  activeIssues: IssueReport[];
  highlightedNodeId: string | null;
  isNavigating?: boolean;
  activeStepIndex?: number;
  isSimulating?: boolean;
  simSpeed?: number;
  onSelectLocation: (location: CampusLocation) => void;
  onSelectNodeAsStart?: (node: CampusNode) => void;
  onFloorChange?: (floor: number) => void;
  onStepIndexChange?: (stepIndex: number) => void;
  onSimulationComplete?: () => void;
}

interface WalkerState {
  x: number;
  y: number;
  angle: number;
  floor: number;
  segmentIndex: number;
  progress: number; // 0 to 1
  isTransitioning: boolean;
  transitionRemainingMs: number;
  transitionMessage: string;
}

const calcAngle = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI) + 90;
};

const lerpAngle = (current: number, target: number, t: number): number => {
  let diff = (target - current) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return current + diff * t;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  currentFloor,
  floors,
  nodes,
  edges,
  locations,
  activeRoute,
  startNode,
  destinationLocation,
  activeIssues,
  highlightedNodeId,
  isNavigating = false,
  activeStepIndex = 0,
  isSimulating = false,
  simSpeed = 1,
  onSelectLocation,
  onSelectNodeAsStart,
  onFloorChange,
  onStepIndexChange,
  onSimulationComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [blueprintOpacity, setBlueprintOpacity] = useState(0.92);
  const [hoveredLocation, setHoveredLocation] = useState<CampusLocation | null>(null);

  const mapWidth = currentFloor.width || 1000;
  const mapHeight = currentFloor.height || 1200;
  const isCampus = currentFloor.floor === -1;

  // Filter nodes & locations for the active floor
  const floorNodes = nodes.filter(n => n.floor === currentFloor.floor);
  const floorLocations = locations.filter(l => l.floor === currentFloor.floor);

  // Active step node resolution for Live Navigation (fallback if not simulating)
  const currentInstruction = activeRoute?.instructions[activeStepIndex];
  const activeNavNode = isNavigating && activeRoute
    ? (currentInstruction?.node_id ? nodes.find(n => n.id === currentInstruction.node_id) : (startNode || activeRoute.nodes[0]))
    : null;

  // Walker state for continuous walking animation
  const [walker, setWalker] = useState<WalkerState | null>(null);
  const walkerRef = useRef<WalkerState | null>(null);
  walkerRef.current = walker;

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Base speed in pixels per second.
  // Calibrated so a typical 70-80px corridor takes ~2.2s at 1x, or 4.4s at 0.5x.
  const BASE_WALK_SPEED_PX = 36;

  // Initialize or reset walker when activeRoute or isNavigating changes
  useEffect(() => {
    if (isNavigating && activeRoute && activeRoute.nodes && activeRoute.nodes.length > 0) {
      const firstNode = activeRoute.nodes[0];
      const secondNode = activeRoute.nodes[1];
      const initialAngle = secondNode ? calcAngle(firstNode.x, firstNode.y, secondNode.x, secondNode.y) : 0;

      const initialWalker: WalkerState = {
        x: firstNode.x,
        y: firstNode.y,
        angle: initialAngle,
        floor: firstNode.floor,
        segmentIndex: 0,
        progress: 0,
        isTransitioning: false,
        transitionRemainingMs: 0,
        transitionMessage: ''
      };
      setWalker(initialWalker);
      walkerRef.current = initialWalker;
    } else {
      setWalker(null);
      walkerRef.current = null;
    }
  }, [isNavigating, activeRoute]);

  // Main 60 FPS Animation Loop for Smooth Walking
  useEffect(() => {
    if (!isNavigating || !isSimulating || !activeRoute || !activeRoute.nodes || activeRoute.nodes.length < 2) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const routeNodes = activeRoute.nodes;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      // Clamp dt to avoid big jumps if tab is throttled
      const dt = Math.min(rawDt, 0.08);

      const currentWalker = walkerRef.current;
      if (!currentWalker) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check if we already reached destination
      if (currentWalker.segmentIndex >= routeNodes.length - 1) {
        if (onSimulationComplete) onSimulationComplete();
        return;
      }

      // 1. Handle Floor Transition Pause (Elevator / Stairs)
      if (currentWalker.isTransitioning) {
        const remaining = currentWalker.transitionRemainingMs - dt * 1000;
        if (remaining <= 0) {
          // Transition complete! Move walker to target floor landing node
          const nextSegmentIdx = currentWalker.segmentIndex + 1;
          const targetNode = routeNodes[nextSegmentIdx];
          const subsequentNode = routeNodes[nextSegmentIdx + 1];
          const targetAngle = subsequentNode
            ? calcAngle(targetNode.x, targetNode.y, subsequentNode.x, subsequentNode.y)
            : currentWalker.angle;

          const updated: WalkerState = {
            ...currentWalker,
            x: targetNode.x,
            y: targetNode.y,
            floor: targetNode.floor,
            angle: targetAngle,
            segmentIndex: nextSegmentIdx,
            progress: 0,
            isTransitioning: false,
            transitionRemainingMs: 0,
            transitionMessage: ''
          };

          walkerRef.current = updated;
          setWalker(updated);

          // Automatically switch the visual floor in App
          if (onFloorChange) {
            onFloorChange(targetNode.floor);
          }
        } else {
          const updated: WalkerState = {
            ...currentWalker,
            transitionRemainingMs: remaining
          };
          walkerRef.current = updated;
          setWalker(updated);
        }
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // 2. Normal Walking Along Current Segment
      const fromNode = routeNodes[currentWalker.segmentIndex];
      const toNode = routeNodes[currentWalker.segmentIndex + 1];

      if (!toNode) {
        if (onSimulationComplete) onSimulationComplete();
        return;
      }

      // Check if this segment represents a floor transition
      if (fromNode.floor !== toNode.floor) {
        // Start floor transition sequence
        const isUp = toNode.floor > fromNode.floor;
        const targetFloorName = toNode.floor === -1 ? 'Campus' : toNode.floor === 0 ? 'Ground Floor' : `Floor ${toNode.floor}`;
        const modeName = fromNode.type === 'elevator' ? 'West Elevator' : 'Staircase';
        const msg = `${isUp ? 'Ascending' : 'Descending'} to ${targetFloorName} via ${modeName}`;

        const transitioningWalker: WalkerState = {
          ...currentWalker,
          x: fromNode.x,
          y: fromNode.y,
          floor: fromNode.floor,
          isTransitioning: true,
          transitionRemainingMs: 2000,
          transitionMessage: msg
        };

        walkerRef.current = transitioningWalker;
        setWalker(transitioningWalker);
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Same floor segment: calculate distance and step progress
      const segmentDist = Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y);
      const speed = BASE_WALK_SPEED_PX * simSpeed;

      if (segmentDist <= 1) {
        // Negligible distance: advance immediately
        const nextSegment = currentWalker.segmentIndex + 1;
        const updated: WalkerState = {
          ...currentWalker,
          x: toNode.x,
          y: toNode.y,
          segmentIndex: nextSegment,
          progress: 0
        };
        walkerRef.current = updated;
        setWalker(updated);
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaProgress = (speed * dt) / segmentDist;
      const nextProgress = currentWalker.progress + deltaProgress;

      // Calculate target direction angle and smoothly interpolate
      const targetAngle = calcAngle(fromNode.x, fromNode.y, toNode.x, toNode.y);
      const smoothAngle = lerpAngle(currentWalker.angle, targetAngle, Math.min(1, 9 * dt));

      if (nextProgress < 1.0) {
        const curX = fromNode.x + (toNode.x - fromNode.x) * nextProgress;
        const curY = fromNode.y + (toNode.y - fromNode.y) * nextProgress;

        const updated: WalkerState = {
          ...currentWalker,
          x: curX,
          y: curY,
          angle: smoothAngle,
          progress: nextProgress
        };
        walkerRef.current = updated;
        setWalker(updated);

        // Smooth camera auto-follow while simulating (offsetting Y downward so walker is clear of top HUD)
        if (!isDragging && containerRef.current && currentWalker.floor === currentFloor.floor) {
          const containerW = containerRef.current.clientWidth;
          const containerH = containerRef.current.clientHeight;
          const targetPanX = containerW / 2 - curX;
          const targetPanY = (containerH / 2 + 85) - curY;
          setPan(prev => ({
            x: prev.x + (targetPanX - prev.x) * 0.08,
            y: prev.y + (targetPanY - prev.y) * 0.08
          }));
        }
      } else {
        // Segment finished: arrive at toNode
        const nextSegment = currentWalker.segmentIndex + 1;

        // Check if instruction step should advance
        if (activeRoute.instructions) {
          // Find matching instruction
          const matchingIdx = activeRoute.instructions.findIndex(
            (inst, idx) => inst.node_id === toNode.id || (idx > 0 && activeRoute.instructions[idx - 1]?.node_id === fromNode.id)
          );
          if (matchingIdx !== -1 && matchingIdx !== activeStepIndex && onStepIndexChange) {
            onStepIndexChange(matchingIdx);
          }
        }

        if (nextSegment >= routeNodes.length - 1) {
          // Destination reached!
          const finishedWalker: WalkerState = {
            ...currentWalker,
            x: toNode.x,
            y: toNode.y,
            segmentIndex: nextSegment,
            progress: 1,
            angle: smoothAngle
          };
          walkerRef.current = finishedWalker;
          setWalker(finishedWalker);
          if (onSimulationComplete) onSimulationComplete();
          return;
        }

        const nextSubsequentNode = routeNodes[nextSegment + 1];
        const nextTargetAngle = nextSubsequentNode
          ? calcAngle(toNode.x, toNode.y, nextSubsequentNode.x, nextSubsequentNode.y)
          : smoothAngle;

        const updated: WalkerState = {
          ...currentWalker,
          x: toNode.x,
          y: toNode.y,
          segmentIndex: nextSegment,
          progress: 0,
          angle: nextTargetAngle
        };
        walkerRef.current = updated;
        setWalker(updated);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isNavigating, isSimulating, activeRoute, simSpeed, activeStepIndex, currentFloor.floor, isDragging, onFloorChange, onStepIndexChange, onSimulationComplete]);

  // Center camera when starting navigation
  useEffect(() => {
    if (isNavigating && activeNavNode && activeNavNode.floor === currentFloor.floor && containerRef.current && !isSimulating) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      setPan({
        x: containerW / 2 - activeNavNode.x,
        y: (containerH / 2 + 85) - activeNavNode.y
      });
      setZoom(1.35);
    }
  }, [isNavigating, activeNavNode?.id, currentFloor.floor, isSimulating]);

  // Active hazards
  const floorIssues = activeIssues.filter(
    i => i.status === 'active' && (i.floor === currentFloor.floor || i.floor === -1)
  );
  const blockedNodeIds = new Set<string>();
  floorIssues.forEach(i => i.node_ids.forEach(n => blockedNodeIds.add(n)));

  // Route Segments partitioning for this floor
  const getRouteSegmentsForFloor = () => {
    if (!activeRoute || !activeRoute.nodes || activeRoute.nodes.length < 2) return [];

    const segments: Array<{
      idx: number;
      from: CampusNode;
      to: CampusNode;
      status: 'visited' | 'active' | 'upcoming';
      isFloorTransition: boolean;
      elev: boolean;
    }> = [];

    const currentSegmentIdx = walker ? walker.segmentIndex : activeStepIndex;

    for (let i = 0; i < activeRoute.nodes.length - 1; i++) {
      const u = activeRoute.nodes[i];
      const v = activeRoute.nodes[i + 1];

      let status: 'visited' | 'active' | 'upcoming' = 'upcoming';
      if (isNavigating) {
        if (i < currentSegmentIdx) status = 'visited';
        else if (i === currentSegmentIdx) status = 'active';
        else status = 'upcoming';
      }

      if (u.floor === currentFloor.floor && v.floor === currentFloor.floor) {
        segments.push({ idx: i, from: u, to: v, status, isFloorTransition: false, elev: false });
      } else if (u.floor === currentFloor.floor && v.floor !== currentFloor.floor) {
        segments.push({ idx: i, from: u, to: v, status, isFloorTransition: true, elev: u.type === 'elevator' });
      } else if (u.floor !== currentFloor.floor && v.floor === currentFloor.floor) {
        segments.push({ idx: i, from: u, to: v, status, isFloorTransition: true, elev: v.type === 'elevator' });
      }
    }
    return segments;
  };

  const routeSegments = getRouteSegmentsForFloor();

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 4.5));
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleRecenter = () => {
    const containerW = containerRef.current?.clientWidth || 800;
    const containerH = containerRef.current?.clientHeight || 800;
    const offsetY = isNavigating ? 85 : 0;

    if (walker && walker.floor === currentFloor.floor) {
      setPan({ x: containerW / 2 - walker.x, y: (containerH / 2 + offsetY) - walker.y });
      setZoom(1.35);
    } else if (isNavigating && activeNavNode && activeNavNode.floor === currentFloor.floor) {
      setPan({ x: containerW / 2 - activeNavNode.x, y: (containerH / 2 + offsetY) - activeNavNode.y });
      setZoom(1.35);
    } else if (destinationLocation && destinationLocation.floor === currentFloor.floor) {
      setPan({ x: containerW / 2 - destinationLocation.x, y: (containerH / 2 + offsetY) - destinationLocation.y });
      setZoom(1.4);
    } else if (startNode && startNode.floor === currentFloor.floor) {
      setPan({ x: containerW / 2 - startNode.x, y: (containerH / 2 + offsetY) - startNode.y });
      setZoom(1.4);
    } else {
      handleResetView();
    }
  };

  // Helper for campus markers styling and names
  const getCampusMarkerConfig = (locId: string) => {
    switch (locId) {
      case 'LOC_C_CRICKET_GROUND':
      case 'LOC_C_CRICKET_PITCH':
      case 'LOC_C_SOUHARDHA_GROUND':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
      case 'LOC_C_FOOD_COURT':
        return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' };
      case 'LOC_C_GUEST_HOUSE':
        return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)' };
      case 'LOC_C_BOYS_HOSTEL':
        return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' };
      case 'LOC_C_PARKING':
        return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)' };
      case 'LOC_C_PETROL_BUNK':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
      case 'LOC_C_SECURITY_GATE':
        return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)' };
      case 'LOC_C_EVENT_LAWN':
        return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.2)' };
      case 'LOC_C_MAIN_BLOCK':
        return { color: '#007afc', bg: 'rgba(0, 122, 252, 0.25)' };
      case 'LOC_C_MECH_CIVIL':
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' };
      case 'LOC_C_TEL_OFFICE':
        return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
      case 'LOC_C_YS_ADMIN':
        return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.2)' };
      default:
        return { color: '#007afc', bg: 'rgba(0, 122, 252, 0.2)' };
    }
  };

  const getCampusDisplayName = (loc: CampusLocation): string => {
    switch (loc.id) {
      case 'LOC_C_MAIN_BLOCK': return 'Main Academic Block';
      case 'LOC_C_MECH_CIVIL': return 'Mech & Civil Block';
      case 'LOC_C_FOOD_COURT': return 'Food Court';
      case 'LOC_C_TEL_OFFICE': return 'Hostel & Tel Office';
      case 'LOC_C_GUEST_HOUSE': return 'Heritage Guest House';
      case 'LOC_C_BOYS_HOSTEL': return 'Boys Hostel';
      case 'LOC_C_CRICKET_GROUND': return 'Cricket Ground';
      case 'LOC_C_CRICKET_PITCH': return 'Cricket Pitch';
      case 'LOC_C_SOUHARDHA_GROUND': return 'Souhardha Ground';
      case 'LOC_C_PARKING': return 'College Parking';
      case 'LOC_C_PETROL_BUNK': return 'HP Petrol Pump';
      case 'LOC_C_SECURITY_GATE': return 'Main Gate & Post Office';
      case 'LOC_C_EVENT_LAWN': return 'Open Lawn';
      case 'LOC_C_YS_ADMIN': return 'Admin Annex';
      default: return loc.name.split('(')[0].trim();
    }
  };

  const getCampusLabelOffset = (locId: string): { x: number; y: number } => {
    switch (locId) {
      case 'LOC_C_MECH_CIVIL': return { x: 0, y: 28 };
      case 'LOC_C_FOOD_COURT': return { x: -35, y: -26 };
      case 'LOC_C_TEL_OFFICE': return { x: 45, y: -26 };
      case 'LOC_C_CRICKET_GROUND': return { x: 0, y: 28 };
      case 'LOC_C_CRICKET_PITCH': return { x: 0, y: -26 };
      case 'LOC_C_PARKING': return { x: 45, y: -26 };
      case 'LOC_C_YS_ADMIN': return { x: 40, y: 26 };
      case 'LOC_C_EVENT_LAWN': return { x: -30, y: 26 };
      default: return { x: 0, y: -26 };
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-full overflow-hidden bg-void map-canvas-grab select-none flex items-center justify-center"
    >
      {/* Blueprint & SVG Workspace transformed by pan & zoom */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.12s ease-out',
          width: `${mapWidth}px`,
          height: `${mapHeight}px`
        }}
        className="relative shrink-0"
      >
        {/* Architectural Blueprint or Campus Aerial Image Layer */}
        <img
          src={currentFloor.bg_image}
          alt={currentFloor.name}
          style={{ opacity: blueprintOpacity }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none filter brightness-95 contrast-105"
        />

        {/* SVG Interactive Overlay Layer */}
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto"
        >
          <defs>
            {/* Signal Blue Glow Filter */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Blocked Danger Glow Filter */}
            <filter id="dangerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Moving Arrow Heading Cone Beam */}
            <radialGradient id="walkerHeadingBeam" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#007afc" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Base Corridor Graph Network Lines */}
          <g className={`corridor-lines ${isCampus ? 'opacity-35' : 'opacity-25'}`}>
            {edges
              .filter(e => {
                const u = nodes.find(n => n.id === e.from);
                const v = nodes.find(n => n.id === e.to);
                return u && v && u.floor === currentFloor.floor && v.floor === currentFloor.floor;
              })
              .map(e => {
                const u = nodes.find(n => n.id === e.from)!;
                const v = nodes.find(n => n.id === e.to)!;
                return (
                  <line
                    key={e.id}
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke={isCampus ? '#4b5563' : '#333943'}
                    strokeWidth={isCampus ? '4' : '3'}
                    strokeDasharray={isCampus ? '6,6' : 'none'}
                    strokeLinecap="round"
                  />
                );
              })}
          </g>

          {/* 2. Blocked / Closed Hazards Visualization */}
          {floorNodes
            .filter(n => blockedNodeIds.has(n.id))
            .map(n => (
              <g key={`blocked-${n.id}`} transform={`translate(${n.x}, ${n.y})`}>
                <circle r="22" fill="rgba(255, 92, 92, 0.25)" className="animate-ping" />
                <circle r="16" fill="#ff5c5c" filter="url(#dangerGlow)" />
                <rect x="-14" y="20" width="60" height="18" rx="4" fill="#15171b" stroke="#ff5c5c" strokeWidth="1" />
                <text x="16" y="32" textAnchor="middle" fill="#ff5c5c" fontSize="10" fontWeight="bold">
                  CLOSED
                </text>
                <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ))}

          {/* 3. ACTIVE ROUTE OVERLAY (Visited vs Dynamic Active vs Upcoming) */}
          {routeSegments.length > 0 && (
            <g className="active-route-group">
              {/* 3a. Visited Segments (Subdued steel gray behind walker) */}
              {routeSegments
                .filter(seg => seg.status === 'visited')
                .map((seg, idx) => (
                  <line
                    key={`visited-${idx}`}
                    x1={seg.from.x}
                    y1={seg.from.y}
                    x2={seg.to.x}
                    y2={seg.to.y}
                    stroke="#4b5563"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-60"
                  />
                ))}

              {/* 3b. Upcoming Segments (Glow halo + Signal blue + animated dashes) */}
              {routeSegments
                .filter(seg => seg.status === 'upcoming')
                .map((seg, idx) => (
                  <g key={`upcoming-${idx}`}>
                    <line
                      x1={seg.from.x}
                      y1={seg.from.y}
                      x2={seg.to.x}
                      y2={seg.to.y}
                      stroke="rgba(0, 122, 252, 0.45)"
                      strokeWidth="15"
                      strokeLinecap="round"
                      filter="url(#routeGlow)"
                    />
                    <line
                      x1={seg.from.x}
                      y1={seg.from.y}
                      x2={seg.to.x}
                      y2={seg.to.y}
                      stroke="#007afc"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <line
                      x1={seg.from.x}
                      y1={seg.from.y}
                      x2={seg.to.x}
                      y2={seg.to.y}
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="route-animated"
                    />
                  </g>
                ))}

              {/* 3c. Current Active Segment (Split at walker position if on this floor) */}
              {routeSegments
                .filter(seg => seg.status === 'active')
                .map((seg, idx) => {
                  const isCurrentFloorWalker = walker && walker.floor === currentFloor.floor;
                  const splitX = isCurrentFloorWalker ? walker.x : seg.from.x;
                  const splitY = isCurrentFloorWalker ? walker.y : seg.from.y;

                  return (
                    <g key={`active-seg-${idx}`}>
                      {/* Traversed portion of current segment */}
                      <line
                        x1={seg.from.x}
                        y1={seg.from.y}
                        x2={splitX}
                        y2={splitY}
                        stroke="#4b5563"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="opacity-60"
                      />
                      {/* Remaining portion ahead of walker */}
                      <line
                        x1={splitX}
                        y1={splitY}
                        x2={seg.to.x}
                        y2={seg.to.y}
                        stroke="rgba(0, 122, 252, 0.5)"
                        strokeWidth="15"
                        strokeLinecap="round"
                        filter="url(#routeGlow)"
                      />
                      <line
                        x1={splitX}
                        y1={splitY}
                        x2={seg.to.x}
                        y2={seg.to.y}
                        stroke="#007afc"
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                      <line
                        x1={splitX}
                        y1={splitY}
                        x2={seg.to.x}
                        y2={seg.to.y}
                        stroke="#ffffff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="route-animated"
                      />
                    </g>
                  );
                })}
            </g>
          )}

          {/* 4. Floor Transitions (Stairs & Elevator landing markers on this floor) */}
          {!isCampus &&
            floorNodes
              .filter(n => n.type === 'staircase' || n.type === 'elevator')
              .map(n => {
                const isElev = n.type === 'elevator';
                const isInRoute = activeRoute?.route_node_ids.includes(n.id);
                const isBlocked = blockedNodeIds.has(n.id);

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => onSelectNodeAsStart && onSelectNodeAsStart(n)}
                  >
                    <circle
                      r="12"
                      fill={isBlocked ? '#ff5c5c' : isInRoute ? '#007afc' : '#1c1f24'}
                      stroke={isInRoute ? '#ffffff' : '#444d5a'}
                      strokeWidth="2"
                      className={isInRoute ? 'drop-shadow-lg' : ''}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {isElev ? 'L' : 'S'}
                    </text>
                    <rect
                      x="16"
                      y="-10"
                      width={isElev ? 65 : 75}
                      height="18"
                      rx="4"
                      fill="#15171b"
                      stroke="#23262d"
                      strokeWidth="1"
                      className="opacity-90"
                    />
                    <text
                      x="20"
                      y="2"
                      fill="#a0aaba"
                      fontSize="9"
                      fontWeight="500"
                    >
                      {isElev ? 'West Lift' : n.name.split(' ')[0] + ' ' + (n.name.split(' ')[1] || '')}
                    </text>
                  </g>
                );
              })}

          {/* 5. Clickable Rooms & Landmarks */}
          {floorLocations.map(loc => {
            const isDestination = destinationLocation?.id === loc.id;
            const isHovered = hoveredLocation?.id === loc.id;
            const isHighlighted = highlightedNodeId === loc.node_id;
            const campusStyle = isCampus ? getCampusMarkerConfig(loc.id) : null;
            const labelOffset = isCampus ? getCampusLabelOffset(loc.id) : { x: 0, y: -22 };
            const displayName = isCampus
              ? getCampusDisplayName(loc)
              : (loc.name.length > 20 ? loc.name.slice(0, 18) + '...' : loc.name);

            return (
              <g
                key={loc.id}
                transform={`translate(${loc.x}, ${loc.y})`}
                onClick={() => onSelectLocation(loc)}
                onMouseEnter={() => setHoveredLocation(loc)}
                onMouseLeave={() => setHoveredLocation(null)}
                className="cursor-pointer group"
              >
                {/* Hit target circle */}
                <circle
                  r={isDestination ? (isCampus ? 20 : 18) : (isCampus ? 13 : 10)}
                  fill={isDestination ? '#007afc' : campusStyle ? campusStyle.color : isHovered ? '#007afc' : 'rgba(21, 23, 27, 0.75)'}
                  stroke={isDestination ? '#ffffff' : isHovered ? '#ffffff' : '#333943'}
                  strokeWidth={isDestination ? 3.5 : 2}
                  className="transition duration-150 shadow-xl"
                />

                {/* If selected as Destination: show prominent PIN */}
                {isDestination && (
                  <g>
                    <circle r={isCampus ? 30 : 26} fill="rgba(0, 122, 252, 0.35)" className="animate-ping" />
                    <circle r="6" fill="#ffffff" />
                  </g>
                )}

                {/* Prominent Badge / Label */}
                {(isDestination || isHovered || isHighlighted || isCampus || loc.id === 'R214') && (
                  <g transform={`translate(${labelOffset.x}, ${labelOffset.y})`} className="pointer-events-none">
                    <rect
                      x={-((displayName.length * 6.5) / 2 + 10)}
                      y="-11"
                      width={displayName.length * 6.5 + 20}
                      height="22"
                      rx="6"
                      fill="#0e1012"
                      stroke={isDestination ? '#007afc' : campusStyle ? campusStyle.color : '#333943'}
                      strokeWidth={isDestination ? '2' : '1.5'}
                      className="shadow-2xl opacity-95"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={isCampus ? '10.5' : '10'}
                      fontWeight="bold"
                    >
                      {displayName}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 6. Static Start Position Beacon (When NOT navigating) */}
          {!isNavigating && startNode && startNode.floor === currentFloor.floor && (
            <g transform={`translate(${startNode.x}, ${startNode.y})`}>
              <circle r="24" fill="rgba(0, 122, 252, 0.25)" className="beacon-wave" />
              <circle r="14" fill="#007afc" stroke="#ffffff" strokeWidth="3" filter="url(#routeGlow)" />
              <circle r="4" fill="#ffffff" />
              <g transform="translate(0, -20)" className="pointer-events-none">
                <rect x="-45" y="-12" width="90" height="20" rx="10" fill="#007afc" />
                <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  YOU ARE HERE
                </text>
              </g>
            </g>
          )}

          {/* 7. SLOW & SMOOTH ANIMATED MOVING ARROW (During Live Navigation) */}
          {isNavigating && walker && walker.floor === currentFloor.floor && (
            <g transform={`translate(${walker.x}, ${walker.y})`} className="z-50 pointer-events-none">
              {/* Pulsing radar waves */}
              <circle r="36" fill="rgba(0, 122, 252, 0.2)" className="animate-ping" />
              <circle r="24" fill="rgba(0, 122, 252, 0.3)" className="beacon-wave" />

              {/* Forward Heading Cone Beam pointing in the travel direction */}
              <g transform={`rotate(${walker.angle})`}>
                <path
                  d="M 0 0 L -35 -85 A 90 90 0 0 1 35 -85 Z"
                  fill="url(#walkerHeadingBeam)"
                />
              </g>

              {/* Navigation Puck Base */}
              <circle
                r="16"
                fill="#0d1117"
                stroke="#ffffff"
                strokeWidth="2.5"
                filter="url(#routeGlow)"
                className="shadow-2xl"
              />

              {/* Directional Navigation Chevron Arrow pointing towards destination */}
              <g transform={`rotate(${walker.angle})`}>
                {/* Outer prominent signal-blue chevron */}
                <polygon
                  points="0,-16 11,11 0,6 -11,11"
                  fill="#007afc"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {/* Inner bright highlight chevron */}
                <polygon
                  points="0,-12 7,8 0,4 -7,8"
                  fill="#60a5fa"
                />
                {/* Center pinpoint */}
                <circle cx="0" cy="5" r="2" fill="#ffffff" />
              </g>

              {/* Floating Live Simulation Badge */}
              <g transform="translate(0, -32)">
                <rect
                  x="-46"
                  y="-12"
                  width="92"
                  height="22"
                  rx="11"
                  fill={walker.isTransitioning ? '#f59e0b' : '#007afc'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="shadow-2xl"
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="bold"
                  letterSpacing="0.5"
                >
                  {walker.isTransitioning
                    ? 'TRANSITION'
                    : isSimulating
                    ? `WALKING · ${simSpeed}x`
                    : 'PAUSED'}
                </text>
              </g>

              {/* Floor Transition Banner if taking Elevator or Stairs */}
              {walker.isTransitioning && (
                <g transform="translate(0, -60)">
                  <rect
                    x="-105"
                    y="-14"
                    width="210"
                    height="26"
                    rx="8"
                    fill="#15171b"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    className="shadow-2xl"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    {walker.transitionMessage}
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 8. Destination Pin Marker */}
          {destinationLocation && destinationLocation.floor === currentFloor.floor && (
            <g transform={`translate(${destinationLocation.x}, ${destinationLocation.y})`}>
              <circle r="9" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
            </g>
          )}
        </svg>
      </div>

      {/* Floating Map Utility Controls */}
      <div className="absolute right-4 bottom-6 flex flex-col space-y-2 select-none z-20">
        {/* Recenter */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 rounded-pill bg-charcoal/90 hover:bg-graphite border border-gunmetal text-fog hover:text-white flex items-center justify-center shadow-xl transition"
          title="Recenter on moving arrow / active position"
        >
          <Navigation className="w-4 h-4 text-signal" />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.25, 4.5))}
          className="w-10 h-10 rounded-pill bg-charcoal/90 hover:bg-graphite border border-gunmetal text-fog hover:text-white flex items-center justify-center shadow-xl transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.5))}
          className="w-10 h-10 rounded-pill bg-charcoal/90 hover:bg-graphite border border-gunmetal text-fog hover:text-white flex items-center justify-center shadow-xl transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Reset View */}
        <button
          onClick={handleResetView}
          className="w-10 h-10 rounded-pill bg-charcoal/90 hover:bg-graphite border border-gunmetal text-fog hover:text-white flex items-center justify-center shadow-xl transition"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Blueprint Opacity Toggle Pill */}
      <div className="absolute left-4 bottom-6 flex items-center space-x-2 bg-charcoal/90 backdrop-blur-md px-3 py-1.5 rounded-pill border border-gunmetal shadow-xl text-xs z-20">
        <span className="text-[11px] text-ash font-medium">{isCampus ? 'Aerial Map:' : 'Blueprint:'}</span>
        <button
          onClick={() => setBlueprintOpacity(prev => (prev >= 0.8 ? 0.35 : 0.92))}
          className="text-signal hover:underline text-xs font-semibold"
        >
          {blueprintOpacity >= 0.8 ? 'Solid' : 'Faint'}
        </button>
      </div>

      {/* Active Floor Badge Floating at Top-Center (Hidden when LiveNavigationHUD is shown) */}
      {!isNavigating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-charcoal/90 backdrop-blur-md px-4 py-1.5 rounded-pill border border-gunmetal shadow-xl flex items-center space-x-2 text-xs font-semibold z-20">
          <span className="w-2 h-2 rounded-full bg-signal"></span>
          <span className="text-white">{currentFloor.name}</span>
          {destinationLocation && destinationLocation.floor !== currentFloor.floor && (
            <span className="text-[10px] text-fog border-l border-gunmetal pl-2">
              Dest on {destinationLocation.floor === -1 ? 'Campus Map' : destinationLocation.floor === 0 ? 'Ground Floor' : `Floor ${destinationLocation.floor}`}
            </span>
          )}
        </div>
      )}

      {/* Notice if walker is currently moving on a different floor */}
      {isNavigating && walker && walker.floor !== currentFloor.floor && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-charcoal/95 backdrop-blur-md px-4 py-2 rounded-pill border border-amber-500/50 shadow-2xl flex items-center space-x-3 text-xs z-30">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span className="text-fog">
            Arrow is currently walking on{' '}
            <strong className="text-white">
              {walker.floor === -1 ? 'Campus Grounds' : walker.floor === 0 ? 'Ground Floor' : `Floor ${walker.floor}`}
            </strong>
          </span>
          <button
            onClick={() => onFloorChange && onFloorChange(walker.floor)}
            className="px-2.5 py-1 rounded-pill bg-signal text-white font-semibold text-[11px] hover:bg-signal-hover transition"
          >
            Switch to Floor
          </button>
        </div>
      )}
    </div>
  );
};
