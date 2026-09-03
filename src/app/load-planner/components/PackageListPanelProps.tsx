'use client';
import React, { useState, useMemo } from 'react';
import { PlacedPackage, getStopColor } from '@/lib/loadingOptimizer';
import { Package as PackageType } from '@/lib/types';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  ChevronRight,
  MapPin,
  Filter,
  Lock,
  Unlock,
} from 'lucide-react';

interface PackageListPanelProps {
  unplacedPackages: PackageType[];
  placedPackages: PlacedPackage[];
  selectedPackageId: string | null;
  onSelectPackage: (id: string | null) => void;
  onPlacePackage: (pkg: PackageType) => void;
  onRemovePackage: (id: string) => void;
  onHighlightPackage: (id: string | null) => void;
  onLockToggle?: (id: string) => void;
}

function FragilityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    LOW: 'fragility-low',
    MEDIUM: 'fragility-medium',
    HIGH: 'fragility-high',
    FRAGILE: 'fragility-fragile',
  };
  return (
    <span className={`status-badge text-[9px] ${map[level] || 'bg-muted text-muted-foreground'}`}>
      {level}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    URGENT: 'bg-negative/10 text-negative',
    HIGH: 'bg-warning/10 text-warning',
    NORMAL: 'bg-muted text-muted-foreground',
    LOW: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`status-badge text-[9px] ${map[priority] || 'bg-muted text-muted-foreground'}`}
    >
      {priority}
    </span>
  );
}

export default function PackageListPanel({
  unplacedPackages,
  placedPackages,
  selectedPackageId,
  onSelectPackage,
  onPlacePackage,
  onRemovePackage,
  onHighlightPackage,
  onLockToggle,
}: PackageListPanelProps) {
  const [activeTab, setActiveTab] = useState<'unplaced' | 'placed'>('unplaced');
  const [selectedStopFilter, setSelectedStopFilter] = useState<number | 'ALL'>('ALL');

  const availableStops = useMemo(() => {
    const all = [...unplacedPackages, ...placedPackages.map((p) => p.package)];
    const stops = new Set<number>();
    all.forEach((p) => stops.add(p.deliverySequence || 1));
    return Array.from(stops).sort((a, b) => a - b);
  }, [unplacedPackages, placedPackages]);

  const filteredUnplaced = useMemo(() => {
    if (selectedStopFilter === 'ALL') return unplacedPackages;
    return unplacedPackages.filter((p) => (p.deliverySequence || 1) === selectedStopFilter);
  }, [unplacedPackages, selectedStopFilter]);

  const filteredPlaced = useMemo(() => {
    if (selectedStopFilter === 'ALL') return placedPackages;
    return placedPackages.filter((p) => (p.package.deliverySequence || 1) === selectedStopFilter);
  }, [placedPackages, selectedStopFilter]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/20">
        <button
          onClick={() => setActiveTab('unplaced')}
          className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'unplaced'
              ? 'text-primary border-b-2 border-primary bg-card/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Queue</span>
          <span className="text-[10px] bg-primary/10 px-1.5 py-0.2 rounded-full">
            {unplacedPackages.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('placed')}
          className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'placed'
              ? 'text-primary border-b-2 border-primary bg-card/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Placed</span>
          <span className="text-[10px] bg-primary/10 px-1.5 py-0.2 rounded-full">
            {placedPackages.length}
          </span>
        </button>
      </div>

      {/* Stop Filter Selector */}
      {availableStops.length > 1 && (
        <div className="px-2.5 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5">
          <Filter size={11} className="text-muted-foreground flex-shrink-0" />
          <select
            value={selectedStopFilter}
            onChange={(e) =>
              setSelectedStopFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))
            }
            className="bg-transparent text-[11px] font-semibold text-foreground focus:outline-none cursor-pointer w-full"
          >
            <option value="ALL" className="bg-slate-900 text-white">
              All Route Stops ({availableStops.length})
            </option>
            {availableStops.map((stop) => (
              <option key={`stop-opt-${stop}`} value={stop} className="bg-slate-900 text-white">
                Stop #{stop} Destination
              </option>
            ))}
          </select>
        </div>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
        {activeTab === 'unplaced' && (
          <>
            {filteredUnplaced.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={28} className="text-positive mb-2 opacity-80" />
                <p className="text-xs font-bold text-foreground">No unplaced items in queue</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  All packages staged for this stop selection.
                </p>
              </div>
            ) : (
              filteredUnplaced.map((pkg) => {
                const stopSeq = pkg.deliverySequence || 1;
                const stopColor = getStopColor(stopSeq);

                return (
                  <div
                    key={pkg.id}
                    className={`card-elevated rounded-xl p-2.5 border transition-all cursor-pointer ${
                      selectedPackageId === pkg.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-slate-700 bg-slate-950/30'
                    }`}
                    onClick={() => onSelectPackage(selectedPackageId === pkg.id ? null : pkg.id)}
                    onMouseEnter={() => onHighlightPackage(pkg.id)}
                    onMouseLeave={() => onHighlightPackage(null)}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{pkg.name}</p>
                        <p className="text-[9px] font-mono text-muted-foreground">{pkg.digitalId}</p>
                      </div>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0 shadow-sm"
                        style={{ background: stopColor }}
                      >
                        Stop #{stopSeq}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                      <FragilityBadge level={pkg.fragilityLevel} />
                      <PriorityBadge priority={pkg.priority} />
                    </div>

                    <div className="grid grid-cols-3 gap-1 mb-2 text-[9px] text-muted-foreground">
                      <span>
                        {pkg.length}×{pkg.width}×{pkg.height}cm
                      </span>
                      <span className="font-bold text-foreground">{pkg.weight}kg</span>
                      <span className="truncate flex items-center gap-0.5">
                        <MapPin size={9} className="text-primary flex-shrink-0" />
                        {pkg.destination}
                      </span>
                    </div>

                    {pkg.riskLevel === 'HIGH' && (
                      <div className="flex items-center gap-1 mb-1.5 p-1.5 bg-negative/10 rounded border border-negative/20">
                        <AlertTriangle size={10} className="text-negative flex-shrink-0" />
                        <span className="text-[9px] text-negative font-medium">
                          High damage risk ({pkg.riskScore}/100)
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlacePackage(pkg);
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-colors"
                    >
                      <ChevronRight size={11} />
                      Place into Vehicle
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === 'placed' && (
          <>
            {filteredPlaced.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package size={28} className="text-muted-foreground mb-2 opacity-50" />
                <p className="text-xs font-semibold text-muted-foreground">No placed packages</p>
              </div>
            ) : (
              filteredPlaced.map((p) => {
                const stopSeq = p.package.deliverySequence || 1;
                const stopColor = getStopColor(stopSeq);
                const isBlocked = p.isBlockedForUnloading;
                const isLocked = p.isLocked;

                return (
                  <div
                    key={p.package.id}
                    className={`card-elevated rounded-xl p-2.5 border transition-all cursor-pointer ${
                      selectedPackageId === p.package.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : isLocked
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : isBlocked
                            ? 'border-negative/40 bg-negative/5'
                            : 'border-border hover:border-slate-700 bg-slate-950/30'
                    }`}
                    onClick={() =>
                      onSelectPackage(selectedPackageId === p.package.id ? null : p.package.id)
                    }
                    onMouseEnter={() => onHighlightPackage(p.package.id)}
                    onMouseLeave={() => onHighlightPackage(null)}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isLocked && <Lock size={10} className="text-amber-400 flex-shrink-0" />}
                          <p className="text-xs font-bold text-foreground truncate">
                            {p.package.name}
                          </p>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          Pos: ({Math.round(p.position.x)}, {Math.round(p.position.y)},{' '}
                          {Math.round(p.position.z)})cm
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {onLockToggle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLockToggle(p.package.id);
                            }}
                            title={isLocked ? 'Unlock package position' : 'Lock/Pin package position'}
                            className={`p-1 rounded transition-colors ${
                              isLocked
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                          </button>
                        )}
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                          style={{ background: stopColor }}
                        >
                          Stop #{stopSeq}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                      <FragilityBadge level={p.package.fragilityLevel} />
                      <span className="text-[9px] font-bold text-foreground">
                        {p.package.weight}kg
                      </span>
                      {p.position.rotationY === 90 && (
                        <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1 rounded font-semibold">
                          Rot 90°
                        </span>
                      )}
                      {isLocked && (
                        <span className="text-[9px] text-amber-400 bg-amber-500/15 px-1 rounded font-bold">
                          Pinned
                        </span>
                      )}
                    </div>

                    {p.damageReasons
                      .filter((r) => !r.includes('Low risk'))
                      .map((reason, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1 mb-1 p-1 bg-warning/10 rounded border border-warning/20"
                        >
                          <Info size={9} className="text-warning flex-shrink-0 mt-0.5" />
                          <span className="text-[9px] text-warning leading-tight">{reason}</span>
                        </div>
                      ))}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePackage(p.package.id);
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-negative/10 hover:bg-negative/20 text-negative text-[10px] font-bold transition-colors mt-1"
                    >
                      <Trash2 size={11} />
                      Remove from Vehicle
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
