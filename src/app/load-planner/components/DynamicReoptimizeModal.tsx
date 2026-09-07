'use client';
import React, { useState } from 'react';
import { PlacedPackage, ReoptimizationDiff } from '@/lib/loadingOptimizer';
import { Truck, Package } from '@/lib/types';
import {
  RefreshCw,
  PlusCircle,
  Trash2,
  Truck as TruckIcon,
  History,
  Lock,
  Unlock,
  Zap,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package as PackageIcon,
  Sparkles,
} from 'lucide-react';

interface DynamicReoptimizeModalProps {
  truck: Truck;
  placedPackages: PlacedPackage[];
  allPackages: Package[];
  availableTrucks: Truck[];
  onClose: () => void;
  onAddRushPackage: (pkg: Package) => void;
  onCancelPackages: (packageIds: string[]) => void;
  onSwapTruck: (newTruck: Truck) => void;
  onLockToggle: (packageId: string) => void;
  diffHistory: ReoptimizationDiff[];
}

export default function DynamicReoptimizeModal({
  truck,
  placedPackages,
  allPackages,
  availableTrucks,
  onClose,
  onAddRushPackage,
  onCancelPackages,
  onSwapTruck,
  onLockToggle,
  diffHistory,
}: DynamicReoptimizeModalProps) {
  const [activeTab, setActiveTab] = useState<'rush' | 'cancel' | 'truck' | 'history'>('rush');

  // Dynamically compute route stops from current packages or fallback to standard route stops
  const routeStops = React.useMemo(() => {
    const map = new Map<number, string>();

    allPackages.forEach((p) => {
      if (p.deliverySequence && p.destination) {
        map.set(p.deliverySequence, p.destination);
      }
    });

    placedPackages.forEach((p) => {
      if (p.package.deliverySequence && p.package.destination) {
        map.set(p.package.deliverySequence, p.package.destination);
      }
    });

    const stops = Array.from(map.entries())
      .map(([stopNumber, destination]) => ({ stopNumber, destination }))
      .sort((a, b) => a.stopNumber - b.stopNumber);

    if (stops.length === 0) {
      return [
        { stopNumber: 1, destination: 'Express Hub Terminal' },
        { stopNumber: 2, destination: 'Regional Distribution Center' },
        { stopNumber: 3, destination: 'Metro Logistics Depot' },
      ];
    }
    return stops;
  }, [allPackages, placedPackages]);

  // New rush order form state
  const [rushName, setRushName] = useState('Medical Priority Kit');
  const [rushLength, setRushLength] = useState(60);
  const [rushWidth, setRushWidth] = useState(50);
  const [rushHeight, setRushHeight] = useState(40);
  const [rushWeight, setRushWeight] = useState(35);
  const [rushFragility, setRushFragility] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'FRAGILE'>('FRAGILE');
  const [rushStop, setRushStop] = useState<number>(() => routeStops[0]?.stopNumber || 1);
  const [rushDestination, setRushDestination] = useState<string>(() => routeStops[0]?.destination || 'Express Hub Terminal');
  const [isCustomDestination, setIsCustomDestination] = useState(false);

  // Sync initial selection when routeStops change if not customized
  React.useEffect(() => {
    if (routeStops.length > 0 && !isCustomDestination) {
      const matched = routeStops.find((s) => s.stopNumber === rushStop);
      if (matched) {
        setRushDestination(matched.destination);
      } else {
        setRushStop(routeStops[0].stopNumber);
        setRushDestination(routeStops[0].destination);
      }
    }
  }, [routeStops, isCustomDestination]);

  // Cancel multi-select state
  const [selectedToCancel, setSelectedToCancel] = useState<string[]>([]);

  const handleAddRushSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPkg: Package = {
      id: `rush-${Date.now()}`,
      digitalId: `CW-2026-RUSH-${Math.floor(100 + Math.random() * 900)}`,
      name: rushName,
      length: Number(rushLength),
      width: Number(rushWidth),
      height: Number(rushHeight),
      weight: Number(rushWeight),
      fragilityLevel: rushFragility,
      destination: rushDestination,
      priority: 'URGENT',
      deliverySequence: Number(rushStop),
      status: 'PENDING',
      isLoaded: false,
      riskScore: 0,
      riskLevel: 'LOW',
    };
    onAddRushPackage(newPkg);
    onClose();
  };

  const handleCancelSubmit = () => {
    if (selectedToCancel.length === 0) return;
    onCancelPackages(selectedToCancel);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <RefreshCw size={20} className="text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Dynamic Load Re-Optimizer
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Feature 6 Engine
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicle: <strong className="text-foreground">{truck.registrationNumber}</strong> · Real-Time Void Compaction & Auto-Pack
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/30 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('rush')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rush'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlusCircle size={13} />
            Add Rush Order
          </button>
          <button
            onClick={() => setActiveTab('cancel')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'cancel'
                ? 'bg-card text-negative shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trash2 size={13} />
            Cancel & Compact
          </button>
          <button
            onClick={() => setActiveTab('truck')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'truck'
                ? 'bg-card text-orange-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TruckIcon size={13} />
            Swap Vehicle
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History size={13} />
            Diff Log ({diffHistory.length})
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: ADD RUSH PARCEL */}
          {activeTab === 'rush' && (
            <form onSubmit={handleAddRushSubmit} className="space-y-4">
              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5">
                <Sparkles size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-normal">
                  Add emergency cargo or a late-dispatch item. The AI Engine will preserve locked cargo and dynamically fit the rush order into the optimal void space.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Cargo Description / Name
                  </label>
                  <input
                    type="text"
                    value={rushName}
                    onChange={(e) => setRushName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      value={rushLength}
                      onChange={(e) => setRushLength(Number(e.target.value))}
                      required
                      min={10}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      value={rushWidth}
                      onChange={(e) => setRushWidth(Number(e.target.value))}
                      required
                      min={10}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={rushHeight}
                      onChange={(e) => setRushHeight(Number(e.target.value))}
                      required
                      min={10}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Gross Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={rushWeight}
                      onChange={(e) => setRushWeight(Number(e.target.value))}
                      required
                      min={1}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Fragility Rating
                    </label>
                    <select
                      value={rushFragility}
                      onChange={(e) => setRushFragility(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="FRAGILE">FRAGILE (Delicate Glass/Electronics)</option>
                      <option value="HIGH">HIGH (Industrial Sensors)</option>
                      <option value="MEDIUM">MEDIUM (Standard Consumer Goods)</option>
                      <option value="LOW">LOW (Durable Hardware)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Delivery Sequence Stop #
                    </label>
                    <input
                      type="number"
                      value={rushStop}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRushStop(val);
                        const matched = routeStops.find((s) => s.stopNumber === val);
                        if (matched && !isCustomDestination) {
                          setRushDestination(matched.destination);
                        }
                      }}
                      required
                      min={1}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Destination (Route Stops)
                    </label>
                    <select
                      value={isCustomDestination ? 'CUSTOM' : `${rushStop}||${rushDestination}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'CUSTOM') {
                          setIsCustomDestination(true);
                        } else {
                          setIsCustomDestination(false);
                          const [stopNumStr, dest] = val.split('||');
                          setRushStop(Number(stopNumStr));
                          setRushDestination(dest);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-medium"
                    >
                      <optgroup label="Stops Between Selected Route">
                        {routeStops.map((s) => (
                          <option
                            key={`route-stop-opt-${s.stopNumber}-${s.destination}`}
                            value={`${s.stopNumber}||${s.destination}`}
                          >
                            Stop #{s.stopNumber} — {s.destination}
                          </option>
                        ))}
                      </optgroup>
                      <option value="CUSTOM">➕ Custom New Stop...</option>
                    </select>
                  </div>
                </div>

                {isCustomDestination && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Custom Destination Name
                    </label>
                    <input
                      type="text"
                      value={rushDestination}
                      onChange={(e) => setRushDestination(e.target.value)}
                      placeholder="Enter custom terminal or city..."
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl gradient-primary text-xs font-bold text-white hover:opacity-90 shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                >
                  <Zap size={14} />
                  Inject Rush Order & Re-Optimize
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CANCEL & AUTO-COMPACT */}
          {activeTab === 'cancel' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-negative/5 rounded-xl border border-negative/20 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-negative flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-normal">
                  Select packages that were cancelled by the customer or failed dock inspection. The engine will remove them and trigger <strong>Gravity Settling & Void Compaction</strong>.
                </p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {placedPackages.map((p) => {
                  const isChecked = selectedToCancel.includes(p.package.id);
                  return (
                    <div
                      key={p.package.id}
                      onClick={() =>
                        setSelectedToCancel((prev) =>
                          isChecked ? prev.filter((id) => id !== p.package.id) : [...prev, p.package.id]
                        )
                      }
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'border-negative bg-negative/10 shadow-sm'
                          : 'border-border bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-red-500 rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{p.package.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {p.package.digitalId} · {p.package.weight}kg · Stop #{p.package.deliverySequence}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLockToggle(p.package.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          p.isLocked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'border-slate-700 text-slate-500 hover:text-white'
                        }`}
                        title={p.isLocked ? 'Package is Locked in Place' : 'Lock Package in Place'}
                      >
                        {p.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubmit}
                  disabled={selectedToCancel.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-negative hover:bg-negative/90 disabled:opacity-40 text-xs font-bold text-white shadow-md shadow-negative/20 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Cancel {selectedToCancel.length} Package(s) & Compact Load
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FLEET VEHICLE CAPACITY SWAP */}
          {activeTab === 'truck' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-orange-500/5 rounded-xl border border-orange-500/20 flex items-start gap-2.5">
                <TruckIcon size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-normal">
                  Substitute the current vehicle with an alternative fleet truck. The engine will recalculate spatial boundaries, axle distributions, and flag any overflow freight.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto scrollbar-thin">
                {availableTrucks.map((t) => {
                  const isCurrent = t.id === truck.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!isCurrent) {
                          onSwapTruck(t);
                          onClose();
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-slate-950/40 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">{t.registrationNumber}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">{t.model}</p>
                      <div className="text-[10px] text-slate-300 mt-2 font-mono">
                        {t.length}×{t.width}×{t.height}cm · Max {t.maxWeight}kg
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DIFF HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-start gap-2.5">
                <History size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-normal">
                  <strong className="text-white block font-semibold mb-0.5">About the Dynamic Diff Log</strong>
                  The Diff Log tracks real-time spatial mutations (adding rush orders, cancelling freight, or swapping vehicles). It logs cargo relocations, volume/weight utilization deltas ($\Delta\%$), and Center-of-Gravity (CoG) shifts.
                </div>
              </div>

              {diffHistory.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-slate-500 space-y-2">
                  <History size={28} className="mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">
                    No dynamic mutations recorded for this session yet.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Inject a rush parcel, cancel packages, or swap fleet vehicles to generate live 3D re-optimization spatial diff logs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto scrollbar-thin">
                  {diffHistory.map((d, i) => (
                    <div
                      key={`diff-${i}`}
                      className="p-3.5 rounded-xl border border-border bg-slate-950/60 space-y-2 hover:border-primary/40 transition-colors shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          Event #{diffHistory.length - i}: {d.eventType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          {d.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-normal font-medium">{d.summaryMessage}</p>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 bg-slate-900/40 p-2 rounded-lg">
                        <div>
                          <span className="text-slate-500 block">Items Relocated</span>
                          <strong className="text-white font-mono text-xs">{d.movedPackagesCount}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Space Delta</span>
                          <strong className={`font-mono text-xs ${d.spaceUtilizationDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {d.spaceUtilizationDelta >= 0 ? '+' : ''}{d.spaceUtilizationDelta}%
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">CoG Shift</span>
                          <strong className="text-amber-400 font-mono text-xs">{d.cogShiftDistanceCm} cm</strong>
                        </div>
                      </div>

                      {d.overflowPackages && d.overflowPackages.length > 0 && (
                        <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                          ⚠️ <strong>{d.overflowPackages.length} package(s) overflowed:</strong> {d.overflowPackages.map(p => p.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
