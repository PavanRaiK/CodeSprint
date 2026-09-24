import React, { useState, useRef, useEffect } from 'react';
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
  MapPin,
  AlertTriangle,
  MoveVertical,
  Layers,
  Accessibility,
  Footprints
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
  onSelectLocation: (location: CampusLocation) => void;
  onSelectNodeAsStart?: (node: CampusNode) => void;
}

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
  onSelectLocation,
  onSelectNodeAsStart
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [blueprintOpacity, setBlueprintOpacity] = useState(0.85);
  const [hoveredLocation, setHoveredLocation] = useState<CampusLocation | null>(null);

  // Filter nodes & locations for the active floor
  const floorNodes = nodes.filter(n => n.floor === currentFloor.floor);
  const floorLocations = locations.filter(l => l.floor === currentFloor.floor);

  // Get active issues for this floor
  const floorIssues = activeIssues.filter(
    i => i.status === 'active' && (i.floor === currentFloor.floor || i.floor === -1)
  );
  const blockedNodeIds = new Set<string>();
  floorIssues.forEach(i => i.node_ids.forEach(n => blockedNodeIds.add(n)));

  // Generate SVG path for the active route on this floor
  const getRouteSegmentsForFloor = () => {
    if (!activeRoute || !activeRoute.nodes || activeRoute.nodes.length < 2) return [];

    const segments: Array<{ from: CampusNode; to: CampusNode; isFloorTransition: boolean; elev: boolean }> = [];
    for (let i = 0; i < activeRoute.nodes.length - 1; i++) {
      const u = activeRoute.nodes[i];
      const v = activeRoute.nodes[i + 1];

      // Segment is on this floor if both are on this floor, or if one is on this floor transitioning
      if (u.floor === currentFloor.floor && v.floor === currentFloor.floor) {
        segments.push({ from: u, to: v, isFloorTransition: false, elev: false });
      } else if (u.floor === currentFloor.floor && v.floor !== currentFloor.floor) {
        // Floor transition from this floor
        segments.push({ from: u, to: v, isFloorTransition: true, elev: u.type === 'elevator' });
      } else if (u.floor !== currentFloor.floor && v.floor === currentFloor.floor) {
        // Floor transition arriving onto this floor
        segments.push({ from: u, to: v, isFloorTransition: true, elev: v.type === 'elevator' });
      }
    }
    return segments;
  };

  const routeSegments = getRouteSegmentsForFloor();

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.6), 4.5));
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
    if (destinationLocation && destinationLocation.floor === currentFloor.floor) {
      // Recenter on destination
      setPan({ x: 500 - destinationLocation.x, y: 600 - destinationLocation.y });
      setZoom(1.5);
    } else if (startNode && startNode.floor === currentFloor.floor) {
      setPan({ x: 500 - startNode.x, y: 600 - startNode.y });
      setZoom(1.5);
    } else {
      handleResetView();
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
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
        className="relative w-[1000px] h-[1200px] shrink-0"
      >
        {/* Architectural Blueprint Image Layer */}
        <img
          src={currentFloor.bg_image}
          alt={currentFloor.name}
          style={{ opacity: blueprintOpacity }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none filter brightness-95 contrast-105"
        />

        {/* SVG Interactive Overlay Layer */}
        <svg
          viewBox="0 0 1000 1200"
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
          </defs>

          {/* 1. Base Corridor Graph Network Lines (Subtle reference lines) */}
          <g className="corridor-lines opacity-25">
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
                    stroke="#333943"
                    strokeWidth="3"
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

          {/* 3. ACTIVE ROUTE OVERLAY (The Navigation Hero!) */}
          {routeSegments.length > 0 && (
            <g className="active-route-group">
              {/* Outer Glow Halo */}
              {routeSegments.map((seg, idx) => (
                <line
                  key={`halo-${idx}`}
                  x1={seg.from.x}
                  y1={seg.from.y}
                  x2={seg.to.x}
                  y2={seg.to.y}
                  stroke="rgba(0, 122, 252, 0.45)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  filter="url(#routeGlow)"
                />
              ))}

              {/* Main Signal Blue Solid Track */}
              {routeSegments.map((seg, idx) => (
                <line
                  key={`track-${idx}`}
                  x1={seg.from.x}
                  y1={seg.from.y}
                  x2={seg.to.x}
                  y2={seg.to.y}
                  stroke="#007afc"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              ))}

              {/* Animated Marching Dashed Line */}
              {routeSegments.map((seg, idx) => (
                <line
                  key={`anim-${idx}`}
                  x1={seg.from.x}
                  y1={seg.from.y}
                  x2={seg.to.x}
                  y2={seg.to.y}
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="route-animated"
                />
              ))}
            </g>
          )}

          {/* 4. Floor Transitions (Stairs & Elevator landing markers on this floor) */}
          {floorNodes
            .filter(n => n.type === 'staircase' || n.type === 'elevator')
            .map(n => {
              const isStair = n.type === 'staircase';
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

                  {/* Label for staircase / lift */}
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
                  r={isDestination ? 18 : 10}
                  fill={isDestination ? '#007afc' : isHovered ? '#007afc' : 'rgba(21, 23, 27, 0.7)'}
                  stroke={isDestination ? '#ffffff' : isHovered ? '#007afc' : '#333943'}
                  strokeWidth={isDestination ? 3 : 1.5}
                  className="transition duration-150"
                />

                {/* If selected as Destination: show prominent PIN */}
                {isDestination && (
                  <g>
                    <circle r="26" fill="rgba(0, 122, 252, 0.3)" className="animate-ping" />
                    <circle r="6" fill="#ffffff" />
                  </g>
                )}

                {/* Compact Label */}
                {(isDestination || isHovered || isHighlighted || loc.id === 'R214') && (
                  <g transform="translate(0, -22)" className="pointer-events-none">
                    <rect
                      x="-60"
                      y="-12"
                      width="120"
                      height="22"
                      rx="6"
                      fill="#0e1012"
                      stroke={isDestination ? '#007afc' : '#333943'}
                      strokeWidth="1.5"
                      className="shadow-xl"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {loc.name.length > 18 ? loc.name.slice(0, 18) + '...' : loc.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 6. Current Start Position Beacon */}
          {startNode && startNode.floor === currentFloor.floor && (
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

          {/* 7. Destination Pin Marker */}
          {destinationLocation && destinationLocation.floor === currentFloor.floor && (
            <g transform={`translate(${destinationLocation.x}, ${destinationLocation.y})`}>
              <circle r="8" fill="#228a56" stroke="#ffffff" strokeWidth="2.5" />
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
          title="Recenter on active route / location"
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
          onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.6))}
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
        <span className="text-[11px] text-ash font-medium">Blueprint:</span>
        <button
          onClick={() => setBlueprintOpacity(prev => (prev >= 0.8 ? 0.35 : 0.85))}
          className="text-signal hover:underline text-xs font-semibold"
        >
          {blueprintOpacity >= 0.8 ? 'Solid' : 'Blueprint Faint'}
        </button>
      </div>

      {/* Active Floor Badge Floating at Top-Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-charcoal/90 backdrop-blur-md px-4 py-1.5 rounded-pill border border-gunmetal shadow-xl flex items-center space-x-2 text-xs font-semibold z-20">
        <span className="w-2 h-2 rounded-full bg-signal"></span>
        <span className="text-white">{currentFloor.name}</span>
        {destinationLocation && destinationLocation.floor !== currentFloor.floor && (
          <span className="text-[10px] text-fog border-l border-gunmetal pl-2">
            Dest on Floor {destinationLocation.floor}
          </span>
        )}
      </div>
    </div>
  );
};
