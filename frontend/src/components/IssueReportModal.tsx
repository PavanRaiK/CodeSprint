import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { CampusAPI } from '../services/api';
import { IssueReport } from '../types';

interface IssueReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueReported: (issue: IssueReport) => void;
}

export const IssueReportModal: React.FC<IssueReportModalProps> = ({
  isOpen,
  onClose,
  onIssueReported
}) => {
  const [issueType, setIssueType] = useState('staircase_closed');
  const [selectedTarget, setSelectedTarget] = useState('STAIR_A');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetOptions = [
    { id: 'STAIR_A', name: 'Staircase A (North-West Stairs)', nodeIds: ['STAIR_A_0', 'STAIR_A_1', 'STAIR_A_2', 'STAIR_A_3'], floor: 1 },
    { id: 'STAIR_B', name: 'Staircase B (East Central Stairs)', nodeIds: ['STAIR_B_0', 'STAIR_B_1', 'STAIR_B_2', 'STAIR_B_3', 'STAIR_B_4', 'STAIR_B_5'], floor: 2 },
    { id: 'ELEV_1', name: 'West Elevator Bank', nodeIds: ['ELEV_1_0', 'ELEV_1_1', 'ELEV_1_2', 'ELEV_1_3', 'ELEV_1_4', 'ELEV_1_5'], floor: 0 },
    { id: 'CORR_N', name: 'North Corridor (Floor 2 near Room 214)', nodeIds: ['N_2_N_214'], floor: 2 },
    { id: 'CORR_E', name: 'East Corridor (Floor 1)', nodeIds: ['N_1_E_MID'], floor: 1 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const chosen = targetOptions.find(t => t.id === selectedTarget) || targetOptions[0];
    const title = `${chosen.name} - Temporary Obstacle Reported`;

    try {
      const created = await CampusAPI.reportIssue({
        title,
        type: issueType,
        node_ids: chosen.nodeIds,
        edge_ids: [],
        floor: chosen.floor,
        severity: 'high',
        description: description.trim() || 'Reported by campus user/operator.'
      });

      onIssueReported(created);
      onClose();
    } catch (err) {
      console.error('Failed to report issue', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-md rounded-card bg-charcoal border border-gunmetal shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gunmetal">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sharp bg-mapred/20 text-mapred flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Report Campus Obstacle</h2>
              <p className="text-[11px] text-fog">Modify real-time routing availability</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-fog hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Obstacle Type
            </label>
            <select
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              className="w-full h-10 px-3 rounded-sharp bg-void border border-gunmetal text-white text-xs outline-none focus:border-signal"
            >
              <option value="staircase_closed">Staircase Closed / Maintenance</option>
              <option value="corridor_blocked">Corridor Blocked / Construction</option>
              <option value="elevator_unavailable">Elevator Out of Service</option>
              <option value="wet_floor">Wet Floor / Slip Hazard</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Affected Location / Facility
            </label>
            <select
              value={selectedTarget}
              onChange={e => setSelectedTarget(e.target.value)}
              className="w-full h-10 px-3 rounded-sharp bg-void border border-gunmetal text-white text-xs outline-none focus:border-signal"
            >
              {targetOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Description / Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Painting work underway until 4 PM. Use alternate stairs."
              className="w-full h-20 p-3 rounded-sharp bg-void border border-gunmetal text-white text-xs outline-none focus:border-signal resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-pill bg-mapred hover:bg-red-600 text-white text-xs font-semibold shadow-lg shadow-mapred/20 transition"
          >
            {isSubmitting ? 'Reporting...' : 'Publish Obstacle & Recalculate Routes'}
          </button>
        </form>
      </div>
    </div>
  );
};
