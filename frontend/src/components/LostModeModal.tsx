import React, { useState } from 'react';
import { X, Compass, QrCode, Type, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { CampusLocation, CampusNode } from '../types';
import { CampusAPI } from '../services/api';

interface LostModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQR: () => void;
  onSelectLandmarkAsCurrent: (node: CampusNode, floor: number) => void;
  locations: CampusLocation[];
  nodes: CampusNode[];
}

export const LostModeModal: React.FC<LostModeModalProps> = ({
  isOpen,
  onClose,
  onOpenQR,
  onSelectLandmarkAsCurrent,
  locations,
  nodes
}) => {
  const [signInput, setSignInput] = useState('');
  const [detectionResult, setDetectionResult] = useState<string | null>(null);
  const [matchedLoc, setMatchedLoc] = useState<CampusLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleDetectSign = async () => {
    if (!signInput.trim()) return;
    setIsLoading(true);
    setDetectionResult(null);
    setMatchedLoc(null);

    try {
      const res = await CampusAPI.detectSign(signInput);
      if (res.matched_location) {
        setMatchedLoc(res.matched_location);
        setDetectionResult(`Identified: ${res.matched_location.name} (Floor ${res.matched_location.floor})`);
      } else {
        setDetectionResult(res.message);
      }
    } catch (err: any) {
      setDetectionResult(err.message || 'Detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmMatchedLocation = () => {
    if (!matchedLoc) return;
    const targetNode = nodes.find(n => n.id === matchedLoc.node_id);
    if (targetNode) {
      onSelectLandmarkAsCurrent(targetNode, matchedLoc.floor);
      onClose();
    }
  };

  // Prominent landmarks for quick manual identification
  const landmarkOptions = [
    { label: 'Campus Food Court (Cafeteria)', nodeId: 'CN_FOOD_COURT', floor: -1 },
    { label: 'Campus Parking Area', nodeId: 'CN_PARKING', floor: -1 },
    { label: 'Sahyadri Cricket Ground', nodeId: 'CN_CRICKET_GROUND', floor: -1 },
    { label: 'Ground Floor Main Entrance', nodeId: 'N_G_S_ENT', floor: 0 },
    { label: 'Central Library (1st Floor Entrance)', nodeId: 'N_1_W_LIB', floor: 1 },
    { label: 'West Elevator Lobby (Ground Floor)', nodeId: 'ELEV_1_0', floor: 0 },
    { label: 'West Elevator Lobby (2nd Floor)', nodeId: 'ELEV_1_2', floor: 2 },
    { label: 'Staircase B (2nd Floor Landing)', nodeId: 'STAIR_B_2', floor: 2 },
    { label: 'Civil Dept (3rd Floor)', nodeId: 'N_3_N_STAFF', floor: 3 },
    { label: 'Startup Incubation Centre (5th Floor)', nodeId: 'N_5_N_INCUBATION', floor: 5 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg rounded-card bg-charcoal border border-gunmetal shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gunmetal">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sharp bg-mapgreen/20 text-mapgreen flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">"I'm Lost" Location Recovery</h2>
              <p className="text-[11px] text-fog">Let Sahyadri Nav help you find where you are</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-fog hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Method 1: Scan QR */}
          <div className="p-3.5 rounded-chip bg-graphite/70 border border-gunmetal flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-sharp bg-signal/20 text-signal flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Scan a Nearby Campus QR</div>
                <div className="text-[11px] text-fog">Located at corridor pillars, staircases, and room signs</div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenQR();
              }}
              className="px-3 py-1.5 rounded-pill bg-signal hover:bg-signal-hover text-white text-xs font-semibold shrink-0 transition"
            >
              Scan QR
            </button>
          </div>

          {/* Method 2: Room Sign OCR / Number Recognition */}
          <div className="p-3.5 rounded-chip bg-graphite/70 border border-gunmetal space-y-2.5">
            <div className="flex items-center space-x-2">
              <Type className="w-4 h-4 text-amber-400" />
              <div className="text-xs font-semibold text-white">Read Door Sign or Room Number</div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">
              Enter any room number or sign text visible in your corridor (e.g. "214", "Intel Lab", "Library"):
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={signInput}
                onChange={e => setSignInput(e.target.value)}
                placeholder="e.g. 214 or Physics Lab"
                className="flex-1 h-9 px-3 rounded-sharp bg-void border border-gunmetal focus:border-signal text-white text-xs outline-none"
              />
              <button
                onClick={handleDetectSign}
                disabled={isLoading || !signInput.trim()}
                className="h-9 px-4 rounded-sharp bg-signal disabled:bg-steel text-white text-xs font-semibold transition"
              >
                {isLoading ? 'Scanning...' : 'Identify'}
              </button>
            </div>

            {detectionResult && (
              <div className="p-2.5 rounded-sharp bg-void border border-steel/30 text-xs space-y-2">
                <div className="text-fog">{detectionResult}</div>
                {matchedLoc && (
                  <button
                    onClick={confirmMatchedLocation}
                    className="w-full py-1.5 rounded-sharp bg-mapgreen text-white font-semibold text-xs transition"
                  >
                    Confirm: I am at {matchedLoc.name}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Method 3: Pick a Landmark */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-ash uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-3 h-3 text-signal" />
              <span>Or Choose a Landmark Near You</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {landmarkOptions.map((lm, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const node = nodes.find(n => n.id === lm.nodeId);
                    if (node) {
                      onSelectLandmarkAsCurrent(node, lm.floor);
                      onClose();
                    }
                  }}
                  className="p-2.5 rounded-chip bg-graphite/40 hover:bg-graphite border border-gunmetal hover:border-signal text-left transition"
                >
                  <div className="text-xs font-medium text-white truncate">{lm.label}</div>
                  <div className="text-[10px] text-fog">Floor {lm.floor}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
