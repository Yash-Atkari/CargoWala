'use client';
import React from 'react';
import { PlacedPackage } from '@/lib/loadingOptimizer';
import { MockPackage } from '@/lib/mockData';
import { Package, AlertTriangle, CheckCircle2, Info, Trash2, ChevronRight } from 'lucide-react';

interface PackageListPanelProps {
  unplacedPackages: MockPackage[];
  placedPackages: PlacedPackage[];
  selectedPackageId: string | null;
  onSelectPackage: (id: string | null) => void;
  onPlacePackage: (pkg: MockPackage) => void;
  onRemovePackage: (id: string) => void;
  onHighlightPackage: (id: string | null) => void;
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
}: PackageListPanelProps) {
  const [activeTab, setActiveTab] = React.useState<'unplaced' | 'placed'>('unplaced');

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('unplaced')}
          className={`flex-1 py-2.5 text-xs font-600 transition-colors ${
            activeTab === 'unplaced'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Queue ({unplacedPackages.length})
        </button>
        <button
          onClick={() => setActiveTab('placed')}
          className={`flex-1 py-2.5 text-xs font-600 transition-colors ${
            activeTab === 'placed'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Placed ({placedPackages.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {activeTab === 'unplaced' && (
          <>
            {unplacedPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={32} className="text-positive mb-2" />
                <p className="text-xs font-600 text-foreground">All packages placed!</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Review the 3D view and confirm loading.
                </p>
              </div>
            ) : (
              unplacedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`card-elevated rounded-lg p-2.5 border transition-all cursor-pointer ${
                    selectedPackageId === pkg.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() => onSelectPackage(selectedPackageId === pkg.id ? null : pkg.id)}
                  onMouseEnter={() => onHighlightPackage(pkg.id)}
                  onMouseLeave={() => onHighlightPackage(null)}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-600 text-foreground truncate">{pkg.name}</p>
                      <p className="text-[9px] text-muted-foreground">{pkg.digitalId}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] text-muted-foreground">
                        #{pkg.deliverySequence}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <FragilityBadge level={pkg.fragilityLevel} />
                    <PriorityBadge priority={pkg.priority} />
                  </div>

                  <div className="grid grid-cols-3 gap-1 mb-2 text-[9px] text-muted-foreground">
                    <span>
                      {pkg.length}×{pkg.width}×{pkg.height}cm
                    </span>
                    <span>{pkg.weight}kg</span>
                    <span className="truncate">{pkg.destination}</span>
                  </div>

                  {pkg.riskLevel === 'HIGH' && (
                    <div className="flex items-center gap-1 mb-1.5 p-1.5 bg-negative/10 rounded border border-negative/20">
                      <AlertTriangle size={10} className="text-negative flex-shrink-0" />
                      <span className="text-[9px] text-negative">
                        High damage risk ({pkg.riskScore}/100)
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlacePackage(pkg);
                    }}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-600 transition-colors"
                  >
                    <ChevronRight size={11} />
                    Place in Truck
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'placed' && (
          <>
            {placedPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package size={32} className="text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No packages placed yet.</p>
              </div>
            ) : (
              placedPackages.map((p) => (
                <div
                  key={p.package.id}
                  className={`card-elevated rounded-lg p-2.5 border transition-all cursor-pointer ${
                    selectedPackageId === p.package.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() =>
                    onSelectPackage(selectedPackageId === p.package.id ? null : p.package.id)
                  }
                  onMouseEnter={() => onHighlightPackage(p.package.id)}
                  onMouseLeave={() => onHighlightPackage(null)}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-600 text-foreground truncate">
                        {p.package.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Pos: ({Math.round(p.position.x)}, {Math.round(p.position.y)},{' '}
                        {Math.round(p.position.z)})cm
                      </p>
                    </div>
                    <div
                      className={`status-badge text-[9px] ${
                        p.damageRisk > 60
                          ? 'risk-high'
                          : p.damageRisk > 30
                            ? 'risk-medium'
                            : 'risk-low'
                      }`}
                    >
                      Risk {p.damageRisk}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <FragilityBadge level={p.package.fragilityLevel} />
                    <span className="text-[9px] text-muted-foreground">{p.package.weight}kg</span>
                    {p.position.rotationY === 90 && (
                      <span className="text-[9px] text-info bg-info/10 px-1 rounded">
                        Rotated 90°
                      </span>
                    )}
                  </div>

                  {p.damageReasons
                    .filter((r) => !r.includes('Low risk'))
                    .map((reason, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1 mb-1 p-1.5 bg-warning/10 rounded border border-warning/20"
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
                    className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-negative/10 hover:bg-negative/20 text-negative text-[10px] font-600 transition-colors mt-1"
                  >
                    <Trash2 size={10} />
                    Remove
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
