'use client';
import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X, Box, Eye, Layers, Palette, Compass, Scale, ShieldAlert, Sparkles } from 'lucide-react';
import { Truck, LoadingPackage } from '@/lib/types';
import { PlacedPackage, ColorMode, autoOptimize } from '@/lib/loadingOptimizer';

const TruckViewer3D = dynamic(
  () => import('@/app/load-planner/components/TruckViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[450px] flex items-center justify-center bg-[#0B132B]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading 3D Container Engine...</p>
        </div>
      </div>
    ),
  }
);

interface Loader3DViewModalProps {
  assignedTruck: Truck;
  packages: LoadingPackage[];
  selectedPackageId?: string | null;
  onClose: () => void;
  onPackageSelect?: (pkgId: string) => void;
}

export default function Loader3DViewModal({
  assignedTruck,
  packages,
  selectedPackageId: initialSelectedId = null,
  onClose,
  onPackageSelect,
}: Loader3DViewModalProps) {
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(initialSelectedId);
  const [colorMode, setColorMode] = useState<ColorMode>('STOP');
  const [showCoG, setShowCoG] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Map packages to PlacedPackage objects
  const placedPackages: PlacedPackage[] = useMemo(() => {
    // If packages already have positions stored in database
    const hasPositions = packages.some((p) => p.positionX !== null && p.positionX !== undefined);

    if (hasPositions) {
      return packages.map((pkg) => ({
        package: pkg,
        position: {
          x: pkg.positionX ?? 0,
          y: pkg.positionY ?? 0,
          z: pkg.positionZ ?? 0,
          rotationY: pkg.rotationY ?? 0,
        },
        isSelected: pkg.id === selectedPkgId,
        isHighlighted: !pkg.isLoaded,
        damageRisk: pkg.riskScore || 0,
        damageReasons: [],
        loadingOrder: pkg.loadingOrder || 1,
      }));
    }

    // Otherwise, generate real-time optimized 3D layout on the fly
    const computed = autoOptimize(packages, assignedTruck, 'BALANCED');
    return computed.map((p) => ({
      ...p,
      isSelected: p.package.id === selectedPkgId,
      isHighlighted: !p.package.isLoaded,
    }));
  }, [packages, assignedTruck, selectedPkgId]);

  const activePlaced = useMemo(() => {
    return placedPackages.find((p) => p.package.id === selectedPkgId) || null;
  }, [placedPackages, selectedPkgId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Box size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>3D Cargo Placement Viewer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
                  {assignedTruck.registrationNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspect 3D trailer coordinates and find exact physical placement inside the cargo bay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setColorMode('STOP')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  colorMode === 'STOP' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                By Stop
              </button>
              <button
                onClick={() => setColorMode('FRAGILITY')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  colorMode === 'FRAGILITY' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Fragility
              </button>
              <button
                onClick={() => setColorMode('RISK_HEATMAP')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  colorMode === 'RISK_HEATMAP' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Risk Heatmap
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3D Canvas Viewport */}
        <div className="flex-1 relative bg-[#070D1E] overflow-hidden">
          <TruckViewer3D
            truck={assignedTruck}
            placedPackages={placedPackages}
            selectedPackageId={selectedPkgId}
            highlightedPackageId={null}
            colorMode={colorMode}
            showLabels={showLabels}
            showCoG={showCoG}
            onSelectPackage={(pkgId: string | null) => {
              setSelectedPkgId(pkgId);
              if (pkgId) onPackageSelect?.(pkgId);
            }}
          />

          {/* Floating 3D Controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={() => setShowCoG((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg ${
                showCoG
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400'
              }`}
            >
              <Compass size={13} />
              <span>CoG Target</span>
            </button>
            <button
              onClick={() => setShowLabels((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg ${
                showLabels
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400'
              }`}
            >
              <Eye size={13} />
              <span>Labels</span>
            </button>
          </div>

          {/* Selected Package Inspector Card */}
          {activePlaced && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md p-3.5 bg-slate-900/90 border border-slate-700 rounded-2xl backdrop-blur-md shadow-2xl text-xs space-y-2 pointer-events-auto animate-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-primary font-bold">
                    {activePlaced.package.digitalId}
                  </span>
                  <h4 className="font-bold text-white text-sm">
                    {activePlaced.package.name}
                  </h4>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activePlaced.package.isLoaded
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {activePlaced.package.isLoaded ? 'Loaded' : 'Queued'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Position:</span>
                  <strong className="font-mono text-cyan-400">
                    X:{Math.round(activePlaced.position.x)} Y:{Math.round(activePlaced.position.y)} Z:{Math.round(activePlaced.position.z)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Loading Step:</span>
                  <strong className="text-primary font-bold">
                    #{activePlaced.loadingOrder || 1}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Delivery Stop:</span>
                  <strong className="text-white">
                    Stop #{activePlaced.package.deliverySequence || 1}
                  </strong>
                </div>
              </div>

              {activePlaced.package.stackingNote && (
                <p className="text-[11px] text-amber-300 italic">
                  ⚠ {activePlaced.package.stackingNote}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0F172A] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Trailer:{' '}
              <strong className="text-white">
                {assignedTruck.length}×{assignedTruck.width}×{assignedTruck.height}cm
              </strong>
            </span>
            <span>·</span>
            <span>
              Payload:{' '}
              <strong className="text-white">{assignedTruck.maxWeight?.toLocaleString()}kg</strong>
            </span>
            <span>·</span>
            <span className="text-primary font-semibold">
              {placedPackages.length} packages positioned
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Close 3D View
          </button>
        </div>
      </div>
    </div>
  );
}
