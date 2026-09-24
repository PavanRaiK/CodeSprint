import React from 'react';
import { Zap, Accessibility, Compass } from 'lucide-react';
import { RouteMode, RouteResult, AlternativeModeSummary } from '../types';

interface RouteModeSelectorProps {
  currentMode: RouteMode;
  onSelectMode: (mode: RouteMode) => void;
  activeRoute: RouteResult | null;
  alternatives: Record<string, AlternativeModeSummary>;
}

export const RouteModeSelector: React.FC<RouteModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  activeRoute,
  alternatives
}) => {
  const getMetrics = (mode: RouteMode) => {
    if (mode === currentMode && activeRoute) {
      return {
        dist: activeRoute.distance,
        etaMin: Math.max(1, Math.round(activeRoute.eta_seconds / 60)),
        stairs: activeRoute.stairs_count,
        elevator: activeRoute.elevator_used,
        turns: activeRoute.turn_count
      };
    }
    const alt = alternatives[mode];
    if (alt) {
      return {
        dist: alt.distance,
        etaMin: Math.max(1, Math.round(alt.eta_seconds / 60)),
        stairs: alt.stairs_count,
        elevator: alt.elevator_used,
        turns: alt.turn_count
      };
    }
    return null;
  };

  const fastestMetrics = getMetrics('fastest');
  const accessibleMetrics = getMetrics('accessible');
  const easyMetrics = getMetrics('easy');

  return (
    <div className="w-full select-none space-y-2">
      <div className="text-[11px] font-semibold text-ash uppercase tracking-wider">
        Select Route Option
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* FASTEST MODE */}
        <button
          onClick={() => onSelectMode('fastest')}
          className={`flex flex-col text-left p-2.5 rounded-card border transition ${
            currentMode === 'fastest'
              ? 'bg-signal/15 border-signal text-white shadow-lg shadow-signal/10'
              : 'bg-charcoal hover:bg-graphite border-gunmetal text-fog'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-1 rounded-sharp ${currentMode === 'fastest' ? 'bg-signal text-white' : 'bg-gunmetal text-fog'}`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            {currentMode === 'fastest' && (
              <span className="w-1.5 h-1.5 rounded-full bg-signal"></span>
            )}
          </div>
          <div className="text-xs font-bold text-white">Fastest</div>
          {fastestMetrics ? (
            <div className="mt-1 space-y-0.5">
              <div className="text-xs font-bold text-signal">
                {fastestMetrics.etaMin} min
              </div>
              <div className="text-[10px] text-fog leading-none">
                {fastestMetrics.dist} m · {fastestMetrics.stairs > 0 ? 'stairs' : 'flat'}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-ash mt-1">Direct path</div>
          )}
        </button>

        {/* ACCESSIBLE MODE */}
        <button
          onClick={() => onSelectMode('accessible')}
          className={`flex flex-col text-left p-2.5 rounded-card border transition ${
            currentMode === 'accessible'
              ? 'bg-signal/15 border-signal text-white shadow-lg shadow-signal/10'
              : 'bg-charcoal hover:bg-graphite border-gunmetal text-fog'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-1 rounded-sharp ${currentMode === 'accessible' ? 'bg-signal text-white' : 'bg-gunmetal text-fog'}`}>
              <Accessibility className="w-3.5 h-3.5" />
            </div>
            {currentMode === 'accessible' && (
              <span className="w-1.5 h-1.5 rounded-full bg-signal"></span>
            )}
          </div>
          <div className="text-xs font-bold text-white">Accessible</div>
          {accessibleMetrics ? (
            <div className="mt-1 space-y-0.5">
              <div className="text-xs font-bold text-signal">
                {accessibleMetrics.etaMin} min
              </div>
              <div className="text-[10px] text-fog leading-none">
                {accessibleMetrics.dist} m · elevator
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-ash mt-1">Step-free</div>
          )}
        </button>

        {/* EASY MODE */}
        <button
          onClick={() => onSelectMode('easy')}
          className={`flex flex-col text-left p-2.5 rounded-card border transition ${
            currentMode === 'easy'
              ? 'bg-signal/15 border-signal text-white shadow-lg shadow-signal/10'
              : 'bg-charcoal hover:bg-graphite border-gunmetal text-fog'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-1 rounded-sharp ${currentMode === 'easy' ? 'bg-signal text-white' : 'bg-gunmetal text-fog'}`}>
              <Compass className="w-3.5 h-3.5" />
            </div>
            {currentMode === 'easy' && (
              <span className="w-1.5 h-1.5 rounded-full bg-signal"></span>
            )}
          </div>
          <div className="text-xs font-bold text-white">Easy</div>
          {easyMetrics ? (
            <div className="mt-1 space-y-0.5">
              <div className="text-xs font-bold text-signal">
                {easyMetrics.etaMin} min
              </div>
              <div className="text-[10px] text-fog leading-none">
                {easyMetrics.dist} m · {easyMetrics.turns} turns
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-ash mt-1">Fewer turns</div>
          )}
        </button>
      </div>
    </div>
  );
};
