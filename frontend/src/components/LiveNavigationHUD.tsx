import React from 'react';
import {
  NavigationInstruction,
  RouteResult,
  CampusLocation,
  CampusNode
} from '../types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
  Footprints,
  CornerUpRight,
  MoveVertical,
  CheckCircle2,
  Compass,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';

interface LiveNavigationHUDProps {
  route: RouteResult;
  currentStepIndex: number;
  destination: CampusLocation;
  startNode: CampusNode | null;
  isSimulating: boolean;
  simSpeed: number;
  isMuted: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
  onToggleSimulation: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleMute: () => void;
  onStopNavigation: () => void;
}

export const LiveNavigationHUD: React.FC<LiveNavigationHUDProps> = ({
  route,
  currentStepIndex,
  destination,
  startNode,
  isSimulating,
  simSpeed,
  isMuted,
  onNextStep,
  onPrevStep,
  onToggleSimulation,
  onChangeSpeed,
  onToggleMute,
  onStopNavigation
}) => {
  const instructions = route.instructions;
  const currentInstruction = instructions[currentStepIndex] || instructions[0];
  const nextInstruction = instructions[currentStepIndex + 1];
  const isLastStep = currentStepIndex >= instructions.length - 1;
  const floorLabels = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

  const getFloorName = (fl: number) => {
    if (fl === -1) return 'Campus Grounds';
    if (fl === 0) return 'Ground Floor';
    return `${floorLabels[fl] || fl + 'th'} Floor`;
  };

  const getInstructionIcon = (type: string, isCampus: boolean) => {
    if (isCampus && type === 'start') {
      return <Compass className="w-5 h-5 text-white" />;
    }
    switch (type) {
      case 'start':
        return <Footprints className="w-5 h-5 text-white" />;
      case 'stairs':
      case 'elevator':
        return <MoveVertical className="w-5 h-5 text-white" />;
      case 'turn':
        return <CornerUpRight className="w-5 h-5 text-white" />;
      case 'arrive':
        return <CheckCircle2 className="w-5 h-5 text-white" />;
      default:
        return <ArrowRight className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-xl select-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-charcoal/95 backdrop-blur-xl border-2 border-signal rounded-card shadow-2xl overflow-hidden divide-y divide-gunmetal/70">
        {/* Top Header: Active Direction Banner */}
        <div className="p-3.5 flex items-start space-x-3 bg-gradient-to-r from-signal/20 via-charcoal to-signal/10">
          {/* Large Maneuver Icon */}
          <div className="w-11 h-11 rounded-card bg-signal flex items-center justify-center shrink-0 shadow-lg shadow-signal/30 mt-0.5">
            {getInstructionIcon(currentInstruction.type, currentInstruction.floor === -1)}
          </div>

          {/* Main Instruction Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-signal text-white">
                Step {currentStepIndex + 1} of {instructions.length}
              </span>
              <span className="text-[10px] font-semibold text-signal px-2 py-0.5 rounded-full bg-signal/15 border border-signal/30">
                {getFloorName(currentInstruction.floor)}
              </span>
              {isLastStep && (
                <span className="text-[10px] font-bold text-mapgreen px-2 py-0.5 rounded-full bg-mapgreen/20 border border-mapgreen/40 flex items-center space-x-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Destination Ahead</span>
                </span>
              )}
            </div>

            <h2 className="text-sm md:text-base font-bold text-white tracking-tight mt-1 leading-snug">
              {currentInstruction.text}
            </h2>

            {/* Next maneuver teaser */}
            {nextInstruction && (
              <div className="flex items-center space-x-1.5 text-xs text-fog/80 mt-1 truncate">
                <span className="text-[11px] font-semibold text-ash">Then:</span>
                <span className="truncate">{nextInstruction.text}</span>
              </div>
            )}
          </div>

          {/* Stop / Exit Nav Button */}
          <button
            onClick={onStopNavigation}
            className="p-1.5 rounded-full bg-gunmetal/80 hover:bg-mapred/20 text-fog hover:text-mapred border border-transparent hover:border-mapred/40 transition shrink-0"
            title="End Navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Controls Row: Prev/Next, Walk Simulation, Voice, Speed */}
        <div className="px-3.5 py-2.5 flex items-center justify-between bg-charcoal/90 text-xs flex-wrap gap-2">
          {/* Step Navigation Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className={`p-1.5 rounded-chip border transition flex items-center space-x-1 ${
                currentStepIndex === 0
                  ? 'opacity-40 cursor-not-allowed border-transparent text-ash'
                  : 'bg-graphite hover:bg-gunmetal border-gunmetal text-white'
              }`}
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-medium pr-1">Prev</span>
            </button>

            <button
              onClick={onNextStep}
              disabled={isLastStep}
              className={`p-1.5 rounded-chip border transition flex items-center space-x-1 ${
                isLastStep
                  ? 'opacity-40 cursor-not-allowed border-transparent text-ash'
                  : 'bg-signal hover:bg-signal-hover border-signal/50 text-white font-semibold shadow-md shadow-signal/20'
              }`}
              title="Next Step"
            >
              <span className="hidden sm:inline text-[11px] pl-1">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Simulation Toggle & Speed */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleSimulation}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-pill font-semibold text-xs transition ${
                isSimulating
                  ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20'
                  : 'bg-graphite hover:bg-gunmetal border border-gunmetal text-white'
              }`}
              title={isSimulating ? 'Pause walking simulation' : 'Auto-simulate walking along path'}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-signal" />
                  <span>Simulate Walk</span>
                </>
              )}
            </button>

            {/* Speed Selector */}
            {isSimulating && (
              <div className="flex items-center rounded-pill bg-graphite border border-gunmetal p-0.5 text-[11px]">
                {[0.5, 1, 2].map(s => (
                  <button
                    key={s}
                    onClick={() => onChangeSpeed(s)}
                    className={`px-2 py-0.5 rounded-pill transition font-semibold ${
                      simSpeed === s ? 'bg-signal text-white' : 'text-fog hover:text-white'
                    }`}
                    title={s === 0.5 ? 'Slow Walk (0.5x)' : s === 1 ? 'Normal Walk (1x)' : 'Brisk Walk (2x)'}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice Audio & Destination Metric */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-pill border transition flex items-center space-x-1 ${
                isMuted
                  ? 'bg-graphite/60 text-ash border-gunmetal'
                  : 'bg-graphite text-signal border-signal/30'
              }`}
              title={isMuted ? 'Unmute voice instructions' : 'Mute voice instructions'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline text-[10px] font-medium pr-1">
                {isMuted ? 'Muted' : 'Voice'}
              </span>
            </button>

            <div className="text-[11px] text-fog border-l border-gunmetal pl-2 hidden sm:block">
              To: <strong className="text-white">{destination.name.slice(0, 16)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
