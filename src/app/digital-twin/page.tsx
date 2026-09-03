'use client';
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Truck, Shipment, Package } from '@/lib/types';
import {
  PlacedPackage,
  ColorMode,
  calculateSpaceMetrics,
  calculateWeightDistribution,
  analyzeVehicleStability,
  analyzeManifestDamageRisk,
  calculateDetailedDamageRisk,
  autoOptimize,
  getStopColor,
} from '@/lib/loadingOptimizer';
import {
  Layers,
  Camera,
  Gauge,
  Scale,
  ShieldAlert,
  Box,
  Eye,
  Sliders,
  Sparkles,
  Maximize2,
  Info,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamic import for 3D viewer (no SSR)
const TruckViewer3D = dynamic(() => import('../load-planner/components/TruckViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0F172A]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading 3D Digital Twin Engine...</p>
      </div>
    </div>
  ),
});

function DigitalTwinInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [placedPackages, setPlacedPackages] = useState<PlacedPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('STOP');
  const [showCoG, setShowCoG] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch fleet and active cargo
  useEffect(() => {
    const fetchTwinData = async () => {
      try {
        setPageLoading(true);
        const [tRes, sRes] = await Promise.all([fetch('/api/trucks'), fetch('/api/shipments')]);
        if (!tRes.ok) throw new Error('Failed to load trucks');
        const trucksData: Truck[] = await tRes.json();
        setTrucks(trucksData);

        const current = trucksData.find((t) => t.status === 'LOADING' || t.status === 'AVAILABLE') || trucksData[0];
        setSelectedTruck(current);

        if (current?.currentShipmentId) {
          const pRes = await fetch(`/api/packages?shipmentId=${current.currentShipmentId}`);
          if (pRes.ok) {
            const pkgs: Package[] = await pRes.json();
            const optimized = autoOptimize(pkgs, current, 'BALANCED');
            setPlacedPackages(optimized);
          }
        }
      } catch (err) {
        console.error('Error fetching digital twin data:', err);
      } finally {
        setPageLoading(false);
      }
    };

    if (isAuthenticated) fetchTwinData();
  }, [isAuthenticated]);

  const metrics = useMemo(() => {
    if (!selectedTruck) return null;
    return calculateSpaceMetrics(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const stability = useMemo(() => {
    if (!selectedTruck) return undefined;
    return analyzeVehicleStability(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const damageReport = useMemo(() => {
    if (!selectedTruck) return undefined;
    return analyzeManifestDamageRisk(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const selectedAnalysis = useMemo(() => {
    if (!selectedPackageId || !selectedTruck) return null;
    const placed = placedPackages.find((p) => p.package.id === selectedPackageId);
    if (!placed) return null;
    return calculateDetailedDamageRisk(placed.package, placed.position, placedPackages, selectedTruck);
  }, [selectedPackageId, placedPackages, selectedTruck]);

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading 3D Digital Twin Engine...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to access 3D Digital Twin.</p>
          <button
            onClick={() => router.replace('/login-screen')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout role={user.role} userName={user.name} userEmail={user.email}>
      <div className="flex flex-col h-full bg-[#0F172A]">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm shadow-primary/20">
              <Box size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground">3D Digital Twin Visualization</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Feature 7
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                High-Fidelity Virtual Twin of Vehicle Cargo & Spatial Physics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Truck Selector */}
            <div className="flex items-center bg-muted border border-border rounded-lg p-1">
              <select
                value={selectedTruck?.id || ''}
                onChange={async (e) => {
                  const t = trucks.find((tr) => tr.id === e.target.value);
                  if (t) {
                    setSelectedTruck(t);
                    if (t.currentShipmentId) {
                      const pRes = await fetch(`/api/packages?shipmentId=${t.currentShipmentId}`);
                      if (pRes.ok) {
                        const pkgs = await pRes.json();
                        setPlacedPackages(autoOptimize(pkgs, t, 'BALANCED'));
                      }
                    }
                  }
                }}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                {trucks.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white text-slate-900">
                    {t.registrationNumber} ({t.model})
                  </option>
                ))}
              </select>
            </div>

            {/* Color Mode Selector */}
            <div className="flex items-center bg-muted border border-border rounded-lg p-1">
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="STOP" className="bg-white text-slate-900">Color by Stop</option>
                <option value="RISK_HEATMAP" className="bg-white text-slate-900">Damage Risk Heatmap</option>
                <option value="FRAGILITY" className="bg-white text-slate-900">Color by Fragility</option>
              </select>
            </div>

            {/* Envelope & CoG toggles */}
            <button
              onClick={() => setShowEnvelope((p) => !p)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showEnvelope
                  ? 'bg-positive-bg border-positive/30 text-positive'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle Safe Stability Envelope"
            >
              <Box size={14} />
            </button>

            <button
              onClick={() => setShowCoG((p) => !p)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showCoG
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle Center of Gravity Marker"
            >
              <Scale size={14} />
            </button>
          </div>
        </div>

        {/* Center 3D Digital Twin Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#0F172A]">
          {selectedTruck && (
            <TruckViewer3D
              truck={selectedTruck}
              placedPackages={placedPackages}
              onSelectPackage={setSelectedPackageId}
              selectedPackageId={selectedPackageId}
              highlightedPackageId={null}
              showLabels={true}
              showCoG={showCoG}
              showStabilityEnvelope={showEnvelope}
              colorMode={colorMode}
            />
          )}

          {/* Telemetry HUD (Bottom Overlay) */}
          {metrics && stability && damageReport && (
            <div className="absolute bottom-4 inset-x-4 flex justify-between items-end gap-3 pointer-events-none">
              <div className="flex gap-2 flex-wrap pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-xl">
                  <span className="text-[10px] text-slate-500 block font-bold">Volume Fit</span>
                  <div className="text-sm font-bold text-primary font-mono mt-0.5">
                    {metrics.spaceUtilization}% ({Math.round(metrics.usedVolume / 1000000)}m³)
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-xl">
                  <span className="text-[10px] text-slate-500 block font-bold">Payload Weight</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {metrics.totalWeight}kg / {metrics.maxWeight}kg
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-xl">
                  <span className="text-[10px] text-slate-500 block font-bold">Rollover SRT</span>
                  <div className="text-sm font-bold text-positive font-mono mt-0.5">
                    {stability.staticRolloverThreshold}g ({stability.rolloverRiskLevel})
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-xl">
                  <span className="text-[10px] text-slate-500 block font-bold">Avg Damage Risk</span>
                  <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                    {damageReport.averageRiskScore}% ({damageReport.overallRiskLevel})
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] text-slate-300">
                Left-click: Rotate · Right-click: Pan · Scroll: Zoom
              </div>
            </div>
          )}

          {/* Selected Package Inspector Card */}
          {selectedAnalysis && (
            <div className="absolute top-4 left-4 max-w-xs bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-2xl z-20 space-y-2.5 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{selectedAnalysis.packageName}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedAnalysis.digitalId}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  Risk: {selectedAnalysis.riskScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>Weight: <strong>{selectedAnalysis.weight}kg</strong></div>
                <div>Pressure: <strong>{selectedAnalysis.compressionPressure} kg/cm²</strong></div>
                <div>Crush Risk: <strong>{selectedAnalysis.crushRisk}%</strong></div>
                <div>Fragility: <strong>{selectedAnalysis.fragilityLevel}</strong></div>
              </div>

              <p className="text-[10px] text-slate-600 leading-normal">
                {selectedAnalysis.contributingFactors[0]}
              </p>

              <button
                onClick={() => setSelectedPackageId(null)}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-900 pt-1 border-t border-slate-100"
              >
                Dismiss Inspector
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DigitalTwinPage() {
  return (
    <AuthProvider>
      <DigitalTwinInner />
    </AuthProvider>
  );
}
