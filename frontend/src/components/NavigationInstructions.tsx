import React, { useEffect, useRef } from 'react';
import { NavigationInstruction } from '../types';
import { Footprints, ArrowRight, CheckCircle2, CornerUpRight, MoveVertical, Compass } from 'lucide-react';

interface NavigationInstructionsProps {
  instructions: NavigationInstruction[];
  currentFloor: number;
  activeStepIndex?: number;
  onSelectFloor: (floor: number) => void;
  onHighlightNode?: (nodeId: string) => void;
}

export const NavigationInstructions: React.FC<NavigationInstructionsProps> = ({
  instructions,
  currentFloor,
  activeStepIndex,
  onSelectFloor,
  onHighlightNode
}) => {
  const activeStepRef = useRef<HTMLDivElement>(null);
  const floorLabels = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

  useEffect(() => {
    if (activeStepIndex !== undefined && activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeStepIndex]);

  const getFloorName = (fl: number) => {
    if (fl === -1) return 'Campus Grounds';
    if (fl === 0) return 'Ground Floor';
    return `${floorLabels[fl] || fl + 'th'} Floor`;
  };

  const getStepIcon = (type: string, isCampus: boolean) => {
    if (isCampus && type === 'start') {
      return <Compass className="w-3.5 h-3.5 text-signal" />;
    }
    switch (type) {
      case 'start':
        return <Footprints className="w-3.5 h-3.5 text-signal" />;
      case 'stairs':
      case 'elevator':
        return <MoveVertical className="w-3.5 h-3.5 text-amber-400" />;
      case 'turn':
        return <CornerUpRight className="w-3.5 h-3.5 text-fog" />;
      case 'arrive':
        return <CheckCircle2 className="w-3.5 h-3.5 text-mapgreen" />;
      default:
        return <ArrowRight className="w-3.5 h-3.5 text-fog" />;
    }
  };

  return (
    <div className="rounded-card bg-charcoal border border-gunmetal p-4 space-y-3 select-none shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <span>Turn-by-Turn Guidance</span>
          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-gunmetal text-fog">
            {instructions.length} steps
          </span>
        </div>
        {activeStepIndex !== undefined && (
          <span className="text-[10px] font-bold text-signal px-2 py-0.5 rounded-full bg-signal/10 border border-signal/30 animate-pulse">
            Step {activeStepIndex + 1} of {instructions.length}
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {instructions.map((inst, idx) => {
          const isCurrentFloorStep = inst.floor === currentFloor;
          const isActiveStep = activeStepIndex === idx;

          return (
            <div
              key={idx}
              ref={isActiveStep ? activeStepRef : null}
              onClick={() => {
                onSelectFloor(inst.floor);
                if (inst.node_id && onHighlightNode) {
                  onHighlightNode(inst.node_id);
                }
              }}
              className={`flex items-start space-x-2.5 p-2 rounded-chip transition cursor-pointer ${
                isActiveStep
                  ? 'bg-signal/15 border-2 border-signal shadow-md shadow-signal/20'
                  : isCurrentFloorStep
                  ? 'bg-graphite/80 border border-signal/20'
                  : 'bg-gunmetal/30 hover:bg-gunmetal/60 border border-transparent'
              }`}
            >
              <div className={`w-6 h-6 rounded-sharp flex items-center justify-center shrink-0 mt-0.5 ${
                isActiveStep ? 'bg-signal text-white' : 'bg-gunmetal'
              }`}>
                {getStepIcon(inst.type, inst.floor === -1)}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium leading-snug ${isActiveStep ? 'text-white font-bold' : 'text-fog'}`}>
                  {inst.text}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    isActiveStep
                      ? 'bg-signal text-white'
                      : isCurrentFloorStep
                      ? 'bg-signal/20 text-signal border border-signal/30'
                      : 'bg-gunmetal text-ash'
                  }`}>
                    {getFloorName(inst.floor)}
                  </span>
                  {inst.type === 'stairs' && (
                    <span className="text-[10px] text-amber-400">Step Transition</span>
                  )}
                  {inst.type === 'elevator' && (
                    <span className="text-[10px] text-mapgreen">Accessible Lift</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
