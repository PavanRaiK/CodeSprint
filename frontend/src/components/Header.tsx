import React from 'react';
import { Navigation, QrCode, AlertTriangle, Compass, ShieldAlert } from 'lucide-react';
import { IssueReport } from '../types';

interface HeaderProps {
  onOpenQR: () => void;
  onOpenLostMode: () => void;
  onOpenReport: () => void;
  onOpenDemoAdmin: () => void;
  activeIssues: IssueReport[];
  isNavigating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQR,
  onOpenLostMode,
  onOpenReport,
  onOpenDemoAdmin,
  activeIssues,
  isNavigating
}) => {
  const activeCount = activeIssues.filter(i => i.status === 'active').length;

  return (
    <header className="h-16 bg-void border-b border-gunmetal flex items-center justify-between px-4 lg:px-6 z-30 select-none">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-sharp bg-signal/15 border border-signal/30 flex items-center justify-center text-signal shadow-lg shadow-signal/10">
          <Navigation className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white font-sans">
              SAHYADRI NAV
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-signal/20 text-signal border border-signal/30">
              CAMPUS v1.0
            </span>
            {activeCount > 0 && (
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-mapred/20 text-mapred border border-mapred/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-mapred animate-pulse"></span>
                {activeCount} Alert{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-[11px] text-fog leading-none hidden sm:block">
            Navigate the campus. Know the way.
          </p>
        </div>
      </div>

      {/* Utility Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Update My Location / Scan QR */}
        <button
          onClick={onOpenQR}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-pill bg-charcoal hover:bg-graphite border border-gunmetal hover:border-steel text-fog hover:text-white text-xs font-medium transition"
          title="Scan Campus QR Checkpoint to locate yourself"
        >
          <QrCode className="w-3.5 h-3.5 text-signal" />
          <span className="hidden sm:inline">Update Location</span>
          <span className="sm:hidden">QR</span>
        </button>

        {/* I'm Lost Mode */}
        <button
          onClick={onOpenLostMode}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-pill bg-charcoal hover:bg-graphite border border-gunmetal hover:border-steel text-fog hover:text-white text-xs font-medium transition"
          title="Lost? Let Sahyadri Nav identify where you are"
        >
          <Compass className="w-3.5 h-3.5 text-mapgreen" />
          <span className="hidden sm:inline">I'm Lost</span>
        </button>

        {/* Report Issue / Obstacle */}
        <button
          onClick={onOpenReport}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-pill bg-charcoal hover:bg-graphite border border-gunmetal hover:border-steel text-fog hover:text-white text-xs font-medium transition"
          title="Report blocked staircase or path closure"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Report Issue</span>
        </button>

        {/* Admin / Demo Quick Switcher */}
        <button
          onClick={onOpenDemoAdmin}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-pill bg-signal/15 hover:bg-signal/25 border border-signal/40 text-signal text-xs font-semibold transition"
          title="Open Judge & Demo Scenarios Control Panel"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Demo Controls</span>
        </button>
      </div>
    </header>
  );
};
