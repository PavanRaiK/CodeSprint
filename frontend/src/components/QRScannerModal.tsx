import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Camera, Check, AlertCircle } from 'lucide-react';
import { QRCheckpoint } from '../types';
import { CampusAPI } from '../services/api';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRResolved: (checkpoint: QRCheckpoint, floor: number) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onQRResolved
}) => {
  const [checkpoints, setCheckpoints] = useState<QRCheckpoint[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      CampusAPI.getQRCheckpoints().then(data => setCheckpoints(data));
      setErrorMsg('');
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    setIsCameraActive(true);
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error', err);
      setErrorMsg('Camera stream not accessible on this device. Use demo checkpoints below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleResolve = async (code: string) => {
    try {
      const res = await CampusAPI.resolveQR(code);
      onQRResolved(res.checkpoint, res.floor);
      stopCamera();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid QR code.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md rounded-card bg-charcoal border border-gunmetal shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gunmetal">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sharp bg-signal/20 text-signal flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Scan Campus QR</h2>
              <p className="text-[11px] text-fog">Positioning checkpoint reader</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-full text-fog hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded-chip bg-mapred/20 border border-mapred/30 text-mapred text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Camera Viewfinder */}
          {isCameraActive ? (
            <div className="relative rounded-chip overflow-hidden bg-void border border-gunmetal aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-signal/60 rounded-sharp pointer-events-none animate-pulse"></div>
              <button
                onClick={stopCamera}
                className="absolute bottom-2 right-2 px-2.5 py-1 rounded-pill bg-void/80 text-fog text-[10px]"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full py-3 rounded-pill bg-graphite hover:bg-gunmetal border border-steel/30 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Camera className="w-4 h-4 text-signal" />
              <span>Activate Camera Scanner</span>
            </button>
          )}

          {/* Manual QR Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Or Enter QR Code
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="e.g. SAHYADRI_QR_ST2_B"
                className="flex-1 h-9 px-3 rounded-sharp bg-void border border-gunmetal focus:border-signal text-white text-xs outline-none"
              />
              <button
                onClick={() => handleResolve(manualCode)}
                disabled={!manualCode.trim()}
                className="h-9 px-4 rounded-sharp bg-signal disabled:bg-steel text-white text-xs font-semibold transition"
              >
                Resolve
              </button>
            </div>
          </div>

          {/* Quick Demo Checkpoints Selector */}
          <div className="space-y-2 pt-2 border-t border-gunmetal">
            <div className="text-[11px] font-semibold text-ash uppercase tracking-wider">
              Campus Demo Checkpoints (1-Click)
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {checkpoints.map(cp => (
                <div
                  key={cp.id}
                  onClick={() => handleResolve(cp.code)}
                  className="flex items-center justify-between p-2.5 rounded-chip bg-graphite/60 hover:bg-graphite border border-gunmetal/60 hover:border-signal/40 cursor-pointer transition"
                >
                  <div>
                    <div className="text-xs font-medium text-white">{cp.name}</div>
                    <div className="text-[10px] text-fog">{cp.physical_location}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gunmetal text-signal font-semibold">
                    Floor {cp.floor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
