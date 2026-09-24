import React from 'react';
import { Layers } from 'lucide-react';
import { Floor } from '../types';

interface FloorSelectorProps {
  floors: Floor[];
  currentFloor: number;
  onSelectFloor: (floor: number) => void;
  routeFloors?: number[];
}

export const FloorSelector: React.FC<FloorSelectorProps> = ({
  floors,
  currentFloor,
  onSelectFloor,
  routeFloors = []
}) => {
  return (
    <div className="flex flex-col items-center bg-charcoal/90 backdrop-blur-md border border-gunmetal rounded-card p-1.5 shadow-2xl space-y-1 select-none">
      <div className="text-[10px] uppercase font-semibold text-ash px-2 py-1 flex items-center space-x-1">
        <Layers className="w-3 h-3 text-signal" />
        <span className="hidden sm:inline">Floor</span>
      </div>

      <div className="flex flex-col space-y-1 w-full">
        {floors.slice().reverse().map(fl => {
          const isSelected = fl.floor === currentFloor;
          const hasRoute = routeFloors.includes(fl.floor);

          return (
            <button
              key={fl.floor}
              onClick={() => onSelectFloor(fl.floor)}
              className={`relative flex items-center justify-between px-3 py-2 rounded-chip text-xs font-semibold transition ${
                isSelected
                  ? 'bg-signal text-white shadow-lg shadow-signal/30'
                  : 'bg-transparent hover:bg-graphite text-fog hover:text-white'
              }`}
              title={fl.name}
            >
              <div className="flex items-center space-x-1.5">
                <span className="w-5 text-center">{fl.id}</span>
                <span className="hidden md:inline text-[11px] font-normal opacity-90">
                  {fl.short_name}
                </span>
              </div>

              {/* Route Indicator Dot */}
              {hasRoute && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" title="Route passes this floor"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
