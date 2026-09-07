'use client';
import React, { useState, useEffect } from 'react';
import { Truck, LoadingPackage } from '@/lib/types';
import {
  QrCode,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
  ShieldAlert,
  Camera,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerModalProps {
  assignedTruck: Truck;
  packages: LoadingPackage[];
  onClose: () => void;
  onScanVerify: (packageId: string) => Promise<boolean>;
}

interface ScanLogEntry {
  digitalId: string;
  packageName: string;
  expectedOrder: number;
  isOrderCompliant: boolean;
  timestamp: string;
  status: 'SUCCESS' | 'OUT_OF_ORDER' | 'NOT_FOUND' | 'ALREADY_LOADED';
}

export default function BarcodeScannerModal({
  assignedTruck,
  packages,
  onClose,
  onScanVerify,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeWarning, setActiveWarning] = useState<{
    pkg: LoadingPackage;
    reason: string;
  } | null>(null);

  // Identify next expected loading step
  const unloadedSorted = [...packages]
    .filter((p) => !p.isLoaded)
    .sort((a, b) => (a.loadingOrder || 0) - (b.loadingOrder || 0));

  const nextExpected = unloadedSorted[0] || null;

  const playBeep = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + (isSuccess ? 0.15 : 0.35));
    } catch (e) {
      // AudioContext unavailable
    }
  };

  const processScan = async (scannedId: string) => {
    if (isProcessing) return;
    const cleanId = scannedId.trim().toUpperCase();
    if (!cleanId) return;

    setIsProcessing(true);
    try {
      // Find package by ID, digital ID, or name
      const match = packages.find(
        (p) =>
          p.id.toUpperCase() === cleanId ||
          p.digitalId.toUpperCase() === cleanId ||
          p.name.toUpperCase().includes(cleanId)
      );

      const now = new Date().toLocaleTimeString();

      if (!match) {
        playBeep(false);
        toast.error(`Unknown barcode / QR "${cleanId}" — package not in vehicle manifest.`);
        setScanHistory((prev) => [
          {
            digitalId: cleanId,
            packageName: 'Unknown Package',
            expectedOrder: 0,
            isOrderCompliant: false,
            timestamp: now,
            status: 'NOT_FOUND',
          },
          ...prev,
        ]);
        return;
      }

      if (match.isLoaded) {
        playBeep(false);
        toast.warning(`Package "${match.name}" (${match.digitalId}) is already marked as LOADED.`);
        setScanHistory((prev) => [
          {
            digitalId: match.digitalId,
            packageName: match.name,
            expectedOrder: match.loadingOrder || 0,
            isOrderCompliant: true,
            timestamp: now,
            status: 'ALREADY_LOADED',
          },
          ...prev,
        ]);
        return;
      }

      // Check loading order compliance
      const isCompliant = !nextExpected || match.id === nextExpected.id;

      if (!isCompliant) {
        playBeep(false);
        setActiveWarning({
          pkg: match,
          reason: `Loading Sequence Violation: Plan requires Step #${nextExpected?.loadingOrder} ("${nextExpected?.name}") before Step #${match.loadingOrder} ("${match.name}").`,
        });
        return;
      }

      // Execute verification
      await executeVerifiedLoad(match, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeVerifiedLoad = async (pkg: LoadingPackage, isCompliant: boolean) => {
    setIsProcessing(true);
    try {
      const now = new Date().toLocaleTimeString();
      const success = await onScanVerify(pkg.id);

      if (success) {
        playBeep(true);
        toast.success(`Verified & Loaded "${pkg.name}" (${pkg.digitalId})!`);
        setScanHistory((prev) => [
          {
            digitalId: pkg.digitalId,
            packageName: pkg.name,
            expectedOrder: pkg.loadingOrder || 0,
            isOrderCompliant: isCompliant,
            timestamp: now,
            status: isCompliant ? 'SUCCESS' : 'OUT_OF_ORDER',
          },
          ...prev,
        ]);
      }
      setActiveWarning(null);
      setManualCode('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Package Scanner & Verification
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Feature 8
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bay Station: <strong className="text-foreground">{assignedTruck.registrationNumber}</strong> · Barcode / QR Stream
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled((p) => !p)}
              title={soundEnabled ? 'Mute Beep Feedback' : 'Enable Audio Feedback'}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Virtual Camera Viewfinder */}
          <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-inner">
            {/* Camera corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary" />

            {/* Laser scanning beam */}
            <div className="absolute inset-x-8 h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse" />

            <div className="text-center z-10 space-y-1">
              <Camera size={28} className="text-slate-600 mx-auto animate-bounce" />
              <p className="text-xs font-bold text-slate-300">Live Optical Viewfinder Active</p>
              <p className="text-[10px] text-slate-500">Align barcode or QR code within the target frame</p>
            </div>

            {/* Next Expected Step Badge */}
            {nextExpected && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs max-w-[85%] shadow-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    #{nextExpected.loadingOrder}
                  </span>
                  <span className="text-white font-semibold truncate">
                    {nextExpected.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                  {nextExpected.digitalId}
                </span>
              </div>
            )}
          </div>

          {/* Out-of-Order Warning Alert */}
          {activeWarning && (
            <div className="p-4 rounded-xl bg-negative/10 border border-negative/30 space-y-2 animate-slide-up">
              <div className="flex items-start gap-2">
                <ShieldAlert size={18} className="text-negative flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-negative">Loading Plan Sequence Discrepancy</h4>
                  <p className="text-xs text-slate-300 leading-normal mt-1">{activeWarning.reason}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-negative/20">
                <button
                  onClick={() => setActiveWarning(null)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Reject & Scan Step #{nextExpected?.loadingOrder}
                </button>
                <button
                  onClick={() => executeVerifiedLoad(activeWarning.pkg, false)}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 rounded-lg bg-negative hover:bg-negative/90 text-xs font-bold text-white shadow-md shadow-negative/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-white" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Override & Load Anyway</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Manual Input & Quick Barcode Tester */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Digital ID / Barcode Scanner Input
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. CW-2026-PKG-001 or scan code..."
                disabled={isProcessing}
                onKeyDown={(e) => e.key === 'Enter' && processScan(manualCode)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono disabled:opacity-50"
              />
              <button
                onClick={() => processScan(manualCode)}
                disabled={!manualCode.trim() || isProcessing}
                className="px-4 py-2 rounded-xl gradient-primary text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 min-w-[80px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </button>
            </div>
          </div>

          {/* Scan Log History */}
          <div className="space-y-2 border-t border-border pt-4">
            <span className="text-xs font-bold text-foreground block">
              Dock Station Verification Audit ({scanHistory.length})
            </span>
            {scanHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No scans recorded in this loading session yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                {scanHistory.map((h, i) => (
                  <div
                    key={`scan-${i}`}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      {h.status === 'SUCCESS' ? (
                        <CheckCircle2 size={13} className="text-positive" />
                      ) : (
                        <AlertTriangle size={13} className="text-negative" />
                      )}
                      <span className="font-bold text-white">{h.packageName}</span>
                      <span className="text-[9px] font-mono text-slate-400">{h.digitalId}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{h.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
