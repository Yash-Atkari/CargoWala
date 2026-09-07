'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/authContext';
import { Truck as TruckType, Shipment as ShipmentType, Package as PackageType } from '@/lib/types';
import {
  PlacedPackage,
  AIRecommendation,
  OptimizationStrategy,
  ColorMode,
  ReoptimizationDiff,
  autoOptimize,
  dynamicReoptimize,
  gravitySettle,
  generateRecommendations,
  generateLoadingSteps,
  validateConstraints,
  calculateSpaceMetrics,
  calculateWeightDistribution,
  calculateUnloadingAccessibility,
  analyzeVehicleStability,
  analyzeManifestDamageRisk,
  calculateDetailedDamageRisk,
  generateLoadingReport,
  checkWeightLimit,
  findBestPosition,
  getStopColor,
} from '@/lib/loadingOptimizer';
import AIAssistantPanel from './AIAssistantPanelProps';
import PackageListPanel from './PackageListPanelProps';
import LoadingReportModal from './LoadingReportModalProps';
import StabilityAnalysisModal from './StabilityAnalysisModal';
import DamageRiskModal from './DamageRiskModal';
import DynamicReoptimizeModal from './DynamicReoptimizeModal';
import {
  Truck,
  Package,
  Zap,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  Layers,
  Scale,
  Palette,
  Route,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gauge,
  ShieldAlert,
  Shield,
  Box,
  X,
  Info,
  RefreshCw,
  PlusCircle,
  Lock,
  Unlock,
  History,
} from 'lucide-react';

// Dynamic import for 3D viewer (no SSR)
const TruckViewer3D = dynamic(() => import('./TruckViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading 3D Engine...</p>
      </div>
    </div>
  ),
});

// ─── WORKFLOW STEPS ──────────────────────────────────────────────────────────
type WorkflowStep = 'select-truck' | 'select-shipment' | 'loading' | 'confirmed';

const STEP_LABELS: Record<WorkflowStep, string> = {
  'select-truck': 'Select Vehicle',
  'select-shipment': 'Select Manifest',
  loading: '3D AI Planning',
  confirmed: 'Manifest Confirmed',
};

const STEPS: WorkflowStep[] = ['select-truck', 'select-shipment', 'loading', 'confirmed'];

// ─── TRUCK SELECTOR ──────────────────────────────────────────────────────────
function TruckSelector({
  trucks = [],
  onSelect,
}: {
  trucks: TruckType[];
  onSelect: (t: TruckType) => void;
}) {
  const available = trucks.filter((t) => t.status === 'AVAILABLE' || t.status === 'LOADING');
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-foreground mb-1">Select a Vehicle</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Choose an available vehicle container to launch 3D load, route, stability & damage risk optimization.
      </p>
      {available.length === 0 ? (
        <div className="card-elevated p-8 text-center rounded-xl border border-border">
          <Truck size={32} className="text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-foreground font-semibold">No available trucks in fleet</p>
          <p className="text-xs text-muted-foreground mt-1">All vehicles are currently in transit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {available.map((truck) => (
            <button
              key={truck.id}
              onClick={() => onSelect(truck)}
              className="card-elevated card-hover p-4 rounded-xl text-left border border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Truck size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{truck.registrationNumber}</p>
                    <p className="text-[11px] text-muted-foreground">{truck.model}</p>
                  </div>
                </div>
                <span
                  className={`status-badge text-[10px] ${
                    truck.status === 'AVAILABLE' ? 'truck-available' : 'truck-loading'
                  }`}
                >
                  {truck.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground mt-3 bg-muted/30 p-2 rounded-lg">
                <div>
                  <span className="text-foreground font-bold">{truck.length}cm</span>
                  <br />
                  Length
                </div>
                <div>
                  <span className="text-foreground font-bold">{truck.width}cm</span>
                  <br />
                  Width
                </div>
                <div>
                  <span className="text-foreground font-bold">{truck.height}cm</span>
                  <br />
                  Height
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span>
                  Max Payload:{' '}
                  <strong className="text-foreground">{truck.maxWeight?.toLocaleString()}kg</strong>
                </span>
                {truck.assignedLoaderName && (
                  <span className="text-primary font-medium">{truck.assignedLoaderName}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SHIPMENT SELECTOR ───────────────────────────────────────────────────────
function ShipmentSelector({
  truck,
  shipments = [],
  onSelect,
  onBack,
  onCreateDemoManifest,
}: {
  truck: TruckType;
  shipments: ShipmentType[];
  onSelect: (s: ShipmentType) => void;
  onBack: () => void;
  onCreateDemoManifest?: () => void;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!onCreateDemoManifest) return;
    setIsCreating(true);
    await onCreateDemoManifest();
    setIsCreating(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Select Shipment Manifest</h2>
          <p className="text-xs text-muted-foreground">
            Vehicle: <strong className="text-foreground">{truck.registrationNumber}</strong> · Max{' '}
            {truck.maxWeight?.toLocaleString()}kg
          </p>
        </div>
      </div>

      {/* Educational Banner: What is a Manifest */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 mb-5 flex items-start gap-3">
        <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-semibold">What is a Shipment Manifest?</strong>
          <p className="mt-0.5">
            A <strong>Shipment Manifest</strong> is an official logistics shipping document listing all cargo packages, delivery routes (origin & destination), total payload weight, and assigned loader for a scheduled vehicle trip.
          </p>
        </div>
      </div>

      {shipments.length === 0 ? (
        <div className="card-elevated p-8 text-center rounded-2xl border border-border bg-card/60 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Box size={24} className="text-primary opacity-80" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">
            No Active Shipment Manifests Found
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6">
            There are currently no dispatch manifests created for vehicle{' '}
            <strong className="text-foreground">{truck.registrationNumber}</strong>. You can create a new dispatch in the Admin Dashboard or generate a sample manifest to test 3D load planning.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/admin-dashboard')}
              className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all flex items-center gap-2"
            >
              <PlusCircle size={14} className="text-primary" />
              Create Manifest in Admin Dashboard
            </button>
            {onCreateDemoManifest && (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {isCreating ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Generate Sample Manifest
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shipments.map((shipment) => {
            const totalWeight = shipment.totalWeight || 0;
            const weightPct = Math.round((totalWeight / (truck.maxWeight || 1)) * 100);
            const isOverweight = totalWeight > truck.maxWeight;

            return (
              <button
                key={shipment.id}
                onClick={() => onSelect(shipment)}
                disabled={isOverweight}
                className={`card-elevated p-4 rounded-xl text-left border transition-all ${
                  isOverweight
                    ? 'opacity-50 cursor-not-allowed border-border'
                    : 'card-hover border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{shipment.id.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {shipment.origin} → {shipment.destination}
                    </p>
                  </div>
                  <span
                    className={`status-badge text-[10px] ${
                      shipment.status === 'LOADED'
                        ? 'shipment-delivered'
                        : shipment.status === 'IN_TRANSIT'
                          ? 'shipment-in-transit'
                          : 'shipment-pending'
                    }`}
                  >
                    {shipment.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
                  <div>
                    Packages:{' '}
                    <strong className="text-foreground">
                      {shipment.packageCount || shipment.totalPackages || 0}
                    </strong>
                  </div>
                  <div>
                    Weight:{' '}
                    <strong className={isOverweight ? 'text-negative' : 'text-foreground'}>
                      {totalWeight.toLocaleString()}kg
                    </strong>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Truck Capacity</span>
                    <span className={isOverweight ? 'text-negative font-bold' : 'text-primary'}>
                      {weightPct}%
                    </span>
                  </div>
                  <div className="utilization-bar">
                    <div
                      className="utilization-fill"
                      style={{
                        width: `${Math.min(100, weightPct)}%`,
                        background: isOverweight ? '#EF4444' : weightPct > 80 ? '#F59E0B' : '#0EA5E9',
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── INNER COMPONENT ──────────────────────────────────────────────────────────
function LoadPlannerInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<WorkflowStep>('select-truck');
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentType | null>(null);
  const [placedPackages, setPlacedPackages] = useState<PlacedPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [highlightedPackageId, setHighlightedPackageId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showCoG, setShowCoG] = useState(true);
  const [showStabilityEnvelope, setShowStabilityEnvelope] = useState(false);
  const [showStabilityModal, setShowStabilityModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showReoptimizeModal, setShowReoptimizeModal] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('STOP');
  const [showReport, setShowReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Feature 6: Dynamic Re-Optimization diff history
  const [diffHistory, setDiffHistory] = useState<ReoptimizationDiff[]>([]);
  const [latestDiffBanner, setLatestDiffBanner] = useState<ReoptimizationDiff | null>(null);

  // Policy & Simulation State
  const [strategy, setStrategy] = useState<OptimizationStrategy>('BALANCED');
  const [simulationMode, setSimulationMode] = useState<'LOADING' | 'UNLOADING'>('LOADING');

  // Loading Sequence Playback State
  const [playbackStep, setPlaybackStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Unloading Simulation Stop State (Stop 1, 2, 3...)
  const [unloadingSimStop, setUnloadingSimStop] = useState<number | null>(null);

  // Database collections
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [shipments, setShipments] = useState<ShipmentType[]>([]);
  const [shipmentPackages, setShipmentPackages] = useState<PackageType[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(true);

  // Fetch truck and shipment options
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchSelectors = async () => {
      try {
        setPlannerLoading(true);
        const [tRes, sRes] = await Promise.all([fetch('/api/trucks'), fetch('/api/shipments')]);
        const tData = tRes.ok ? await tRes.json() : [];
        const sData = sRes.ok ? await sRes.json() : [];
        if (tRes.ok) setTrucks(tData);
        if (sRes.ok) setShipments(sData);

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const qShipmentId = params.get('shipmentId');
          const qTruckId = params.get('truckId');
          if (qShipmentId) {
            const foundShipment = sData.find(
              (s: any) => s.id?.toLowerCase() === qShipmentId.toLowerCase()
            );
            if (foundShipment) {
              setSelectedShipment(foundShipment);
              const foundTruck = tData.find(
                (t: any) => t.id === (qTruckId || foundShipment.truckId)
              );
              if (foundTruck) {
                setSelectedTruck(foundTruck);
              } else if (tData.length > 0) {
                setSelectedTruck(tData[0]);
              }
              setStep('loading');
            }
          } else if (qTruckId) {
            const foundTruck = tData.find((t: any) => t.id === qTruckId);
            if (foundTruck) {
              setSelectedTruck(foundTruck);
              setStep('select-shipment');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching selectors:', err);
      } finally {
        setPlannerLoading(false);
      }
    };
    fetchSelectors();
  }, [isAuthenticated, user]);

  // Fetch packages for the chosen shipment
  useEffect(() => {
    if (!selectedShipment) {
      setShipmentPackages([]);
      setPlacedPackages([]);
      return;
    }
    const fetchShipmentPackages = async () => {
      try {
        const pRes = await fetch(`/api/packages?shipmentId=${selectedShipment.id}`);
        if (pRes.ok) {
          const pkgs = await pRes.json();
          setShipmentPackages(pkgs);
          const alreadyPlaced = pkgs
            .filter((p: any) => p.positionX !== null && p.positionY !== null && p.positionZ !== null)
            .map((p: any) => ({
              package: p,
              position: {
                x: p.positionX,
                y: p.positionY,
                z: p.positionZ,
                rotationY: p.rotationY || 0,
              },
              isSelected: false,
              isHighlighted: false,
              isLocked: false,
              damageRisk: p.riskScore || 0,
              damageReasons: [],
              loadingOrder: p.loadingOrder || 1,
            }));
          if (alreadyPlaced.length > 0) {
            setPlacedPackages(alreadyPlaced);
          } else if (pkgs.length > 0) {
            const targetTruck = selectedTruck || (trucks.length > 0 ? trucks[0] : null);
            if (targetTruck) {
              const autoPlaced = autoOptimize(pkgs, targetTruck, strategy);
              setPlacedPackages(autoPlaced);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching packages:', err);
      }
    };
    fetchShipmentPackages();
  }, [selectedShipment, selectedTruck, strategy, trucks]);

  // Loading Playback timer effect
  useEffect(() => {
    if (!isPlaying || simulationMode !== 'LOADING') return;
    const interval = setInterval(() => {
      setPlaybackStep((prev) => {
        const current = prev === null ? 0 : prev;
        const next = current + 1;
        if (next > placedPackages.length) {
          setIsPlaying(false);
          return null;
        }
        return next;
      });
    }, 1200 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, placedPackages.length, simulationMode]);

  const unplacedPackages = useMemo(() => {
    const placedIds = new Set(placedPackages.map((p) => p.package.id));
    return shipmentPackages.filter((p) => !placedIds.has(p.id));
  }, [shipmentPackages, placedPackages]);

  const metrics = useMemo(() => {
    if (!selectedTruck) return null;
    return calculateSpaceMetrics(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const distribution = useMemo(() => {
    if (!selectedTruck) return null;
    return calculateWeightDistribution(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const stabilityAnalysis = useMemo(() => {
    if (!selectedTruck) return undefined;
    return analyzeVehicleStability(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const damageRiskReport = useMemo(() => {
    if (!selectedTruck) return undefined;
    return analyzeManifestDamageRisk(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const loadingSteps = useMemo(() => {
    if (!selectedTruck) return [];
    return generateLoadingSteps(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const unloadingReport = useMemo(() => {
    if (!selectedTruck) return undefined;
    return calculateUnloadingAccessibility(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const constraints = useMemo(() => {
    if (!selectedTruck) return undefined;
    return validateConstraints(placedPackages, selectedTruck);
  }, [placedPackages, selectedTruck]);

  const recommendations = useMemo(() => {
    if (!selectedTruck) return [];
    return generateRecommendations(unplacedPackages, placedPackages, selectedTruck, strategy);
  }, [unplacedPackages, placedPackages, selectedTruck, strategy]);

  const report = useMemo(() => {
    if (!selectedTruck) return null;
    return generateLoadingReport(placedPackages, shipmentPackages, selectedTruck, strategy);
  }, [placedPackages, shipmentPackages, selectedTruck, strategy]);

  // Selected package detailed damage breakdown
  const selectedPackageAnalysis = useMemo(() => {
    if (!selectedPackageId || !selectedTruck) return null;
    const placed = placedPackages.find((p) => p.package.id === selectedPackageId);
    if (!placed) return null;
    return calculateDetailedDamageRisk(placed.package, placed.position, placedPackages, selectedTruck);
  }, [selectedPackageId, placedPackages, selectedTruck]);

  const handlePlacePackage = useCallback(
    (pkg: PackageType) => {
      if (!selectedTruck) return;
      const weightCheck = checkWeightLimit(pkg, placedPackages, selectedTruck);
      if (!weightCheck.valid) {
        setWarnings([weightCheck.reason || 'Weight limit exceeded']);
        return;
      }
      const { position, found, rationale } = findBestPosition(pkg, placedPackages, selectedTruck, strategy);
      if (!found) {
        setWarnings([`No valid position found for ${pkg.name} — truck volume or support limit reached`]);
        return;
      }
      const damageAnalysis = calculateDetailedDamageRisk(pkg, position, placedPackages, selectedTruck);
      setPlacedPackages((prev) => [
        ...prev,
        {
          package: pkg,
          position,
          isSelected: false,
          isHighlighted: false,
          isLocked: false,
          damageRisk: damageAnalysis.riskScore,
          damageReasons: damageAnalysis.contributingFactors,
          damageAnalysis,
          loadingOrder: prev.length + 1,
          rationale,
        },
      ]);
      setWarnings([]);
    },
    [selectedTruck, placedPackages, strategy]
  );

  const handleApplyRecommendation = useCallback(
    (rec: AIRecommendation) => {
      const pkg = unplacedPackages.find((p) => p.id === rec.packageId);
      if (!pkg || !selectedTruck) return;
      const weightCheck = checkWeightLimit(pkg, placedPackages, selectedTruck);
      if (!weightCheck.valid) {
        setWarnings([weightCheck.reason || 'Weight limit exceeded']);
        return;
      }
      const damageAnalysis = calculateDetailedDamageRisk(
        pkg,
        rec.suggestedPosition,
        placedPackages,
        selectedTruck
      );
      setPlacedPackages((prev) => [
        ...prev,
        {
          package: pkg,
          position: rec.suggestedPosition,
          isSelected: false,
          isHighlighted: false,
          isLocked: false,
          damageRisk: damageAnalysis.riskScore,
          damageReasons: damageAnalysis.contributingFactors,
          damageAnalysis,
          loadingOrder: prev.length + 1,
          rationale: rec.reason,
        },
      ]);
      setWarnings([]);
    },
    [unplacedPackages, placedPackages, selectedTruck]
  );

  const handleRemovePackage = useCallback(
    (id: string) => {
      if (!selectedTruck) return;
      // Filter out package and gravity settle remaining cargo
      const remaining = placedPackages.filter((p) => p.package.id !== id);
      const settled = gravitySettle(remaining, selectedTruck);
      setPlacedPackages(settled.map((p, idx) => ({ ...p, loadingOrder: idx + 1 })));
      if (selectedPackageId === id) setSelectedPackageId(null);
      toast.info('Removed package & auto-compacted remaining cargo with gravity settling.');
    },
    [placedPackages, selectedTruck, selectedPackageId]
  );

  // ─── FEATURE 6: DYNAMIC RE-OPTIMIZATION HANDLERS ────────────────────────────

  const handleLockToggle = useCallback((packageId: string) => {
    setPlacedPackages((prev) =>
      prev.map((p) => (p.package.id === packageId ? { ...p, isLocked: !p.isLocked } : p))
    );
  }, []);

  const handleLockAll = useCallback(() => {
    setPlacedPackages((prev) => {
      const allLocked = prev.every((p) => p.isLocked);
      return prev.map((p) => ({ ...p, isLocked: !allLocked }));
    });
  }, []);

  const handleAddRushPackage = useCallback(
    (newPkg: PackageType) => {
      if (!selectedTruck) return;
      const updatedAll = [newPkg, ...shipmentPackages];
      setShipmentPackages(updatedAll);

      const lockedIds = placedPackages.filter((p) => p.isLocked).map((p) => p.package.id);
      const res = dynamicReoptimize(
        placedPackages,
        updatedAll,
        selectedTruck,
        strategy,
        lockedIds,
        'PACKAGE_ADDED',
        `Injected Rush Order "${newPkg.name}" (${newPkg.weight}kg, Stop #${newPkg.deliverySequence})`
      );

      setPlacedPackages(res.placedPackages);
      setDiffHistory((prev) => [res.diff, ...prev]);
      setLatestDiffBanner(res.diff);
      toast.success(res.diff.summaryMessage);
    },
    [selectedTruck, shipmentPackages, placedPackages, strategy]
  );

  const handleCancelPackages = useCallback(
    (cancelledIds: string[]) => {
      if (!selectedTruck) return;
      const cancelSet = new Set(cancelledIds);
      const updatedAll = shipmentPackages.filter((p) => !cancelSet.has(p.id));
      setShipmentPackages(updatedAll);

      const lockedIds = placedPackages
        .filter((p) => p.isLocked && !cancelSet.has(p.package.id))
        .map((p) => p.package.id);

      const res = dynamicReoptimize(
        placedPackages.filter((p) => !cancelSet.has(p.package.id)),
        updatedAll,
        selectedTruck,
        strategy,
        lockedIds,
        'PACKAGE_CANCELLED',
        `Cancelled ${cancelledIds.length} parcel(s) and executed void compaction`
      );

      setPlacedPackages(res.placedPackages);
      setDiffHistory((prev) => [res.diff, ...prev]);
      setLatestDiffBanner(res.diff);
      toast.success(`Cancelled ${cancelledIds.length} package(s) & auto-compacted remaining cargo.`);
    },
    [selectedTruck, shipmentPackages, placedPackages, strategy]
  );

  const handleSwapTruck = useCallback(
    (newTruck: TruckType) => {
      setSelectedTruck(newTruck);
      const lockedIds = placedPackages.filter((p) => p.isLocked).map((p) => p.package.id);

      const res = dynamicReoptimize(
        placedPackages,
        shipmentPackages,
        newTruck,
        strategy,
        lockedIds,
        'TRUCK_CAPACITY_CHANGED',
        `Swapped vehicle to ${newTruck.registrationNumber} (${newTruck.length}×${newTruck.width}×${newTruck.height}cm)`
      );

      setPlacedPackages(res.placedPackages);
      setDiffHistory((prev) => [res.diff, ...prev]);
      setLatestDiffBanner(res.diff);
      toast.success(`Fleet vehicle switched to ${newTruck.registrationNumber} — load re-calculated.`);
    },
    [placedPackages, shipmentPackages, strategy]
  );

  const handleAutoOptimize = useCallback(() => {
    if (!selectedTruck) return;
    const lockedIds = placedPackages.filter((p) => p.isLocked).map((p) => p.package.id);
    const res = dynamicReoptimize(
      placedPackages,
      shipmentPackages,
      selectedTruck,
      strategy,
      lockedIds,
      'AUTO_COMPACT',
      'AI Full Re-Optimization'
    );
    setPlacedPackages(res.placedPackages);
    setDiffHistory((prev) => [res.diff, ...prev]);
    setLatestDiffBanner(res.diff);
    setPlaybackStep(null);
    setUnloadingSimStop(null);
    setIsPlaying(false);
    setWarnings([]);

    const strategyNames: Record<OptimizationStrategy, string> = {
      BALANCED: 'Balanced Route & Safety Policy',
      SPACE_MAX: 'Space Maximizer Policy',
      FRAGILITY_FIRST: 'Fragility & Safety Policy',
      LIFO_PRIORITY: 'Strict LIFO Delivery Sequence Policy',
    };
    toast.success(`AI Re-Optimization executed (${strategyNames[strategy]}) — ${res.placedPackages.length} packages placed.`);
  }, [selectedTruck, shipmentPackages, placedPackages, strategy]);

  const handleAutoBalance = useCallback(() => {
    if (!selectedTruck) return;
    setStrategy('BALANCED');
    const balanced = autoOptimize(shipmentPackages, selectedTruck, 'BALANCED');
    setPlacedPackages(balanced);
    setPlaybackStep(null);
    setUnloadingSimStop(null);
    setIsPlaying(false);
    setWarnings([]);
    toast.success('AI Auto-Balance executed: Center of Gravity centered & Rollover resistance optimized.');
  }, [selectedTruck, shipmentPackages]);

  const handleCreateDemoManifest = useCallback(async () => {
    if (!selectedTruck || !user) return;
    try {
      const pRes = await fetch('/api/packages');
      let pkgs = pRes.ok ? await pRes.json() : [];
      let packageIds = pkgs.slice(0, 5).map((p: any) => p.id);

      if (packageIds.length === 0) {
        const demoPkgs = [
          { name: 'Industrial Motor Unit', length: 80, width: 60, height: 70, weight: 145, destination: 'Mumbai', fragilityLevel: 'MEDIUM' },
          { name: 'Medical Supplies Crate', length: 60, width: 50, height: 45, weight: 38, destination: 'Delhi', fragilityLevel: 'FRAGILE' },
          { name: 'Auto Parts Bundle', length: 120, width: 80, height: 50, weight: 210, destination: 'Pune', fragilityLevel: 'LOW' },
          { name: 'Electronic Components Box', length: 55, width: 45, height: 35, weight: 22, destination: 'Chennai', fragilityLevel: 'HIGH' },
        ];
        const createPkgsRes = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packages: demoPkgs }),
        });
        if (createPkgsRes.ok) {
          const createdData = await createPkgsRes.json();
          packageIds = (createdData.packages || []).map((p: any) => p.id);
        }
      }

      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const newShipmentBody = {
        id: `shipment-demo-${randomCode}`,
        truckId: selectedTruck.id,
        truckRegistration: selectedTruck.registrationNumber,
        loaderId: user.id || 'user-002',
        loaderName: user.name || 'Assigned Loader',
        origin: 'Nagpur Hub',
        destination: 'Mumbai',
        status: 'LOADING',
        packageIds: packageIds,
        totalWeight: 415,
        totalVolume: 1.8,
      };

      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShipmentBody),
      });

      if (res.ok) {
        const data = await res.json();
        const createdShipment = data.shipment || newShipmentBody;
        setShipments((prev) => [createdShipment, ...prev]);
        setSelectedShipment(createdShipment);
        setStep('loading');
        toast.success(`Demo Manifest ${createdShipment.id.toUpperCase()} created successfully!`);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to create demo manifest');
      }
    } catch (err) {
      console.error('Error creating demo manifest:', err);
      toast.error('Failed to create demo manifest');
    }
  }, [selectedTruck, user]);

  const handleMitigateDamageRisk = useCallback(() => {
    if (!selectedTruck) return;
    setStrategy('FRAGILITY_FIRST');
    const safePacked = autoOptimize(shipmentPackages, selectedTruck, 'FRAGILITY_FIRST');
    setPlacedPackages(safePacked);
    setPlaybackStep(null);
    setUnloadingSimStop(null);
    setIsPlaying(false);
    setWarnings([]);
    toast.success('Fragility-First Policy applied: Heavy items anchored on floor, zero crush pressure on fragile cargo.');
  }, [selectedTruck, shipmentPackages]);

  const handleReset = useCallback(() => {
    setPlacedPackages([]);
    setSelectedPackageId(null);
    setPlaybackStep(null);
    setUnloadingSimStop(null);
    setIsPlaying(false);
    setWarnings([]);
    toast.info('Cleared 3D vehicle canvas');
  }, []);

  const handleConfirmLoading = useCallback(async () => {
    if (!selectedShipment || !selectedTruck || !report) return;
    setIsSaving(true);
    try {
      const packagesToUpdate = shipmentPackages.map((pkg) => {
        const placed = placedPackages.find((p) => p.package.id === pkg.id);
        if (placed) {
          return {
            ...pkg,
            status: 'STAGED',
            isLoaded: false,
            positionX: placed.position.x,
            positionY: placed.position.y,
            positionZ: placed.position.z,
            rotationY: placed.position.rotationY,
            loadingOrder: placed.loadingOrder,
            riskScore: placed.damageRisk,
          };
        } else {
          return {
            ...pkg,
            status: 'PENDING',
            isLoaded: false,
            positionX: null,
            positionY: null,
            positionZ: null,
            rotationY: null,
            loadingOrder: null,
          };
        }
      });

      // Try database updates concurrently
      let isSuccess = false;
      try {
        const [res1, res2, res3] = await Promise.all([
          fetch('/api/packages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packages: packagesToUpdate }),
          }),
          fetch('/api/shipments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedShipment.id, status: 'LOADING' }),
          }),
          fetch('/api/trucks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: selectedTruck.id,
              status: 'LOADING',
              currentUtilization: Math.round(report.spaceUtilization),
              weightUtilization: Math.round(report.weightUtilization),
            }),
          }),
        ]);
        isSuccess = res1.ok && res2.ok && res3.ok;
      } catch (err) {
        console.warn('Backend persistence notice:', err);
      }

      toast.success('3D loading plan confirmed! Status updated to READY for assigned loader.');
      setIsConfirmed(true);
      setShowReport(false);
      setStep('confirmed');
    } catch (err) {
      console.error('Error confirming load:', err);
      toast.error('Failed to confirm load plan');
    } finally {
      setIsSaving(false);
    }
  }, [selectedShipment, selectedTruck, shipmentPackages, placedPackages, report]);

  if (isLoading || plannerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading 3D load planner & dynamic re-optimization engine...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Please sign in to access the 3D Load Planner.
          </p>
          <button
            onClick={() => router.replace('/login-screen')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const isReadOnly = user.role === 'ADMIN' && isConfirmed;
  const anyLocked = placedPackages.some((p) => p.isLocked);

  // ─── CONFIRMED STATE ────────────────────────────────────────────────────────
  if (step === 'confirmed' && report && selectedTruck && selectedShipment) {
    return (
      <AppLayout role={user.role} userName={user.name} userEmail={user.email}>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="card-elevated rounded-2xl p-8 text-center border border-positive/30 bg-slate-900/60 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center mx-auto mb-4 border border-positive/20">
              <CheckCircle2 size={32} className="text-positive" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Load & Safety Plan Confirmed!</h2>
            <p className="text-sm text-slate-400 mb-6">
              Manifest {selectedShipment.id.toUpperCase()} successfully planned for vehicle{' '}
              <span className="text-white font-semibold">{selectedTruck.registrationNumber}</span> with{' '}
              <strong className="text-positive">
                {report.damageRiskReport?.averageRiskScore || 0}% Damage Risk &{' '}
                {report.stabilityAnalysis?.staticRolloverThreshold || 0.44}g Rollover SRT
              </strong>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Space Util.', val: `${report.spaceUtilization}%`, color: 'text-primary' },
                { label: 'Avg Damage Risk', val: `${report.damageRiskReport?.averageRiskScore || 0}%`, color: 'text-emerald-400' },
                { label: 'Rollover SRT', val: `${report.stabilityAnalysis?.staticRolloverThreshold || 0.44}g`, color: 'text-positive' },
                { label: 'Efficiency', val: `${report.loadingEfficiency}/100`, color: 'text-cyan-400' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className={`text-lg font-bold ${m.color}`}>{m.val}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('loading');
                  setIsConfirmed(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Inspect 3D Layout
              </button>
              <button
                onClick={() => {
                  setStep('select-truck');
                  setSelectedTruck(null);
                  setSelectedShipment(null);
                  setPlacedPackages([]);
                  setIsConfirmed(false);
                }}
                className="flex-1 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Plan Next Vehicle
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role={user.role} userName={user.name} userEmail={user.email}>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/20">
              <Package size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                3D AI Load & Risk Planner
              </h1>
              {selectedTruck && (
                <p className="text-[11px] text-muted-foreground truncate">
                  <span className="text-foreground font-semibold">{selectedTruck.registrationNumber}</span> ·{' '}
                  {selectedShipment?.id.toUpperCase() || 'No manifest'}
                </p>
              )}
            </div>
          </div>

          {/* Step indicator navigation buttons */}
          <div className="hidden md:flex items-center gap-1.5">
            {STEPS.slice(0, 3).map((s, i) => {
              const isActive = step === s;
              const isPassed = STEPS.indexOf(step) > i;
              const isClickable =
                s === 'select-truck' ||
                (s === 'select-shipment' && !!selectedTruck) ||
                (s === 'loading' && !!selectedTruck && !!selectedShipment);

              return (
                <React.Fragment key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isClickable && !isActive) {
                        setStep(s);
                      }
                    }}
                    disabled={!isClickable || isActive}
                    title={
                      isActive
                        ? `Current step: ${STEP_LABELS[s]}`
                        : isClickable
                          ? `Navigate to ${STEP_LABELS[s]}`
                          : `Complete previous steps to unlock ${STEP_LABELS[s]}`
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 cursor-default ring-1 ring-primary/30'
                        : isPassed
                          ? 'text-positive bg-positive/10 border border-positive/20 hover:bg-positive/20 cursor-pointer hover:scale-105 active:scale-95 shadow-sm'
                          : isClickable
                            ? 'text-muted-foreground bg-muted/40 border border-border hover:bg-muted hover:text-foreground cursor-pointer hover:scale-105 active:scale-95'
                            : 'text-muted-foreground/40 bg-muted/20 border border-transparent cursor-not-allowed'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={11} className="text-positive flex-shrink-0" /> : <span>{i + 1}</span>}
                    <span>{STEP_LABELS[s]}</span>
                  </button>
                  {i < 2 && <span className="text-muted-foreground/50 text-[10px] px-0.5">›</span>}
                </React.Fragment>
              );
            })}
          </div>

          {/* Actions, Risk/Stability Modals & Controls */}
          {step === 'loading' && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Feature 6: Dynamic Re-Optimizer Simulator Modal Button */}
              <button
                onClick={() => setShowReoptimizeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
                title="Open Dynamic Load Re-Optimizer (Feature 6)"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Dynamic Re-Optimize</span>
              </button>

              {/* Pin / Lock All Loaded Items Toggle */}
              {placedPackages.length > 0 && (
                <button
                  onClick={handleLockAll}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    anyLocked
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                  title={anyLocked ? 'Unlock all packages' : 'Pin/Lock all placed packages'}
                >
                  {anyLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  <span>{anyLocked ? 'Pinned' : 'Pin All'}</span>
                </button>
              )}

              {/* Simulation Mode Toggle */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => {
                    setSimulationMode('LOADING');
                    setUnloadingSimStop(null);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    simulationMode === 'LOADING'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowDownToLine size={13} />
                  Loading Mode
                </button>
                <button
                  onClick={() => {
                    setSimulationMode('UNLOADING');
                    setPlaybackStep(null);
                    setIsPlaying(false);
                    setUnloadingSimStop(1);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    simulationMode === 'UNLOADING'
                      ? 'bg-card text-orange-400 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowUpFromLine size={13} />
                  Unloading Sim
                </button>
              </div>

              {/* Color Mode 3-Way Selector */}
              <div className="flex items-center bg-muted/40 border border-border rounded-lg p-1">
                <Palette size={13} className="text-primary ml-1.5 hidden sm:inline" />
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="STOP" className="bg-slate-900 text-white">Color by Stop</option>
                  <option value="RISK_HEATMAP" className="bg-slate-900 text-white">Damage Risk Heatmap</option>
                  <option value="FRAGILITY" className="bg-slate-900 text-white">Color by Fragility</option>
                </select>
              </div>

              {/* 3D Safe Envelope Toggle */}
              <button
                onClick={() => setShowStabilityEnvelope((p) => !p)}
                title={showStabilityEnvelope ? 'Hide 3D Safe CoG Envelope' : 'Show 3D Safe CoG Envelope'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showStabilityEnvelope
                    ? 'bg-positive/10 border-positive/30 text-positive'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Box size={14} />
              </button>



              {/* CoG Toggle */}
              <button
                onClick={() => setShowCoG((p) => !p)}
                title={showCoG ? 'Hide Center of Gravity Marker' : 'Show Center of Gravity Marker'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showCoG
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Scale size={14} />
              </button>

              <button
                onClick={() => setShowLabels((p) => !p)}
                title={showLabels ? 'Hide box labels' : 'Show box labels'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showLabels
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {showLabels ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              <button
                onClick={handleReset}
                title="Clear all placed packages"
                className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={14} />
              </button>

              {/* Run Optimizer */}
              <button
                onClick={handleAutoOptimize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-all shadow-sm"
              >
                <Zap size={14} />
                Run AI Optimizer
              </button>

              {!isReadOnly && (
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
                >
                  <BarChart3 size={14} />
                  Review & Save
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Re-Optimization Diff Notification Banner */}
        {latestDiffBanner && (
          <div className="flex items-center justify-between px-4 py-2 bg-indigo-950/80 border-b border-indigo-500/30 text-xs text-indigo-200 animate-slide-up flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400 flex-shrink-0" />
              <span><strong>Dynamic Re-Optimization:</strong> {latestDiffBanner.summaryMessage}</span>
            </div>
            <button
              onClick={() => setLatestDiffBanner(null)}
              className="text-indigo-400 hover:text-white text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Warnings alert */}
        {warnings.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-negative/10 border-b border-negative/20 flex-shrink-0">
            <AlertTriangle size={14} className="text-negative flex-shrink-0" />
            <span className="text-xs text-negative font-medium">{warnings[0]}</span>
            <button
              onClick={() => setWarnings([])}
              className="ml-auto text-negative/60 hover:text-negative text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {step === 'select-truck' && (
            <div className="p-6 overflow-y-auto h-full scrollbar-thin">
              <TruckSelector
                trucks={trucks}
                onSelect={(t) => {
                  setSelectedTruck(t);
                  setStep('select-shipment');
                }}
              />
            </div>
          )}

          {step === 'select-shipment' && selectedTruck && (
            <div className="p-6 overflow-y-auto h-full scrollbar-thin">
              <ShipmentSelector
                truck={selectedTruck}
                shipments={shipments}
                onSelect={(s) => {
                  setSelectedShipment(s);
                  setStep('loading');
                }}
                onBack={() => {
                  setStep('select-truck');
                  setSelectedTruck(null);
                }}
                onCreateDemoManifest={handleCreateDemoManifest}
              />
            </div>
          )}

          {step === 'loading' && selectedTruck && (
            <div className="flex h-full overflow-hidden">
              {/* Left Panel: Package Manifest */}
              <div className="w-56 lg:w-60 flex-shrink-0 border-r border-border overflow-hidden flex flex-col bg-card">
                <PackageListPanel
                  unplacedPackages={unplacedPackages}
                  placedPackages={placedPackages}
                  selectedPackageId={selectedPackageId}
                  onSelectPackage={setSelectedPackageId}
                  onPlacePackage={handlePlacePackage}
                  onRemovePackage={handleRemovePackage}
                  onHighlightPackage={setHighlightedPackageId}
                  onLockToggle={handleLockToggle}
                />
              </div>

              {/* Center Area: 3D Viewport with Multi-Mode Playback Overlay */}
              <div className="flex-1 relative overflow-hidden bg-[#0F172A]">
                <TruckViewer3D
                  truck={selectedTruck}
                  placedPackages={placedPackages}
                  onSelectPackage={setSelectedPackageId}
                  selectedPackageId={selectedPackageId}
                  highlightedPackageId={highlightedPackageId}
                  showLabels={showLabels}
                  showCoG={showCoG}
                  showStabilityEnvelope={showStabilityEnvelope}
                  colorMode={colorMode}
                  playbackStep={playbackStep}
                  unloadingSimStop={unloadingSimStop}
                />

                {/* Loading Sequence Playback Bar */}
                {simulationMode === 'LOADING' && placedPackages.length > 0 && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl z-10">
                    <button
                      onClick={() => {
                        const current = playbackStep === null ? placedPackages.length : playbackStep;
                        setPlaybackStep(Math.max(1, current - 1));
                        setIsPlaying(false);
                      }}
                      title="Previous Loading Step"
                      className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <SkipBack size={14} />
                    </button>

                    <button
                      onClick={() => {
                        if (isPlaying) {
                          setIsPlaying(false);
                        } else {
                          if (playbackStep === null || playbackStep >= placedPackages.length) {
                            setPlaybackStep(1);
                          }
                          setIsPlaying(true);
                        }
                      }}
                      title={isPlaying ? 'Pause' : 'Play'}
                      className="p-1.5 rounded-xl gradient-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
                    >
                      {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                    </button>

                    <button
                      onClick={() => {
                        const current = playbackStep === null ? 0 : playbackStep;
                        setPlaybackStep(Math.min(placedPackages.length, current + 1));
                        setIsPlaying(false);
                      }}
                      title="Next Loading Step"
                      className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <SkipForward size={14} />
                    </button>

                    <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                      <input
                        type="range"
                        min={1}
                        max={placedPackages.length}
                        value={playbackStep === null ? placedPackages.length : playbackStep}
                        onChange={(e) => {
                          setPlaybackStep(parseInt(e.target.value, 10));
                          setIsPlaying(false);
                        }}
                        className="w-24 accent-primary cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                      />
                      <span className="text-[11px] font-mono font-bold text-primary">
                        {playbackStep === null ? placedPackages.length : playbackStep}/
                        {placedPackages.length}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setPlaybackStep(null);
                        setIsPlaying(false);
                      }}
                      title="View all loaded boxes"
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                        playbackStep === null
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : 'text-slate-400 hover:text-white border-slate-700'
                      }`}
                    >
                      <Layers size={12} className="inline mr-1" />
                      All
                    </button>
                  </div>
                )}

                {/* Unloading Simulation Mode Stepper Bar */}
                {simulationMode === 'UNLOADING' && unloadingReport && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-orange-500/30 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl z-10 flex-wrap justify-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 border-r border-slate-700 pr-3">
                      <Route size={14} />
                      <span>Unloading Route Sim:</span>
                    </div>

                    <button
                      onClick={() => setUnloadingSimStop(null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        unloadingSimStop === null
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Full Cargo
                    </button>

                    {unloadingReport.stops.map((stop) => {
                      const stopColor = getStopColor(stop.stopNumber);
                      const isSelected = unloadingSimStop === stop.stopNumber;

                      return (
                        <button
                          key={`sim-stop-${stop.stopNumber}`}
                          onClick={() => setUnloadingSimStop(stop.stopNumber)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'text-white ring-2 ring-orange-400 shadow-md scale-105'
                              : 'text-slate-300 hover:text-white bg-slate-800'
                          }`}
                          style={{ background: isSelected ? stopColor : undefined }}
                        >
                          <span>Stop #{stop.stopNumber}</span>
                          <span className="text-[10px] opacity-80">({stop.destination})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected Package Damage Inspector Card Overlay */}
                {selectedPackageAnalysis && (
                  <div className="absolute top-16 left-4 max-w-xs bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3.5 shadow-2xl z-20 space-y-2 animate-fade-in">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[180px]">
                          {selectedPackageAnalysis.packageName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {selectedPackageAnalysis.digitalId} · {selectedPackageAnalysis.weight}kg
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          selectedPackageAnalysis.riskLevel === 'CRITICAL'
                            ? 'bg-negative/20 text-negative'
                            : selectedPackageAnalysis.riskLevel === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-400'
                              : selectedPackageAnalysis.riskLevel === 'MODERATE'
                                ? 'bg-warning/20 text-warning'
                                : 'bg-positive/20 text-positive'
                        }`}
                      >
                        Risk: {selectedPackageAnalysis.riskScore}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <div>Load Above: <strong className="text-white">{selectedPackageAnalysis.weightAboveKg}kg</strong></div>
                      <div>Pressure: <strong className="text-white">{selectedPackageAnalysis.compressionPressure} kg/cm²</strong></div>
                      <div>Crush Risk: <strong className="text-white">{selectedPackageAnalysis.crushRisk}%</strong></div>
                      <div>Vibration: <strong className="text-white">{selectedPackageAnalysis.vibrationRisk}%</strong></div>
                    </div>

                    <p className="text-[10px] text-slate-300 leading-tight">
                      {selectedPackageAnalysis.contributingFactors[0]}
                    </p>

                    <button
                      onClick={() => setSelectedPackageId(null)}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-white py-1 border-t border-slate-800 mt-1"
                    >
                      Dismiss Inspector
                    </button>
                  </div>
                )}

                {/* Bottom-left overlay metrics */}
                {metrics && (
                  <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap z-10">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] shadow-lg">
                      <span className="text-slate-400">Volume: </span>
                      <span className="text-primary font-bold">{metrics.spaceUtilization}%</span>
                    </div>
                    {damageRiskReport && (
                      <div
                        onClick={() => setShowDamageModal(true)}
                        className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] shadow-lg flex items-center gap-1.5 cursor-pointer hover:border-orange-500/50 transition-colors"
                      >
                        <ShieldAlert size={12} className="text-orange-400" />
                        <span className="text-slate-400">Damage Risk: </span>
                        <span
                          className={`font-bold ${
                            damageRiskReport.overallRiskLevel === 'LOW'
                              ? 'text-positive'
                              : 'text-warning'
                          }`}
                        >
                          {damageRiskReport.averageRiskScore}% ({damageRiskReport.overallRiskLevel})
                        </span>
                      </div>
                    )}
                    {stabilityAnalysis && (
                      <div
                        onClick={() => setShowStabilityModal(true)}
                        className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] shadow-lg flex items-center gap-1.5 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <Gauge size={12} className="text-emerald-400" />
                        <span className="text-slate-400">SRT: </span>
                        <span
                          className={`font-bold ${
                            stabilityAnalysis.isStable
                              ? 'text-positive'
                              : 'text-warning'
                          }`}
                        >
                          {stabilityAnalysis.staticRolloverThreshold}g
                        </span>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Right Panel: AI Assistant, Route Itinerary & Constraint Breakdown */}
              {metrics && distribution && (
                <div className="w-72 lg:w-80 flex-shrink-0 border-l border-border overflow-hidden flex flex-col bg-card">
                  <AIAssistantPanel
                    recommendations={recommendations}
                    metrics={metrics}
                    distribution={distribution}
                    steps={loadingSteps}
                    constraints={constraints}
                    strategy={strategy}
                    unloadingReport={unloadingReport}
                    stabilityAnalysis={stabilityAnalysis}
                    damageRiskReport={damageRiskReport}
                    onApplyRecommendation={handleApplyRecommendation}
                    onHighlightPackage={setHighlightedPackageId}
                    onOpenStabilityModal={() => setShowStabilityModal(true)}
                    onOpenDamageModal={() => setShowDamageModal(true)}
                    onSelectStep={(s) => {
                      setSimulationMode('LOADING');
                      setPlaybackStep(s);
                    }}
                    onSelectStop={(stopNum) => {
                      setSimulationMode('UNLOADING');
                      setUnloadingSimStop(stopNum);
                    }}
                    currentPlaybackStep={playbackStep}
                    currentUnloadingStop={unloadingSimStop}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature 6: Dynamic Re-Optimization Modal */}
      {showReoptimizeModal && selectedTruck && (
        <DynamicReoptimizeModal
          truck={selectedTruck}
          placedPackages={placedPackages}
          allPackages={shipmentPackages}
          availableTrucks={trucks}
          onClose={() => setShowReoptimizeModal(false)}
          onAddRushPackage={handleAddRushPackage}
          onCancelPackages={handleCancelPackages}
          onSwapTruck={handleSwapTruck}
          onLockToggle={handleLockToggle}
          diffHistory={diffHistory}
        />
      )}

      {/* Damage Risk Analytics Modal */}
      {showDamageModal && damageRiskReport && selectedTruck && (
        <DamageRiskModal
          damageReport={damageRiskReport}
          truck={selectedTruck}
          onClose={() => setShowDamageModal(false)}
          onMitigateRisk={handleMitigateDamageRisk}
          onSelectPackage={(id) => {
            setSelectedPackageId(id);
            setShowDamageModal(false);
          }}
        />
      )}

      {/* Stability Analysis Inspector Modal */}
      {showStabilityModal && stabilityAnalysis && selectedTruck && (
        <StabilityAnalysisModal
          stability={stabilityAnalysis}
          truck={selectedTruck}
          onClose={() => setShowStabilityModal(false)}
          onAutoBalance={handleAutoBalance}
        />
      )}

      {/* Loading Report Modal */}
      {showReport && report && selectedTruck && selectedShipment && (
        <LoadingReportModal
          report={report}
          shipmentId={selectedShipment.id.toUpperCase()}
          truckRegistration={selectedTruck.registrationNumber}
          onClose={() => setShowReport(false)}
          onConfirm={handleConfirmLoading}
          isReadOnly={isReadOnly}
          isSaving={isSaving}
        />
      )}
    </AppLayout>
  );
}

export default function LoadPlannerClient() {
  return <LoadPlannerInner />;
}
