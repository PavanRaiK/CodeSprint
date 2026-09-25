import React from 'react';
import { Layers, Compass } from 'lucide-react';
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
  const campusFloor = floors.find(f => f.floor === -1);
  const buildingFloors = floors.filter(f => f.floor >= 0).sort((a, b) => b.floor - a.floor);

  return (
    <div className="flex flex-col items-center bg-charcoal/95 backdrop-blur-md border border-gunmetal rounded-card p-1.5 shadow-2xl space-y-1.5 select-none w-28 md:w-32">
      {/* Campus Map View Button */}
      {campusFloor && (
        <>
          <button
            onClick={() => onSelectFloor(campusFloor.floor)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-chip text-xs font-semibold transition ${
              currentFloor === campusFloor.floor
                ? 'bg-signal text-white shadow-lg shadow-signal/30'
                : 'bg-graphite/60 hover:bg-graphite text-fog hover:text-white border border-gunmetal/60'
            }`}
            title="Campus Overview (Outdoor grounds, sports fields & blocks)"
          >
            <div className="flex items-center space-x-1.5">
              <Compass className={`w-3.5 h-3.5 ${currentFloor === campusFloor.floor ? 'text-white' : 'text-signal'}`} />
              <span className="text-[11px] font-bold">Campus</span>
            </div>
            {routeFloors.includes(campusFloor.floor) && currentFloor !== campusFloor.floor && (
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" title="Route passes campus"></span>
            )}
          </button>

          <div className="w-full flex items-center justify-center space-x-1 py-0.5">
            <div className="h-[1px] bg-gunmetal/80 flex-1"></div>
            <span className="text-[9px] uppercase font-bold text-ash px-1 flex items-center space-x-1">
              <Layers className="w-2.5 h-2.5 text-ash" />
              <span>Floors</span>
            </span>
            <div className="h-[1px] bg-gunmetal/80 flex-1"></div>
          </div>
        </>
      )}

      {/* Building Floors (5 down to Ground) */}
      <div className="flex flex-col space-y-1 w-full">
        {buildingFloors.map(fl => {
          const isSelected = fl.floor === currentFloor;
          const hasRoute = routeFloors.includes(fl.floor);

          return (
            <button
              key={fl.floor}
              onClick={() => onSelectFloor(fl.floor)}
              className={`relative flex items-center justify-between px-2.5 py-1.5 rounded-chip text-xs font-semibold transition ${
                isSelected
                  ? 'bg-signal text-white shadow-md shadow-signal/30'
                  : 'bg-transparent hover:bg-graphite text-fog hover:text-white'
              }`}
              title={fl.name}
            >
              <div className="flex items-center space-x-1.5">
                <span className="w-4 text-center font-bold text-xs">{fl.id}</span>
                <span className="text-[11px] font-normal opacity-90">
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
