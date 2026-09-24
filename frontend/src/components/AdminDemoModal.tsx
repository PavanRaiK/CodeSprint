import React from 'react';
import { X, ShieldAlert, Play, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { IssueReport } from '../types';

interface AdminDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIssues: IssueReport[];
  onToggleIssue: (issueId: string, newStatus: 'active' | 'resolved') => void;
  onRunDemoScenario: (scenarioId: string) => void;
}

export const AdminDemoModal: React.FC<AdminDemoModalProps> = ({
  isOpen,
  onClose,
  activeIssues,
  onToggleIssue,
  onRunDemoScenario
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg rounded-card bg-charcoal border border-gunmetal shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gunmetal">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sharp bg-signal/20 text-signal flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Judge Demo & Admin Controls</h2>
              <p className="text-[11px] text-fog">1-Click demonstration scenarios</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-fog hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Quick Scripted Demo Flows */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Scripted Hackathon Demo Sequences
            </div>

            {/* Scenario 1 */}
            <div
              onClick={() => {
                onRunDemoScenario('scenario_1');
                onClose();
              }}
              className="p-3 rounded-chip bg-graphite/70 hover:bg-graphite border border-gunmetal hover:border-signal/40 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-signal" />
                  <span>1. Route to Room 214 (Fastest vs Accessible)</span>
                </div>
                <div className="text-[11px] text-fog mt-0.5">
                  Sets origin: Ground Main Entrance, Dest: Room 214 (Faculty Dept, 2nd Floor)
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-pill bg-signal/20 text-signal font-semibold shrink-0">
                Run
              </span>
            </div>

            {/* Scenario 2 */}
            <div
              onClick={() => {
                onRunDemoScenario('scenario_2');
                onClose();
              }}
              className="p-3 rounded-chip bg-graphite/70 hover:bg-graphite border border-gunmetal hover:border-mapred/40 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-mapred" />
                  <span>2. Dynamic Reroute: Close Staircase A</span>
                </div>
                <div className="text-[11px] text-fog mt-0.5">
                  Simulates staircase obstruction and watches A* recalculate live
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-pill bg-mapred/20 text-mapred font-semibold shrink-0">
                Trigger
              </span>
            </div>

            {/* Scenario 3 */}
            <div
              onClick={() => {
                onRunDemoScenario('scenario_3');
                onClose();
              }}
              className="p-3 rounded-chip bg-graphite/70 hover:bg-graphite border border-gunmetal hover:border-signal/40 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-signal" />
                  <span>3. Simulate QR Checkpoint Scan</span>
                </div>
                <div className="text-[11px] text-fog mt-0.5">
                  Snaps position to 2nd Floor Staircase B Checkpoint and continues nav
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-pill bg-signal/20 text-signal font-semibold shrink-0">
                Scan QR
              </span>
            </div>

            {/* Scenario 4 */}
            <div
              onClick={() => {
                onRunDemoScenario('scenario_4');
                onClose();
              }}
              className="p-3 rounded-chip bg-graphite/70 hover:bg-graphite border border-gunmetal hover:border-mapgreen/40 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-mapgreen" />
                  <span>4. Reopen All Staircases / Reset Graph</span>
                </div>
                <div className="text-[11px] text-fog mt-0.5">
                  Clears temporary closures and returns graph to optimal state
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-pill bg-mapgreen/20 text-mapgreen font-semibold shrink-0">
                Reopen
              </span>
            </div>
          </div>

          {/* Active Obstacles Management */}
          <div className="space-y-2 pt-3 border-t border-gunmetal">
            <div className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Active Obstacles & Hazards ({activeIssues.length})
            </div>
            {activeIssues.length === 0 ? (
              <div className="text-xs text-fog py-2">
                All campus staircases, corridors, and elevators are fully open.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {activeIssues.map(issue => (
                  <div
                    key={issue.id}
                    className="p-2.5 rounded-chip bg-void border border-gunmetal flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{issue.title}</div>
                      <div className="text-[10px] text-fog">{issue.description}</div>
                    </div>
                    <button
                      onClick={() =>
                        onToggleIssue(
                          issue.id,
                          issue.status === 'active' ? 'resolved' : 'active'
                        )
                      }
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-pill transition ${
                        issue.status === 'active'
                          ? 'bg-mapred/20 text-mapred hover:bg-mapred hover:text-white'
                          : 'bg-mapgreen/20 text-mapgreen hover:bg-mapgreen hover:text-white'
                      }`}
                    >
                      {issue.status === 'active' ? 'Mark Resolved' : 'Reactivate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
