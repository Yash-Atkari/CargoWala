'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  ScanLine,
  Camera,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Package as PackageIcon,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Package } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ScanPackageModalProps {
  existingPackages: Package[];
  onClose: () => void;
  onPackageRetrieved?: (pkg: Package) => void;
  onPackageAdded?: (pkg: Package) => void;
  onPackageDeleted?: (packageId: string) => void;
}

interface ScanResult {
  code: string;
  type: 'RETRIEVED' | 'CREATED' | 'NOT_FOUND' | 'ERROR';
  message: string;
  pkg?: Package;
  timestamp: string;
}

export default function ScanPackageModal({
  existingPackages,
  onClose,
  onPackageRetrieved,
  onPackageAdded,
  onPackageDeleted,
}: ScanPackageModalProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [activePackage, setActivePackage] = useState<Package | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<Package | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + (isSuccess ? 0.15 : 0.35));
    } catch {
      // AudioContext unavailable
    }
  };

  const handleProcessCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setIsScanning(true);
    const now = new Date().toLocaleTimeString();

    try {
      // 1. Check if the scanned string is JSON format
      if (code.startsWith('{') && code.endsWith('}')) {
        try {
          const parsed = JSON.parse(code);
          const res = await fetch('/api/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          });
          const data = await res.json();
          if (res.ok && data.package) {
            playBeep(true);
            toast.success(`QR Package "${data.package.name}" registered in warehouse!`);
            setActivePackage(data.package);
            setScanHistory((prev) => [
              {
                code: data.package.digitalId,
                type: 'CREATED',
                message: `Created from QR payload: ${data.package.name} (${data.package.weight}kg)`,
                pkg: data.package,
                timestamp: now,
              },
              ...prev,
            ]);
            onPackageAdded?.(data.package);
            setBarcodeInput('');
            return;
          }
        } catch {
          // not valid JSON, proceed to standard lookup
        }
      }

      // 2. Lookup in existing packages list
      const cleanUpper = code.toUpperCase();
      let matched = existingPackages.find(
        (p) =>
          p.id.toUpperCase() === cleanUpper ||
          p.digitalId.toUpperCase() === cleanUpper ||
          (p.name && p.name.toUpperCase().includes(cleanUpper))
      );

      // If not in local array, check database API
      if (!matched) {
        const fetchRes = await fetch(`/api/packages?id=${encodeURIComponent(code)}`);
        if (fetchRes.ok) {
          const fetchedPkg = await fetchRes.json();
          if (fetchedPkg && fetchedPkg.id) {
            matched = fetchedPkg;
          }
        }
      }

      if (matched) {
        playBeep(true);
        setActivePackage(matched);
        toast.success(`Package retrieved: "${matched.name}" (${matched.digitalId})`);
        setScanHistory((prev) => [
          {
            code: matched!.digitalId,
            type: 'RETRIEVED',
            message: `Retrieved "${matched!.name}" · Status: ${matched!.status}`,
            pkg: matched,
            timestamp: now,
          },
          ...prev,
        ]);
        onPackageRetrieved?.(matched);
      } else {
        playBeep(false);
        toast.error(`Barcode/QR "${code}" not found in system.`);
        setScanHistory((prev) => [
          {
            code,
            type: 'NOT_FOUND',
            message: `Barcode not found. Use "Add Package" to register this barcode.`,
            timestamp: now,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      playBeep(false);
      toast.error(err.message || 'Scan lookup error');
      setScanHistory((prev) => [
        {
          code,
          type: 'ERROR',
          message: err.message || 'Scan lookup failed',
          timestamp: now,
        },
        ...prev,
      ]);
    } finally {
      setIsScanning(false);
      setBarcodeInput('');
    }
  };

  // Mock barcode triggers for instant testing
  const triggerSampleScan = (sampleCode: string) => {
    setBarcodeInput(sampleCode);
    handleProcessCode(sampleCode);
  };

  const handleDeletePackage = (pkg: Package) => {
    setDeletingPackage(pkg);
  };

  const handleRemoveHistoryItem = (index: number) => {
    setScanHistory((prev) => prev.filter((_, idx) => idx !== index));
    toast.info('Scan log entry removed');
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <QrCode size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Scan Package Barcode / QR</h2>
              <p className="text-xs text-muted-foreground">
                Point handheld scanner, mobile camera, or paste package digital code
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={soundEnabled ? 'Mute scanner sound' : 'Enable scanner sound'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          {/* Scanner Viewport / Input */}
          <div className="p-4 bg-muted/30 border border-border rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/40 flex items-center justify-center text-primary mb-3 relative">
              <ScanLine size={32} className="animate-pulse" />
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-primary animate-bounce opacity-80" />
            </div>

            <p className="text-xs font-bold text-foreground mb-1">
              Ready for Scanner Input
            </p>
            <p className="text-[11px] text-muted-foreground mb-4 max-w-sm">
              Supports continuous scanning from physical laser scanners, JSON QR codes, or manual keyboard entry.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessCode(barcodeInput);
              }}
              className="w-full max-w-md flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or type barcode (e.g. CW-2026-PKG-001)..."
                disabled={isScanning}
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!barcodeInput.trim() || isScanning}
                className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
              >
                <ArrowRight size={14} />
                <span>Scan</span>
              </button>
            </form>

            {/* Quick Test Samples */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Quick test:</span>
              {(existingPackages.slice(0, 3)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => triggerSampleScan(p.digitalId)}
                  className="px-2 py-0.5 bg-background border border-border hover:border-primary/40 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {p.digitalId}
                </button>
              ))}
              <button
                onClick={() =>
                  triggerSampleScan(
                    JSON.stringify({
                      name: 'Smart Sensor Node',
                      length: 45,
                      width: 35,
                      height: 30,
                      weight: 12.5,
                      fragility: 'HIGH',
                      priority: 'URGENT',
                      destination: 'Pune Distribution Hub',
                    })
                  )
                }
                className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded text-[10px] font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                <Sparkles size={10} />
                <span>Simulate QR JSON</span>
              </button>
            </div>
          </div>

          {/* Active Retrieved Package Card */}
          {activePackage && (
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {activePackage.digitalId}
                    </span>
                    <StatusBadge variant={activePackage.status as any} />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-0.5">
                    {activePackage.name}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground bg-background px-2.5 py-1 rounded-lg border border-border">
                    {activePackage.weight} kg
                  </span>
                  <button
                    onClick={() => handleDeletePackage(activePackage)}
                    className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors border border-destructive/20"
                    title="Delete wrong scanned package from system"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] bg-background/60 p-2 rounded-lg border border-border/50 text-muted-foreground">
                <div>
                  <span className="text-foreground font-semibold">
                    {activePackage.length}×{activePackage.width}×{activePackage.height}
                  </span>{' '}
                  cm
                </div>
                <div>
                  Fragility:{' '}
                  <strong className="text-foreground">{activePackage.fragilityLevel}</strong>
                </div>
                <div>
                  Destination:{' '}
                  <strong className="text-foreground truncate block">
                    {activePackage.destination}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Scan History */}
          <div>
            <span className="text-xs font-bold text-foreground block mb-2">
              Session Scan History ({scanHistory.length})
            </span>
            {scanHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                No items scanned yet in this session.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.type === 'RETRIEVED' || item.type === 'CREATED' ? (
                        <CheckCircle2 size={14} className="text-positive shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="text-destructive shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-mono font-bold text-foreground">{item.code}</span>
                        <p className="text-[11px] text-muted-foreground truncate">{item.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-[10px] text-muted-foreground">
                        {item.timestamp}
                      </span>
                      {item.pkg ? (
                        <button
                          onClick={() => handleDeletePackage(item.pkg!)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete wrong scanned package from system"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveHistoryItem(idx)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Remove scan log entry"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border flex items-center justify-between bg-card">
          <p className="text-[11px] text-muted-foreground">
            Scanned packages are verified against live database.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {deletingPackage && (
        <DeleteConfirmModal
          packageToDelete={deletingPackage}
          onClose={() => setDeletingPackage(null)}
          onConfirmDelete={async (pkgId) => {
            const res = await fetch(`/api/packages?id=${encodeURIComponent(pkgId)}`, {
              method: 'DELETE',
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Failed to delete package');
            }
            toast.success(`Package "${deletingPackage.name}" deleted from system`);
            if (activePackage?.id === pkgId) {
              setActivePackage(null);
            }
            onPackageDeleted?.(pkgId);
            setScanHistory((prev) => prev.filter((item) => item.pkg?.id !== pkgId));
          }}
        />
      )}
    </div>
  );
}
