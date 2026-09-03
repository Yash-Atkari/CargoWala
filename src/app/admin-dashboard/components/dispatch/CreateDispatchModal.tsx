'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Truck as TruckIcon,
  Package as PackageIcon,
  UserCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scale,
  ShieldAlert,
  MapPin,
  Calendar,
  Eye,
  Box,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Truck, Shipment, Package, User } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import AddPackageModal from '../packages/AddPackageModal';

interface CreateDispatchModalProps {
  trucks: Truck[];
  packages: Package[];
  onClose: () => void;
  onDispatchCreated: (shipment: Shipment) => void;
  onPackagesUpdated?: (packages: Package[]) => void;
}

type WizardStep =
  | 'ROUTE_DETAILS'
  | 'SELECT_PACKAGES'
  | 'SELECT_VEHICLE'
  | 'ASSIGN_LOADER'
  | 'GENERATE_PLAN'
  | 'REVIEW_PLAN';

const ORIGIN_HUBS = [
  'Mumbai Central Fulfillment Hub A',
  'Delhi NCR Logistics Depot',
  'Bengaluru Tech Logistics Hub',
  'Chennai Port Terminal',
  'Pune Express Cargo Facility',
  'Ahmedabad Logistics Park',
  'Jaipur Regional Depot',
  'Kolkata Dockyard Station',
];

export default function CreateDispatchModal({
  trucks,
  packages,
  onClose,
  onDispatchCreated,
  onPackagesUpdated,
}: CreateDispatchModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('ROUTE_DETAILS');

  // Step 1: Route & Details
  const [dispatchId, setDispatchId] = useState(
    `SHP-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [origin, setOrigin] = useState(ORIGIN_HUBS[0]);
  const [customOrigin, setCustomOrigin] = useState('');
  const [destination, setDestination] = useState('Pune Distribution Hub');
  const [customDestination, setCustomDestination] = useState('');
  const [departureTime, setDepartureTime] = useState(
    new Date(Date.now() + 3600000 * 3).toISOString().slice(0, 16)
  );

  // Step 2: Selected Packages
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [packageSequences, setPackageSequences] = useState<Record<string, number>>({});
  const [showAddPackageInline, setShowAddPackageInline] = useState(false);
  const [packageSearch, setPackageSearch] = useState('');

  // Step 3: Selected Vehicle
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

  // Step 4: Assigned Loader
  const [loaders, setLoaders] = useState<User[]>([]);
  const [loadingLoaders, setLoadingLoaders] = useState(false);
  const [selectedLoaderId, setSelectedLoaderId] = useState<string | null>(null);

  // Step 5: Optimization Result
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('BALANCED');

  // Step 6: Final Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Loaders from /api/users?role=LOADER
  useEffect(() => {
    const fetchLoaders = async () => {
      try {
        setLoadingLoaders(true);
        const res = await fetch('/api/users?role=LOADER');
        if (res.ok) {
          const data = await res.json();
          setLoaders(data);
          if (data.length > 0) {
            setSelectedLoaderId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching loaders:', err);
      } finally {
        setLoadingLoaders(false);
      }
    };
    fetchLoaders();
  }, []);

  // Filter available packages (not assigned to another active shipment)
  const availablePackages = useMemo(() => {
    return packages.filter((p) => {
      // Eligible if unassigned or if status is PENDING/STAGED without active locked shipment
      const isUnassigned = !p.shipmentId || p.status === 'PENDING' || p.status === 'STAGED';
      const q = packageSearch.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.digitalId.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q);

      return isUnassigned && matchesSearch;
    });
  }, [packages, packageSearch]);

  // Selected packages objects
  const selectedPackagesList = useMemo(() => {
    return packages.filter((p) => selectedPackageIds.includes(p.id));
  }, [packages, selectedPackageIds]);

  // Cargo metrics of selected packages
  const cargoMetrics = useMemo(() => {
    const totalWeight = selectedPackagesList.reduce((sum, p) => sum + (p.weight || 0), 0);
    const totalVolumeM3 = selectedPackagesList.reduce((sum, p) => {
      const vol = ((p.length || 0) * (p.width || 0) * (p.height || 0)) / 1000000;
      return sum + vol;
    }, 0);
    const fragileCount = selectedPackagesList.filter((p) => p.fragilityLevel === 'FRAGILE').length;
    return { totalWeight, totalVolumeM3, fragileCount };
  }, [selectedPackagesList]);

  // Available vehicles (ONLY AVAILABLE / FREE trucks)
  const availableTrucks = useMemo(() => {
    return trucks.filter((t) => t.status === 'AVAILABLE');
  }, [trucks]);

  const chosenTruck = useMemo(() => {
    return trucks.find((t) => t.id === selectedTruckId) || null;
  }, [trucks, selectedTruckId]);

  const chosenLoader = useMemo(() => {
    return loaders.find((l) => l.id === selectedLoaderId) || null;
  }, [loaders, selectedLoaderId]);

  // Capacity calculations
  const vehicleCapacityCheck = useMemo(() => {
    if (!chosenTruck) return { weightOk: true, weightPct: 0, volumePct: 0 };
    const maxWt = chosenTruck.maxWeight || 1;
    const truckVolM3 =
      ((chosenTruck.length || 0) * (chosenTruck.width || 0) * (chosenTruck.height || 0)) / 1000000;

    const weightPct = Math.round((cargoMetrics.totalWeight / maxWt) * 100);
    const volumePct = truckVolM3 > 0 ? Math.round((cargoMetrics.totalVolumeM3 / truckVolM3) * 100) : 0;
    const weightOk = cargoMetrics.totalWeight <= maxWt;

    return { weightOk, weightPct, volumePct, truckVolM3 };
  }, [chosenTruck, cargoMetrics]);

  // Auto-select first available vehicle if none chosen
  useEffect(() => {
    if (!selectedTruckId && availableTrucks.length > 0) {
      setSelectedTruckId(availableTrucks[0].id);
    }
  }, [availableTrucks, selectedTruckId]);

  // Toggle package selection
  const handleTogglePackage = (pkgId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = availablePackages.map((p) => p.id);
    setSelectedPackageIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearSelectedPackages = () => {
    setSelectedPackageIds([]);
  };

  // Step 5: Trigger AI Loading Optimizer
  const handleGenerateLoadingPlan = async () => {
    if (!chosenTruck) {
      toast.error('Please select an available vehicle before generating plan.');
      return;
    }
    if (selectedPackagesList.length === 0) {
      toast.error('Please select at least one package to load.');
      return;
    }

    try {
      setIsOptimizing(true);

      // Package array with user-specified delivery sequence
      const pkgsToOptimize = selectedPackagesList.map((p) => ({
        ...p,
        deliverySequence: packageSequences[p.id] || p.deliverySequence || 1,
      }));

      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truck: chosenTruck,
          packages: pkgsToOptimize,
          strategy: selectedStrategy,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate 3D loading plan');
      }

      setOptimizationResult(data);
      setCurrentStep('REVIEW_PLAN');
      toast.success(
        `3D AI Loading Plan generated successfully (${data.placedPackageCount} packages placed)!`
      );
    } catch (err: any) {
      console.error('Optimization error:', err);
      toast.error(err.message || 'AI Engine optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Step 6: Confirm Dispatch & Save
  const handleConfirmDispatch = async (startLoadingImmediately = true) => {
    if (!chosenTruck || !chosenLoader) {
      toast.error('Missing vehicle or loader assignment');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalOrigin = customOrigin.trim() || origin;
      const finalDest = customDestination.trim() || destination;

      // Extract placed package coordinates if plan generated
      const placedMap = new Map<string, any>();
      if (optimizationResult?.placedPackages) {
        optimizationResult.placedPackages.forEach((p: any) => {
          placedMap.set(p.package.id, {
            positionX: p.position?.x ?? null,
            positionY: p.position?.y ?? null,
            positionZ: p.position?.z ?? null,
            rotationY: p.position?.rotationY ?? 0,
            loadingOrder: p.loadingOrder || null,
            stackingNote: p.package.stackingNote || null,
            deliverySequence: p.package.deliverySequence || 1,
          });
        });
      }

      const packagesPayload = selectedPackageIds.map((id, idx) => {
        const placed = placedMap.get(id);
        return {
          id,
          deliverySequence: packageSequences[id] || placed?.deliverySequence || idx + 1,
          positionX: placed?.positionX,
          positionY: placed?.positionY,
          positionZ: placed?.positionZ,
          rotationY: placed?.rotationY,
          loadingOrder: placed?.loadingOrder,
          stackingNote: placed?.stackingNote,
        };
      });

      const initialStatus = startLoadingImmediately ? 'LOADING' : 'PLANNED';

      const payload = {
        id: dispatchId,
        truckId: chosenTruck.id,
        truckRegistration: chosenTruck.registrationNumber,
        loaderId: chosenLoader.id,
        loaderName: chosenLoader.name,
        origin: finalOrigin,
        destination: finalDest,
        status: initialStatus,
        packageIds: selectedPackageIds,
        packages: packagesPayload,
        totalWeight: cargoMetrics.totalWeight,
        totalVolume: Math.round(cargoMetrics.totalVolumeM3 * 10) / 10,
        departureTime: departureTime ? new Date(departureTime).toISOString() : null,
        updateTruckStatus: true,
      };

      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create dispatch');
      }

      // If truck status was updated, also update truck utilization if report exists
      if (optimizationResult?.metrics) {
        await fetch('/api/trucks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: chosenTruck.id,
            status: initialStatus === 'PLANNED' ? 'AVAILABLE' : 'LOADING',
            currentUtilization: Math.round(optimizationResult.metrics.spaceUtilization),
            weightUtilization: Math.round(optimizationResult.metrics.weightUtilization),
            assignedLoaderId: chosenLoader.id,
            assignedLoaderName: chosenLoader.name,
          }),
        });
      }

      toast.success(
        `Dispatch ${dispatchId} created successfully! Vehicle ${chosenTruck.registrationNumber} assigned to loader ${chosenLoader.name}.`
      );

      onDispatchCreated(data.shipment);
      onClose();
    } catch (err: any) {
      console.error('Error creating dispatch:', err);
      toast.error(err.message || 'Failed to finalize dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList: { key: WizardStep; label: string; number: number }[] = [
    { key: 'ROUTE_DETAILS', label: 'Route & ID', number: 1 },
    { key: 'SELECT_PACKAGES', label: 'Select Packages', number: 2 },
    { key: 'SELECT_VEHICLE', label: 'Select Vehicle', number: 3 },
    { key: 'ASSIGN_LOADER', label: 'Assign Loader', number: 4 },
    { key: 'GENERATE_PLAN', label: 'AI Optimizer', number: 5 },
    { key: 'REVIEW_PLAN', label: 'Review & Confirm', number: 6 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with Step Tracker */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                CW
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Create Vehicle Dispatch</h2>
                <p className="text-[11px] text-muted-foreground">
                  End-to-end shipment preparation: packages, vehicle, loader, and 3D loading plan
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stepper Wizard Bar */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pt-1">
            {stepsList.map((st, idx) => {
              const isCurrent = currentStep === st.key;
              const isPassed = stepsList.findIndex((s) => s.key === currentStep) > idx;
              return (
                <div key={st.key} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isPassed
                        ? 'bg-positive/15 text-positive font-bold'
                        : 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-background/20">
                      {isPassed ? '✓' : st.number}
                    </span>
                    <span>{st.label}</span>
                  </div>
                  {idx < stepsList.length - 1 && (
                    <span className="text-muted-foreground/40 text-xs px-1">›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Body Content */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin space-y-4">
          {/* STEP 1: ROUTE & DETAILS */}
          {currentStep === 'ROUTE_DETAILS' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
                <h3 className="text-xs font-bold text-primary mb-1">
                  1. Dispatch Route & Scheduling
                </h3>
                <p className="text-xs text-muted-foreground">
                  Establish origin fulfillment hub, target route destination, and dispatch reference ID.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Dispatch ID (Auto-Generated)
                  </label>
                  <input
                    type="text"
                    value={dispatchId}
                    onChange={(e) => setDispatchId(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-mono font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Unique tracking identifier for driver and warehouse manifest
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Estimated Departure Time
                  </label>
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Origin Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Origin Fulfillment Hub
                </label>
                <select
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value);
                    setCustomOrigin('');
                  }}
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {ORIGIN_HUBS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom Origin Hub...</option>
                </select>
                {origin === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder="Enter custom warehouse origin name"
                    className="w-full mt-2 px-3 py-1.5 bg-background border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    autoFocus
                  />
                )}
              </div>

              {/* Destination Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Primary Destination / Route Target
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Pune Distribution Hub, Surat Express Waypoint"
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Multi-stop delivery sequences can be adjusted in the package manifest selection step.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT PACKAGES */}
          {currentStep === 'SELECT_PACKAGES' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 border border-border rounded-xl">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    2. Select Cargo Packages ({selectedPackageIds.length} Selected)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Only packages without an active dispatch assignment are shown.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 bg-background border border-border hover:bg-muted text-xs font-semibold rounded-lg text-foreground transition-colors"
                  >
                    Select All ({availablePackages.length})
                  </button>
                  {selectedPackageIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelectedPackages}
                      className="px-2.5 py-1 bg-background border border-border hover:bg-muted text-xs font-semibold rounded-lg text-muted-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddPackageInline(true)}
                    className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={12} />
                    <span>Quick Add</span>
                  </button>
                </div>
              </div>

              {/* Tally Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-card border border-border rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Packages</span>
                  <strong className="text-sm font-bold text-foreground">
                    {selectedPackageIds.length}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Mass</span>
                  <strong className="text-sm font-bold text-foreground">
                    {cargoMetrics.totalWeight.toLocaleString()} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Volume</span>
                  <strong className="text-sm font-bold text-foreground">
                    {cargoMetrics.totalVolumeM3.toFixed(2)} m³
                  </strong>
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Filter packages by name, ID, or destination..."
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />

              {/* Package Select Table */}
              <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto scrollbar-thin">
                {availablePackages.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No unassigned packages available. Click &quot;Quick Add&quot; to create a new package.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border sticky top-0">
                      <tr>
                        <th className="p-2 w-8 text-center">✓</th>
                        <th className="p-2 font-semibold text-muted-foreground">Package</th>
                        <th className="p-2 font-semibold text-muted-foreground">Dimensions</th>
                        <th className="p-2 font-semibold text-muted-foreground">Weight</th>
                        <th className="p-2 font-semibold text-muted-foreground">Fragility</th>
                        <th className="p-2 font-semibold text-muted-foreground">Destination</th>
                        <th className="p-2 font-semibold text-muted-foreground">Stop Sequence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {availablePackages.map((pkg) => {
                        const isSelected = selectedPackageIds.includes(pkg.id);
                        return (
                          <tr
                            key={pkg.id}
                            onClick={() => handleTogglePackage(pkg.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePackage(pkg.id)}
                                className="rounded border-input text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="p-2 font-semibold text-foreground">
                              {pkg.name}
                              <span className="block font-mono text-[10px] text-muted-foreground">
                                {pkg.digitalId}
                              </span>
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {pkg.length}×{pkg.width}×{pkg.height} cm
                            </td>
                            <td className="p-2 font-bold text-foreground">{pkg.weight} kg</td>
                            <td className="p-2">
                              <StatusBadge variant={pkg.fragilityLevel as any} size="sm" />
                            </td>
                            <td className="p-2 text-muted-foreground truncate max-w-[130px]">
                              {pkg.destination}
                            </td>
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={packageSequences[pkg.id] ?? pkg.deliverySequence ?? 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setPackageSequences((prev) => ({ ...prev, [pkg.id]: val }));
                                }}
                                className="w-14 px-2 py-0.5 bg-background border border-input rounded text-center text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SELECT AVAILABLE VEHICLE */}
          {currentStep === 'SELECT_VEHICLE' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-muted/30 border border-border rounded-xl">
                <h3 className="text-xs font-bold text-foreground mb-1">
                  3. Select an Available Vehicle ({availableTrucks.length} Available)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Only vehicles with an <strong>AVAILABLE</strong> status can be assigned to new dispatches.
                </p>
              </div>

              {availableTrucks.length === 0 ? (
                <div className="p-8 text-center bg-muted/20 border border-border rounded-xl">
                  <TruckIcon size={32} className="mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm font-bold text-foreground">No available vehicles in fleet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All vehicles are currently loading, in transit, or in maintenance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableTrucks.map((truck) => {
                    const isSelected = selectedTruckId === truck.id;
                    const maxWeight = truck.maxWeight || 1;
                    const wtPct = Math.round((cargoMetrics.totalWeight / maxWeight) * 100);
                    const isOverweight = cargoMetrics.totalWeight > maxWeight;

                    return (
                      <button
                        key={truck.id}
                        type="button"
                        onClick={() => setSelectedTruckId(truck.id)}
                        className={`p-4 rounded-xl text-left border transition-all relative ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-sm'
                            : 'bg-card border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                              }`}
                            >
                              <TruckIcon size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">
                                {truck.registrationNumber}
                              </h4>
                              <p className="text-[11px] text-muted-foreground">{truck.model}</p>
                            </div>
                          </div>
                          <StatusBadge variant={truck.status as any} />
                        </div>

                        {/* Dimensions & Capacity */}
                        <div className="grid grid-cols-3 gap-2 p-2 bg-muted/40 rounded-lg text-[11px] text-muted-foreground mb-2.5">
                          <div>
                            Length: <strong className="text-foreground">{truck.length}cm</strong>
                          </div>
                          <div>
                            Width: <strong className="text-foreground">{truck.width}cm</strong>
                          </div>
                          <div>
                            Height: <strong className="text-foreground">{truck.height}cm</strong>
                          </div>
                        </div>

                        {/* Weight Capacity Gauge */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Payload Check:</span>
                            <span
                              className={`font-bold ${
                                isOverweight ? 'text-destructive' : 'text-foreground'
                              }`}
                            >
                              {cargoMetrics.totalWeight.toLocaleString()} /{' '}
                              {truck.maxWeight?.toLocaleString()} kg ({wtPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverweight
                                  ? 'bg-destructive'
                                  : wtPct > 80
                                  ? 'bg-amber-500'
                                  : 'bg-positive'
                              }`}
                              style={{ width: `${Math.min(100, wtPct)}%` }}
                            />
                          </div>
                          {isOverweight && (
                            <p className="text-[10px] text-destructive font-semibold mt-1">
                              ⚠ Selected cargo exceeds vehicle payload capacity by{' '}
                              {(cargoMetrics.totalWeight - maxWeight).toLocaleString()} kg!
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: ASSIGN LOADER */}
          {currentStep === 'ASSIGN_LOADER' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-muted/30 border border-border rounded-xl">
                <h3 className="text-xs font-bold text-foreground mb-1">
                  4. Assign Available Loader
                </h3>
                <p className="text-xs text-muted-foreground">
                  The assigned loader will be responsible for bay staging, barcode scanning, and following the 3D plan.
                </p>
              </div>

              {loadingLoaders ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Loading facility loaders...</p>
                </div>
              ) : loaders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 border border-border rounded-xl">
                  No registered loaders found with role &quot;LOADER&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {loaders.map((loader) => {
                    const isSelected = selectedLoaderId === loader.id;
                    return (
                      <button
                        key={loader.id}
                        type="button"
                        onClick={() => setSelectedLoaderId(loader.id)}
                        className={`p-4 rounded-xl text-left border transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-sm'
                            : 'bg-card border-border hover:border-primary/40'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            isSelected ? 'bg-primary text-white' : 'bg-muted text-foreground'
                          }`}
                        >
                          {loader.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-foreground">{loader.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{loader.email}</p>
                          <span className="inline-block text-[10px] text-primary font-semibold mt-1">
                            {loader.assignedTruckId
                              ? `Station: ${loader.assignedTruckId}`
                              : 'Station: Free Float'}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: GENERATE LOADING PLAN */}
          {currentStep === 'GENERATE_PLAN' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles size={18} />
                  <span>5. Generate 3D AI Loading Plan</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The AI optimization engine will pass the selected package geometry, vehicle cargo specifications,
                  and delivery sequence to optimize multi-constraint bin packing, stability, and damage prevention.
                </p>
              </div>

              {/* Ready Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Selected Vehicle
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-1">
                    {chosenTruck?.registrationNumber || 'None'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{chosenTruck?.model}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Cargo Manifest
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-1">
                    {selectedPackageIds.length} Packages
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {cargoMetrics.totalWeight} kg · {cargoMetrics.fragileCount} fragile
                  </p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Assigned Loader
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-1">
                    {chosenLoader?.name || 'None'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{chosenLoader?.email}</p>
                </div>
              </div>

              {/* Policy Strategy Selector */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  AI Optimization Strategy Policy
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'BALANCED', label: 'Balanced', desc: 'Route sequence + Stability' },
                    { id: 'FRAGILITY_FIRST', label: 'Fragility-First', desc: 'Zero crush pressure' },
                    { id: 'SPACE_MAX', label: 'Space Maximizer', desc: 'Highest density compact' },
                    { id: 'LIFO_PRIORITY', label: 'LIFO Sequence', desc: 'Reverse stop order' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStrategy(st.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedStrategy === st.id
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="text-xs font-bold block">{st.label}</span>
                      <span className="text-[10px] text-muted-foreground">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={isOptimizing || !chosenTruck || selectedPackageIds.length === 0}
                  onClick={handleGenerateLoadingPlan}
                  className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm rounded-xl shadow-lg hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Optimizing 3D Load & Axle Stability...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate Loading Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW PLAN */}
          {currentStep === 'REVIEW_PLAN' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-positive/10 border border-positive/20 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-positive flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>6. Loading Plan Generated & Ready for Review</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Review space utilization, stability analysis, damage risk, and step-by-step loading order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('GENERATE_PLAN')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Re-run Plan
                </button>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-card border border-border rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Space Utilization
                  </span>
                  <div className="text-xl font-extrabold text-primary mt-1">
                    {optimizationResult?.metrics?.spaceUtilization?.toFixed(1) || '0.0'}%
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {optimizationResult?.placedPackageCount || selectedPackageIds.length} of{' '}
                    {selectedPackageIds.length} placed
                  </span>
                </div>
                <div className="p-3 bg-card border border-border rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Weight Utilization
                  </span>
                  <div className="text-xl font-extrabold text-foreground mt-1">
                    {optimizationResult?.metrics?.weightUtilization?.toFixed(1) || '0.0'}%
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {cargoMetrics.totalWeight.toLocaleString()} /{' '}
                    {chosenTruck?.maxWeight?.toLocaleString()} kg
                  </span>
                </div>
                <div className="p-3 bg-card border border-border rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Stability (SRT)
                  </span>
                  <div className="text-xl font-extrabold text-positive mt-1">
                    {optimizationResult?.stabilityAnalysis?.staticRolloverThreshold
                      ? `${optimizationResult.stabilityAnalysis.staticRolloverThreshold}g`
                      : '0.44g'}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {optimizationResult?.stabilityAnalysis?.isStable
                      ? '✓ Stable rollover margin'
                      : '⚠ Check axle balance'}
                  </span>
                </div>
                <div className="p-3 bg-card border border-border rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Damage Risk
                  </span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">
                    {optimizationResult?.damageRiskReport?.overallRiskLevel || 'LOW'}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Avg score: {optimizationResult?.damageRiskReport?.averageRiskScore || 0}%
                  </span>
                </div>
              </div>

              {/* Step Sequence Table */}
              <div>
                <span className="text-xs font-bold text-foreground block mb-1.5">
                  Loading Order & Placement Plan ({optimizationResult?.steps?.length || selectedPackageIds.length} steps)
                </span>
                <div className="border border-border rounded-xl overflow-hidden max-h-56 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border sticky top-0">
                      <tr>
                        <th className="p-2 font-semibold text-muted-foreground text-[10px]">Order</th>
                        <th className="p-2 font-semibold text-muted-foreground text-[10px]">Package</th>
                        <th className="p-2 font-semibold text-muted-foreground text-[10px]">Weight</th>
                        <th className="p-2 font-semibold text-muted-foreground text-[10px]">Position (X, Y, Z)</th>
                        <th className="p-2 font-semibold text-muted-foreground text-[10px]">Stop</th>
                        <th className="p-2 font-semibold text-muted-foreground text-[10px]">Placement Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(optimizationResult?.steps || []).map((st: any) => (
                        <tr key={st.packageId} className="hover:bg-muted/30">
                          <td className="p-2 font-mono font-bold text-primary">#{st.stepNumber}</td>
                          <td className="p-2 font-semibold text-foreground">
                            {st.packageName}
                            <span className="block font-mono text-[10px] text-muted-foreground">
                              {st.digitalId}
                            </span>
                          </td>
                          <td className="p-2 font-medium">{st.weight} kg</td>
                          <td className="p-2 font-mono text-muted-foreground">
                            X:{Math.round(st.position?.x || 0)} Y:{Math.round(st.position?.y || 0)} Z:{Math.round(st.position?.z || 0)}
                          </td>
                          <td className="p-2 text-muted-foreground">Stop #{st.deliverySequence || 1}</td>
                          <td className="p-2 text-muted-foreground italic text-[11px] truncate max-w-[200px]">
                            {st.rationale || 'Optimal tier positioning'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-card">
          <button
            type="button"
            onClick={() => {
              const prevIdx = stepsList.findIndex((s) => s.key === currentStep) - 1;
              if (prevIdx >= 0) {
                setCurrentStep(stepsList[prevIdx].key);
              } else {
                onClose();
              }
            }}
            className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>{currentStep === 'ROUTE_DETAILS' ? 'Cancel' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep === 'ROUTE_DETAILS' && (
              <button
                type="button"
                onClick={() => setCurrentStep('SELECT_PACKAGES')}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Packages</span>
                <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 'SELECT_PACKAGES' && (
              <button
                type="button"
                disabled={selectedPackageIds.length === 0}
                onClick={() => setCurrentStep('SELECT_VEHICLE')}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Vehicles ({selectedPackageIds.length})</span>
                <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 'SELECT_VEHICLE' && (
              <button
                type="button"
                disabled={!selectedTruckId || !vehicleCapacityCheck.weightOk}
                onClick={() => setCurrentStep('ASSIGN_LOADER')}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Loader</span>
                <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 'ASSIGN_LOADER' && (
              <button
                type="button"
                disabled={!selectedLoaderId}
                onClick={() => setCurrentStep('GENERATE_PLAN')}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Optimization</span>
                <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 'REVIEW_PLAN' && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmDispatch(false)}
                  className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors border border-border"
                >
                  Save as Planned
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmDispatch(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Finalizing Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Start Loading & Confirm</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inline Quick Add Package Modal */}
      {showAddPackageInline && (
        <AddPackageModal
          onClose={() => setShowAddPackageInline(false)}
          onPackageAdded={(newPkg) => {
            onPackagesUpdated?.([newPkg, ...packages]);
            setSelectedPackageIds((prev) => [...prev, newPkg.id]);
            setShowAddPackageInline(false);
          }}
        />
      )}
    </div>
  );
}
