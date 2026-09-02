'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { AuthProvider, useAuth } from '@/lib/authContext';
import {
  MOCK_TRUCKS,
  MOCK_SHIPMENTS,
  MOCK_PACKAGES,
  MockTruck,
  MockShipment,
  MockPackage,
} from '@/lib/mockData';
import {
  PlacedPackage,
  AIRecommendation,
  autoOptimize,
  generateRecommendations,
  calculateSpaceMetrics,
  calculateWeightDistribution,
  generateLoadingReport,
  checkWeightLimit,
  calculateDamageRisk,
  findBestPosition,
} from '@/lib/loadingOptimizer';
import AIAssistantPanel from './AIAssistantPanelProps';
import PackageListPanel from './PackageListPanelProps';
import LoadingReportModal from './LoadingReportModalProps';
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
  'select-truck': 'Select Truck',
  'select-shipment': 'Select Shipment',
  loading: '3D Load Planner',
  confirmed: 'Confirmed',
};

const STEPS: WorkflowStep[] = ['select-truck', 'select-shipment', 'loading', 'confirmed'];

// ─── TRUCK SELECTOR ──────────────────────────────────────────────────────────
function TruckSelector({ trucks = [], onSelect }: { trucks: MockTruck[]; onSelect: (t: MockTruck) => void }) {
  const available = trucks.filter((t) => t.status === 'AVAILABLE' || t.status === 'LOADING');
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-700 text-foreground mb-1">Select a Truck</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Choose an available truck to begin the loading session.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {available.map((truck) => (
          <button
            key={truck.id}
            onClick={() => onSelect(truck)}
            className="card-elevated card-hover p-4 rounded-xl text-left border border-border hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">{truck.registrationNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{truck.model}</p>
                </div>
              </div>
              <span
                className={`status-badge text-[10px] ${truck.status === 'AVAILABLE' ? 'truck-available' : 'truck-loading'}`}
              >
                {truck.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground mt-3">
              <div>
                <span className="text-foreground font-600">{truck.length}cm</span>
                <br />
                Length
              </div>
              <div>
                <span className="text-foreground font-600">{truck.width}cm</span>
                <br />
                Width
              </div>
              <div>
                <span className="text-foreground font-600">{truck.height}cm</span>
                <br />
                Height
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
              Max weight:{' '}
              <span className="text-foreground font-600">{truck.maxWeight.toLocaleString()}kg</span>
              {truck.assignedLoaderName && (
                <span className="ml-3">
                  Loader: <span className="text-foreground">{truck.assignedLoaderName}</span>
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SHIPMENT SELECTOR ───────────────────────────────────────────────────────
function ShipmentSelector({
  truck,
  shipments = [],
  onSelect,
  onBack,
}: {
  truck: MockTruck;
  shipments: MockShipment[];
  onSelect: (s: MockShipment) => void;
  onBack: () => void;
}) {
  const filteredShipments = shipments.filter(
    (s) => s.status === 'PENDING' || s.status === 'LOADING' || s.truckId === truck.id
  );
  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to truck selection
      </button>
      <h2 className="text-lg font-700 text-foreground mb-1">Select a Shipment</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Truck: <span className="text-foreground font-600">{truck.registrationNumber}</span> ·{' '}
        {truck.model}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredShipments.map((s) => {
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="card-elevated card-hover p-4 rounded-xl text-left border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-600 text-foreground">{s.id.toUpperCase()}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.origin} → {s.destination}
                  </p>
                </div>
                <span
                  className={`status-badge text-[10px] ${
                    s.status === 'LOADING'
                      ? 'truck-loading'
                      : s.status === 'PENDING'
                        ? 'bg-muted text-muted-foreground'
                        : 'truck-available'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground mt-2">
                <div>
                  <span className="text-foreground font-600">{s.packageCount}</span>
                  <br />
                  Packages
                </div>
                <div>
                  <span className="text-foreground font-600">
                    {s.totalWeight.toLocaleString()}kg
                  </span>
                  <br />
                  Weight
                </div>
                <div>
                  <span className="text-foreground font-600">{s.loaderName}</span>
                  <br />
                  Loader
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── INNER COMPONENT (uses useAuth) ──────────────────────────────────────────
function LoadPlannerInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<WorkflowStep>('select-truck');
  const [selectedTruck, setSelectedTruck] = useState<MockTruck | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<MockShipment | null>(null);
  const [placedPackages, setPlacedPackages] = useState<PlacedPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [highlightedPackageId, setHighlightedPackageId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Database collections
  const [trucks, setTrucks] = useState<MockTruck[]>([]);
  const [shipments, setShipments] = useState<MockShipment[]>([]);
  const [shipmentPackages, setShipmentPackages] = useState<MockPackage[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(true);

  // Fetch truck and shipment options
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchSelectors = async () => {
      try {
        setPlannerLoading(true);
        const [tRes, sRes] = await Promise.all([
          fetch('/api/trucks'),
          fetch('/api/shipments'),
        ]);
        if (tRes.ok) setTrucks(await tRes.json());
        if (sRes.ok) setShipments(await sRes.json());
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
          // Auto-load already placed packages from database
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
              damageRisk: p.riskScore || 0,
              damageReasons: [],
            }));
          setPlacedPackages(alreadyPlaced);
        }
      } catch (err) {
        console.error('Error fetching packages:', err);
      }
    };
    fetchShipmentPackages();
  }, [selectedShipment]);

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

  const recommendations = useMemo(() => {
    if (!selectedTruck) return [];
    return generateRecommendations(unplacedPackages, placedPackages, selectedTruck);
  }, [unplacedPackages, placedPackages, selectedTruck]);

  const report = useMemo(() => {
    if (!selectedTruck) return null;
    return generateLoadingReport(placedPackages, shipmentPackages, selectedTruck);
  }, [placedPackages, shipmentPackages, selectedTruck]);

  const handlePlacePackage = useCallback(
    (pkg: MockPackage) => {
      if (!selectedTruck) return;
      const weightCheck = checkWeightLimit(pkg, placedPackages, selectedTruck);
      if (!weightCheck.valid) {
        setWarnings([weightCheck.reason || 'Weight limit exceeded']);
        return;
      }
      const { position, found } = findBestPosition(pkg, placedPackages, selectedTruck);
      if (!found) {
        setWarnings([`No valid position found for ${pkg.name} — truck may be full`]);
        return;
      }
      const { score, reasons } = calculateDamageRisk(pkg, position, placedPackages, selectedTruck);
      setPlacedPackages((prev) => [
        ...prev,
        {
          package: pkg,
          position,
          isSelected: false,
          isHighlighted: false,
          damageRisk: score,
          damageReasons: reasons,
        },
      ]);
      setWarnings([]);
    },
    [selectedTruck, placedPackages]
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
      const { score, reasons } = calculateDamageRisk(
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
          damageRisk: score,
          damageReasons: reasons,
        },
      ]);
      setWarnings([]);
    },
    [unplacedPackages, placedPackages, selectedTruck]
  );

  const handleRemovePackage = useCallback(
    (id: string) => {
      setPlacedPackages((prev) => prev.filter((p) => p.package.id !== id));
      if (selectedPackageId === id) setSelectedPackageId(null);
    },
    [selectedPackageId]
  );

  const handleAutoOptimize = useCallback(() => {
    if (!selectedTruck) return;
    const optimized = autoOptimize(shipmentPackages, selectedTruck);
    setPlacedPackages(optimized);
    setWarnings([]);
  }, [selectedTruck, shipmentPackages]);

  const handleReset = useCallback(() => {
    setPlacedPackages([]);
    setSelectedPackageId(null);
    setWarnings([]);
  }, []);

  const handleConfirmLoading = useCallback(async () => {
    if (!selectedShipment || !selectedTruck || !report) return;
    try {
      // 1. Batch update package positions & status
      const packagesToUpdate = shipmentPackages.map((pkg) => {
        const placed = placedPackages.find((p) => p.package.id === pkg.id);
        if (placed) {
          return {
            id: pkg.id,
            status: 'LOADED',
            isLoaded: true,
            positionX: placed.position.x,
            positionY: placed.position.y,
            positionZ: placed.position.z,
            rotationY: placed.position.rotationY,
          };
        } else {
          return {
            id: pkg.id,
            status: 'PENDING',
            isLoaded: false,
            positionX: null,
            positionY: null,
            positionZ: null,
            rotationY: null,
          };
        }
      });

      const res1 = await fetch('/api/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: packagesToUpdate }),
      });

      // 2. Update shipment status to LOADED
      const res2 = await fetch('/api/shipments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedShipment.id, status: 'LOADED' }),
      });

      // 3. Update truck status & utilization
      const res3 = await fetch('/api/trucks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTruck.id,
          status: 'LOADING',
          currentUtilization: Math.round(report.spaceUtilization),
          weightUtilization: Math.round(report.weightUtilization),
        }),
      });

      if (res1.ok && res2.ok && res3.ok) {
        toast.success('Loading session confirmed & persisted to database!');
        setIsConfirmed(true);
        setShowReport(false);
        setStep('confirmed');
      } else {
        toast.error('Failed to save loading configuration to database');
      }
    } catch (err) {
      console.error('Error confirming load:', err);
      toast.error('Network error during confirmation');
    }
  }, [selectedShipment, selectedTruck, shipmentPackages, placedPackages, report]);

  if (isLoading || plannerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Verifying session & loading planner data...</p>
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
            onClick={() => router?.push('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const isReadOnly = user.role === 'ADMIN' && isConfirmed;

  // ─── CONFIRMED STATE ────────────────────────────────────────────────────────
  if (step === 'confirmed' && report && selectedTruck && selectedShipment) {
    return (
      <AppLayout role={user.role} userName={user.name} userEmail={user.email}>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="card-elevated rounded-xl p-8 text-center border border-positive/30">
            <div className="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-positive" />
            </div>
            <h2 className="text-xl font-700 text-foreground mb-2">Loading Confirmed!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Shipment {selectedShipment.id.toUpperCase()} has been marked as loaded on truck{' '}
              {selectedTruck.registrationNumber}.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                {
                  label: 'Space Utilization',
                  val: `${report.spaceUtilization}%`,
                  color: 'text-primary',
                },
                {
                  label: 'Weight Utilization',
                  val: `${report.weightUtilization}%`,
                  color: 'text-accent',
                },
                {
                  label: 'Balance Score',
                  val: `${report.balanceScore}/100`,
                  color: 'text-positive',
                },
                { label: 'Efficiency', val: `${report.loadingEfficiency}/100`, color: 'text-info' },
              ].map((m) => (
                <div key={m.label} className="card-elevated p-3 rounded-lg">
                  <div className={`text-lg font-700 ${m.color}`}>{m.val}</div>
                  <div className="text-[11px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('loading');
                  setIsConfirmed(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-600 text-muted-foreground hover:bg-muted transition-colors"
              >
                View 3D Layout
              </button>
              <button
                onClick={() => {
                  setStep('select-truck');
                  setSelectedTruck(null);
                  setSelectedShipment(null);
                  setPlacedPackages([]);
                  setIsConfirmed(false);
                }}
                className="flex-1 py-2.5 rounded-xl gradient-primary text-sm font-600 text-white hover:opacity-90 transition-opacity"
              >
                New Session
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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Package size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-700 text-foreground">3D Load Planner</h1>
              {selectedTruck && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {selectedTruck.registrationNumber} ·{' '}
                  {selectedShipment?.id.toUpperCase() || 'No shipment'}
                </p>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="hidden md:flex items-center gap-1 mx-auto">
            {STEPS.slice(0, 3).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-600 ${
                    step === s
                      ? 'bg-primary/10 text-primary'
                      : STEPS.indexOf(step) > i
                        ? 'text-positive'
                        : 'text-muted-foreground'
                  }`}
                >
                  {STEPS.indexOf(step) > i ? <CheckCircle2 size={10} /> : <span>{i + 1}</span>}
                  <span>{STEP_LABELS[s]}</span>
                </div>
                {i < 2 && <span className="text-muted-foreground text-[10px]">›</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Actions (only in loading step) */}
          {step === 'loading' && (
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              <button
                onClick={() => setShowLabels((p) => !p)}
                title={showLabels ? 'Hide labels' : 'Show labels'}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {showLabels ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={handleReset}
                title="Clear all packages"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleAutoOptimize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-600 transition-colors"
              >
                <Zap size={13} />
                Auto-Optimize
              </button>
              {!isReadOnly && (
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-600 hover:opacity-90 transition-opacity"
                >
                  <BarChart3 size={13} />
                  Review & Confirm
                </button>
              )}
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-negative/10 border-b border-negative/20 flex-shrink-0">
            <AlertTriangle size={14} className="text-negative flex-shrink-0" />
            <span className="text-xs text-negative">{warnings[0]}</span>
            <button
              onClick={() => setWarnings([])}
              className="ml-auto text-negative/60 hover:text-negative text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
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
              />
            </div>
          )}

          {step === 'loading' && selectedTruck && (
            <div className="flex h-full overflow-hidden">
              {/* Left: Package list */}
              <div className="w-56 flex-shrink-0 border-r border-border overflow-hidden flex flex-col">
                <PackageListPanel
                  unplacedPackages={unplacedPackages}
                  placedPackages={placedPackages}
                  selectedPackageId={selectedPackageId}
                  onSelectPackage={setSelectedPackageId}
                  onPlacePackage={handlePlacePackage}
                  onRemovePackage={handleRemovePackage}
                  onHighlightPackage={setHighlightedPackageId}
                />
              </div>

              {/* Center: 3D Viewer */}
              <div className="flex-1 relative overflow-hidden">
                <TruckViewer3D
                  truck={selectedTruck}
                  placedPackages={placedPackages}
                  onSelectPackage={setSelectedPackageId}
                  selectedPackageId={selectedPackageId}
                  highlightedPackageId={highlightedPackageId}
                  showLabels={showLabels}
                />

                {/* Overlay metrics */}
                {metrics && (
                  <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-[11px]">
                      <span className="text-muted-foreground">Space: </span>
                      <span className="text-primary font-600">{metrics.spaceUtilization}%</span>
                    </div>
                    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-[11px]">
                      <span className="text-muted-foreground">Weight: </span>
                      <span className="text-accent font-600">{metrics.weightUtilization}%</span>
                    </div>
                    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-[11px]">
                      <span className="text-muted-foreground">Pkgs: </span>
                      <span className="text-foreground font-600">
                        {placedPackages.length}/{shipmentPackages.length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Camera hint */}
                <div className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground">
                  Drag to rotate · Scroll to zoom · Right-drag to pan
                </div>

                {isReadOnly && (
                  <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Eye size={11} />
                    Read-only view
                  </div>
                )}
              </div>

              {/* Right: AI Assistant */}
              {metrics && distribution && (
                <div className="w-64 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
                  <AIAssistantPanel
                    recommendations={recommendations}
                    metrics={metrics}
                    distribution={distribution}
                    onApplyRecommendation={handleApplyRecommendation}
                    onHighlightPackage={setHighlightedPackageId}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading Report Modal */}
      {showReport && report && selectedTruck && selectedShipment && (
        <LoadingReportModal
          report={report}
          shipmentId={selectedShipment.id.toUpperCase()}
          truckRegistration={selectedTruck.registrationNumber}
          onClose={() => setShowReport(false)}
          onConfirm={handleConfirmLoading}
          isReadOnly={isReadOnly}
        />
      )}
    </AppLayout>
  );
}

// ─── EXPORTED WRAPPER WITH AUTH PROVIDER ─────────────────────────────────────
export default function LoadPlannerClient() {
  return (
    <AuthProvider>
      <LoadPlannerInner />
    </AuthProvider>
  );
}
