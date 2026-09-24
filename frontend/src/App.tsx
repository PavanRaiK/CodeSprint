import React, { useState, useEffect, useCallback } from 'react';
import {
  Floor,
  CampusLocation,
  CampusNode,
  CampusEdge,
  RouteResult,
  RouteMode,
  AlternativeModeSummary,
  IssueReport,
  QRCheckpoint
} from './types';
import { CampusAPI } from './services/api';

import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FloorSelector } from './components/FloorSelector';
import { RouteModeSelector } from './components/RouteModeSelector';
import { RouteSummaryCard } from './components/RouteSummaryCard';
import { NavigationInstructions } from './components/NavigationInstructions';
import { InteractiveMap } from './components/InteractiveMap';
import { QRScannerModal } from './components/QRScannerModal';
import { LostModeModal } from './components/LostModeModal';
import { IssueReportModal } from './components/IssueReportModal';
import { AdminDemoModal } from './components/AdminDemoModal';
import { ToastAlert, ToastMessage } from './components/ToastAlert';

export const App: React.FC = () => {
  // Campus Spatial State
  const [floors, setFloors] = useState<Floor[]>([]);
  const [currentFloorIdx, setCurrentFloorIdx] = useState<number>(0);
  const [nodes, setNodes] = useState<CampusNode[]>([]);
  const [edges, setEdges] = useState<CampusEdge[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);

  // Navigation State
  const [startNode, setStartNode] = useState<CampusNode | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<CampusLocation | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>('fastest');
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [alternatives, setAlternatives] = useState<Record<string, AlternativeModeSummary>>({});
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  // Issues & Hazard State
  const [activeIssues, setActiveIssues] = useState<IssueReport[]>([]);

  // Modals & UI State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helper for adding toast alerts
  const addToast = (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial Data Fetching
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [fls, nds, edgs, locs, isss] = await Promise.all([
          CampusAPI.getFloors(),
          CampusAPI.getNodes(),
          CampusAPI.getEdges(),
          CampusAPI.getLocations(),
          CampusAPI.getIssues()
        ]);

        setFloors(fls);
        setNodes(nds);
        setEdges(edgs);
        setLocations(locs);
        setActiveIssues(isss);

        // Default start: Ground Floor Main South Entrance (N_G_S_ENT)
        const defaultStart = nds.find(n => n.id === 'N_G_S_ENT') || nds[0];
        setStartNode(defaultStart);

        // Auto-select demo destination: Room 214 (Faculty Department, 2nd Floor)
        const demoDest = locs.find(l => l.id === 'R214');
        if (demoDest) {
          setDestinationLocation(demoDest);
        }
      } catch (err) {
        console.error('Initialization error', err);
        addToast('error', 'Data Load Warning', 'Operating in offline fallback mode.');
      }
    };

    initializeData();
  }, []);

  // Route Calculation whenever start, destination, mode, or active issues change
  const recalculateRoute = useCallback(async (
    start: CampusNode | null,
    dest: CampusLocation | null,
    mode: RouteMode
  ) => {
    if (!start || !dest) {
      setActiveRoute(null);
      setAlternatives({});
      return;
    }

    try {
      const res = await CampusAPI.getRoute(start.id, dest.node_id, mode);
      setActiveRoute(res.route);
      setAlternatives(res.alternatives || {});
    } catch (err: any) {
      console.warn('Routing error', err);
      setActiveRoute(null);
      addToast('warning', 'Route Notice', 'No connected path found with current obstacles.');
    }
  }, []);

  useEffect(() => {
    if (startNode && destinationLocation) {
      recalculateRoute(startNode, destinationLocation, routeMode);
    }
  }, [startNode, destinationLocation, routeMode, activeIssues, recalculateRoute]);

  // Destination selection handler
  const handleSelectDestination = (location: CampusLocation) => {
    setDestinationLocation(location);
    // Switch to destination floor for clarity
    setCurrentFloorIdx(location.floor);
    addToast('info', 'Destination Selected', `${location.name} on Floor ${location.floor}`);
  };

  const handleClearDestination = () => {
    setDestinationLocation(null);
    setActiveRoute(null);
    setIsNavigating(false);
  };

  // QR Checkpoint resolution handler
  const handleQRResolved = (checkpoint: QRCheckpoint, floor: number) => {
    const matchedNode = nodes.find(n => n.id === checkpoint.node_id);
    if (matchedNode) {
      setStartNode(matchedNode);
      setCurrentFloorIdx(floor);
      addToast('success', 'Location Updated', `You are here: ${checkpoint.name}`);
    }
  };

  // "I'm Lost" Landmark selection handler
  const handleSelectLandmarkAsCurrent = (node: CampusNode, floor: number) => {
    setStartNode(node);
    setCurrentFloorIdx(floor);
    addToast('success', 'Position Synced', `Current location set to ${node.name}`);
  };

  // Dynamic Issue Reporting handler
  const handleIssueReported = (issue: IssueReport) => {
    setActiveIssues(prev => [...prev, issue]);
    addToast('warning', 'Route Updated', `${issue.title}. Dynamic rerouting triggered.`);
  };

  // Toggle Issue Status
  const handleToggleIssue = async (issueId: string, newStatus: 'active' | 'resolved') => {
    await CampusAPI.toggleIssue(issueId, newStatus);
    setActiveIssues(prev =>
      prev.map(i => (i.id === issueId ? { ...i, status: newStatus } : i))
    );
    if (newStatus === 'resolved') {
      addToast('success', 'Obstacle Cleared', 'Staircase reopened. Path recalculated.');
    } else {
      addToast('warning', 'Obstacle Active', 'Rerouting away from closed facility.');
    }
  };

  // Scripted Demo Scenarios for Judges
  const handleRunDemoScenario = (scenarioId: string) => {
    const groundEnt = nodes.find(n => n.id === 'N_G_S_ENT') || nodes[0];
    const room214 = locations.find(l => l.id === 'R214');

    switch (scenarioId) {
      case 'scenario_1':
        // Demo 1: Ground Entrance to Room 214
        setStartNode(groundEnt);
        if (room214) setDestinationLocation(room214);
        setRouteMode('accessible');
        setCurrentFloorIdx(2);
        addToast('info', 'Demo Scenario 1', 'Route to Room 214: Accessible mode via West Elevator');
        break;

      case 'scenario_2':
        // Demo 2: Dynamic Obstruction (Staircase A Closed)
        const stairAIssue: IssueReport = {
          id: `ISSUE-${Date.now()}`,
          title: 'Staircase A Closed for Maintenance',
          type: 'staircase_closed',
          node_ids: ['STAIR_A_0', 'STAIR_A_1', 'STAIR_A_2', 'STAIR_A_3'],
          edge_ids: [],
          floor: 1,
          status: 'active',
          severity: 'high',
          description: 'Step repainting in progress.',
          reported_at: new Date().toISOString()
        };
        handleIssueReported(stairAIssue);
        break;

      case 'scenario_3':
        // Demo 3: Scan QR at Staircase B Checkpoint (2nd Floor)
        const stairBNode = nodes.find(n => n.id === 'STAIR_B_2');
        if (stairBNode) {
          setStartNode(stairBNode);
          setCurrentFloorIdx(2);
          addToast('success', 'QR Checkpoint Scanned', 'Location updated: 2nd Floor · Staircase B Checkpoint');
        }
        break;

      case 'scenario_4':
        // Demo 4: Reopen all & reset
        setActiveIssues([]);
        setStartNode(groundEnt);
        if (room214) setDestinationLocation(room214);
        setRouteMode('fastest');
        setCurrentFloorIdx(0);
        addToast('success', 'Graph Reset', 'All obstacles cleared. Optimal shortest paths restored.');
        break;

      default:
        break;
    }
  };

  const currentFloor = floors[currentFloorIdx] || floors[0] || {
    floor: 0,
    id: 'G',
    name: 'Ground Floor',
    short_name: 'Ground',
    bg_image: '/blueprints/ground.png',
    elevation: 0
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void font-sans select-none">
      {/* Toast Notification Layer */}
      <ToastAlert toasts={toasts} onDismiss={dismissToast} />

      {/* Top Application Header */}
      <Header
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenLostMode={() => setIsLostModalOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenDemoAdmin={() => setIsAdminModalOpen(true)}
        activeIssues={activeIssues}
        isNavigating={isNavigating}
      />

      {/* Main Two-Panel Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT / BOTTOM NAVIGATION PANEL (Search, Route Modes, Summary, Instructions) */}
        <aside className="w-full md:w-96 lg:w-[410px] bg-charcoal border-r border-gunmetal flex flex-col z-20 shrink-0 overflow-hidden shadow-2xl">
          {/* Top Search Area */}
          <div className="p-4 border-b border-gunmetal space-y-3 bg-charcoal">
            <SearchBar
              onSelectDestination={handleSelectDestination}
              selectedDestination={destinationLocation}
              onClearDestination={handleClearDestination}
            />
          </div>

          {/* Scrollable Navigation Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* When destination is selected: Show Mode Selector & Route Card */}
            {destinationLocation && (
              <>
                <RouteModeSelector
                  currentMode={routeMode}
                  onSelectMode={setRouteMode}
                  activeRoute={activeRoute}
                  alternatives={alternatives}
                />

                {activeRoute && (
                  <>
                    <RouteSummaryCard
                      destination={destinationLocation}
                      startNode={startNode}
                      route={activeRoute}
                      mode={routeMode}
                      isNavigating={isNavigating}
                      onToggleNavigation={() => setIsNavigating(!isNavigating)}
                      onChangeStartLocation={() => setIsQRModalOpen(true)}
                    />

                    <NavigationInstructions
                      instructions={activeRoute.instructions}
                      currentFloor={currentFloorIdx}
                      onSelectFloor={setCurrentFloorIdx}
                      onHighlightNode={setHighlightedNodeId}
                    />
                  </>
                )}
              </>
            )}

            {/* When NO destination is selected: Welcome / Context overview */}
            {!destinationLocation && (
              <div className="py-8 px-2 text-center space-y-4 select-none">
                <div className="w-12 h-12 rounded-card bg-graphite border border-steel/30 mx-auto flex items-center justify-center text-signal shadow-lg">
                  <span className="text-xl font-black">S</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Sahyadri Campus Indoor Navigation
                  </h3>
                  <p className="text-xs text-fog max-w-xs mx-auto mt-1 leading-relaxed">
                    Search for any classroom, laboratory, faculty department, or office. Select between <strong className="text-white">Fastest</strong>, <strong className="text-white">Accessible (Elevator)</strong>, and <strong className="text-white">Easy</strong> routes.
                  </p>
                </div>

                <div className="pt-2 border-t border-gunmetal/80 text-left space-y-2">
                  <div className="text-[11px] font-semibold text-ash uppercase tracking-wider">
                    Featured Destinations
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'R214', label: 'Room 214 (Faculty Department)', floor: '2nd Floor' },
                      { id: 'LOC_G_PRINCIPAL', label: "Principal's Chamber", floor: 'Ground Floor' },
                      { id: 'LOC_1_LIB_MAIN', label: 'Central Library', floor: '1st Floor' },
                      { id: 'LOC_G_COMP_LAB_5', label: 'Computer Lab-5', floor: 'Ground Floor' },
                      { id: 'LOC_5_INCUBATION', label: 'Incubation Centre (SCSI)', floor: '5th Floor' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          const matched = locations.find(l => l.id === item.id);
                          if (matched) handleSelectDestination(matched);
                        }}
                        className="flex items-center justify-between p-2 rounded-chip bg-graphite/40 hover:bg-graphite text-xs text-fog hover:text-white border border-transparent hover:border-signal/30 transition text-left"
                      >
                        <span className="font-medium text-white">{item.label}</span>
                        <span className="text-[10px] text-ash px-2 py-0.5 rounded bg-gunmetal">{item.floor}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT / MAIN MAP WORKSPACE (Map is the HERO!) */}
        <main className="flex-1 relative h-full w-full overflow-hidden bg-void">
          <InteractiveMap
            currentFloor={currentFloor}
            floors={floors}
            nodes={nodes}
            edges={edges}
            locations={locations}
            activeRoute={activeRoute}
            startNode={startNode}
            destinationLocation={destinationLocation}
            activeIssues={activeIssues}
            highlightedNodeId={highlightedNodeId}
            onSelectLocation={handleSelectDestination}
            onSelectNodeAsStart={node => {
              setStartNode(node);
              addToast('info', 'Origin Set', `Starting from ${node.name}`);
            }}
          />

          {/* Floating Vertical Floor Selector on Map Left Edge */}
          <div className="absolute top-4 left-4 z-20">
            <FloorSelector
              floors={floors}
              currentFloor={currentFloorIdx}
              onSelectFloor={setCurrentFloorIdx}
              routeFloors={activeRoute?.floors || []}
            />
          </div>
        </main>
      </div>

      {/* Modal Dialogs */}
      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onQRResolved={handleQRResolved}
      />

      <LostModeModal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onOpenQR={() => {
          setIsLostModalOpen(false);
          setIsQRModalOpen(true);
        }}
        onSelectLandmarkAsCurrent={handleSelectLandmarkAsCurrent}
        locations={locations}
        nodes={nodes}
      />

      <IssueReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onIssueReported={handleIssueReported}
      />

      <AdminDemoModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        activeIssues={activeIssues}
        onToggleIssue={handleToggleIssue}
        onRunDemoScenario={handleRunDemoScenario}
      />
    </div>
  );
};
