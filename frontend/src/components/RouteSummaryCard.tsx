import React from 'react';
import { RouteResult, RouteMode, CampusLocation, CampusNode } from '../types';
import { Navigation, Clock, Footprints, Layers, ArrowUpRight, Play, Square, MapPin } from 'lucide-react';

interface RouteSummaryCardProps {
  destination: CampusLocation;
  startNode: CampusNode | null;
  route: RouteResult;
  mode: RouteMode;
  isNavigating: boolean;
  onToggleNavigation: () => void;
  onChangeStartLocation: () => void;
}

export const RouteSummaryCard: React.FC<RouteSummaryCardProps> = ({
  destination,
  startNode,
  route,
  mode,
  isNavigating,
  onToggleNavigation,
  onChangeStartLocation
}) => {
  const etaMinutes = Math.max(1, Math.round(route.eta_seconds / 60));
  const floorNames = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

  return (
    <div className="p-4 rounded-card bg-charcoal border border-gunmetal space-y-3.5 select-none shadow-xl">
      {/* Origin & Destination line */}
      <div className="space-y-1.5 pb-2.5 border-b border-gunmetal/80">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-fog truncate">
            <span className="w-2 h-2 rounded-full bg-signal shrink-0"></span>
            <span className="truncate">From: <strong className="text-white">{startNode ? startNode.name : 'Current Location'}</strong></span>
          </div>
          <button
            onClick={onChangeStartLocation}
            className="text-[11px] text-signal hover:underline shrink-0 ml-2"
          >
            Change
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs text-fog truncate">
          <span className="w-2 h-2 rounded-full bg-mapgreen shrink-0"></span>
          <span className="truncate">To: <strong className="text-white">{destination.name}</strong></span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gunmetal text-fog shrink-0">
            {destination.floor === -1 ? 'Campus Grounds' : destination.floor === 0 ? 'Ground Floor' : `Floor ${destination.floor}`}
          </span>
        </div>
      </div>

      {/* Main Big Metric Hero */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {etaMinutes}
            </span>
            <span className="text-sm font-semibold text-fog">min</span>
            <span className="text-ash mx-1">·</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {route.distance}
            </span>
            <span className="text-sm font-semibold text-fog">m</span>
          </div>
          <div className="text-[11px] text-ash mt-0.5 capitalize">
            {mode} route profile selected
          </div>
        </div>

        {/* Start / Stop Navigation Button */}
        <button
          onClick={onToggleNavigation}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-pill font-semibold text-xs tracking-wide transition shadow-lg ${
            isNavigating
              ? 'bg-graphite hover:bg-gunmetal text-mapred border border-mapred/40'
              : 'bg-signal hover:bg-signal-hover text-white shadow-signal/30'
          }`}
        >
          {isNavigating ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Nav</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Navigation</span>
            </>
          )}
        </button>
      </div>

      {/* Micro-Stats Grid */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gunmetal/60 text-center">
        <div className="p-1.5 rounded-chip bg-gunmetal/60">
          <div className="text-[10px] text-ash uppercase font-semibold">Floors</div>
          <div className="text-xs font-bold text-white mt-0.5">
            {route.floors.length}
          </div>
        </div>

        <div className="p-1.5 rounded-chip bg-gunmetal/60">
          <div className="text-[10px] text-ash uppercase font-semibold">Stairs</div>
          <div className="text-xs font-bold text-white mt-0.5">
            {route.stairs_count}
          </div>
        </div>

        <div className="p-1.5 rounded-chip bg-gunmetal/60">
          <div className="text-[10px] text-ash uppercase font-semibold">Elevator</div>
          <div className="text-xs font-bold text-white mt-0.5">
            {route.elevator_used ? 'Yes' : 'No'}
          </div>
        </div>

        <div className="p-1.5 rounded-chip bg-gunmetal/60">
          <div className="text-[10px] text-ash uppercase font-semibold">Turns</div>
          <div className="text-xs font-bold text-white mt-0.5">
            {route.turn_count}
          </div>
        </div>
      </div>
    </div>
  );
};
