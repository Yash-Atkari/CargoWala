'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Truck, Shipment, LoadingPackage } from '@/lib/types';
import { PlacedPackage, ColorMode, autoOptimize } from '@/lib/loadingOptimizer';
import {
  Truck as TruckIcon,
  Package as PackageIcon,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Box,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  AlertCircle,
  QrCode,
  ScanLine,
  Search,
  Filter,
  Layers,
  Sliders,
  History,
  Check,
  Flag,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
  Navigation,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import LoaderExceptionModal from './components/LoaderExceptionModal';
import LoaderDeviationModal from './components/LoaderDeviationModal';
import LoaderCompletionModal from './components/LoaderCompletionModal';
import LoaderActivityDrawer from './components/LoaderActivityDrawer';
import StatusBadge from '@/components/ui/StatusBadge';

const TruckViewer3D = dynamic(
  () => import('@/app/load-planner/components/TruckViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[450px] flex items-center justify-center bg-[#070D1E] rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
          <RefreshCw size={14} className="animate-spin text-primary" />
          <span>Rendering High-Fidelity WebGL 3D Vehicle Container...</span>
        </div>
      </div>
    ),
  }
);

function LoaderDashboardInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Local state for dynamic database query
  const [assignedDispatches, setAssignedDispatches] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [assignedTruck, setAssignedTruck] = useState<Truck | null>(null);
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [packages, setPackages] = useState<LoadingPackage[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  // Modals & Drawers state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<string | null>(null);

  // Embedded 3D Viewport controls
  const [loader3DViewMode, setLoader3DViewMode] = useState<'PROGRESS' | 'PLANNER'>('PROGRESS');
  const [loaderColorMode, setLoaderColorMode] = useState<ColorMode>('STOP');
  const [showCoG, setShowCoG] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selected3DPkgId, setSelected3DPkgId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'QUEUED' | 'LOADED' | 'EXCEPTIONS'>('ALL');
  const [stopFilter, setStopFilter] = useState<string>('ALL');
  const [rightPanelTab, setRightPanelTab] = useState<'SEQUENCE' | 'COMPLETED'>('SEQUENCE');

  // Filter completed & delivered shipments stored for this station
  const completedDispatches = useMemo(() => {
    return assignedDispatches.filter(
      (s) => s.status === 'DELIVERED' || s.status === 'COMPLETED'
    );
  }, [assignedDispatches]);

  // Redirect if not loaded/authenticated
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.replace('/login-screen');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Fetch dashboard data from live database APIs
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setDashboardLoading(true);

      // 1. Fetch all shipments assigned to this loader (or all shipments for ADMIN)
      let userShipments: Shipment[] = [];
      try {
        const shipUrl = user.role === 'ADMIN' ? '/api/shipments' : `/api/shipments?loaderId=${user.id}&all=true`;
        const shipRes = await fetch(shipUrl);
        if (shipRes.ok) {
          userShipments = await shipRes.json();
        }
      } catch (e) {
        console.error('Error fetching loader shipments:', e);
      }

      // If no shipments assigned specifically to this loader, fetch all system shipments as fallback
      if (!Array.isArray(userShipments) || userShipments.length === 0) {
        try {
          const allShipRes = await fetch('/api/shipments');
          if (allShipRes.ok) {
            userShipments = await allShipRes.json();
          }
        } catch (e) {}
      }

      setAssignedDispatches(userShipments || []);

      // 2. Identify target shipment
      let targetShipment: Shipment | null = null;
      if (selectedShipmentId && Array.isArray(userShipments)) {
        targetShipment = userShipments.find((s) => s.id === selectedShipmentId) || null;
      }
      if (!targetShipment && Array.isArray(userShipments) && userShipments.length > 0) {
        // Prioritize active dispatches first; if none active, pick latest shipment
        targetShipment =
          userShipments.find((s) =>
            ['LOADING', 'PLANNED', 'PENDING', 'READY', 'STAGED', 'LOADED', 'IN_TRANSIT'].includes(s.status)
          ) || userShipments[0];
        if (targetShipment) {
          setSelectedShipmentId(targetShipment.id);
        }
      }

      // 3. Identify truck
      const targetTruckId = targetShipment?.truckId || user.assignedTruckId || 'truck-001';
      let truckData: Truck | null = null;
      try {
        const truckRes = await fetch(`/api/trucks?id=${targetTruckId}`);
        if (truckRes.ok) {
          truckData = await truckRes.json();
        }
      } catch (e) {}

      if (!truckData) {
        try {
          const allTrucksRes = await fetch('/api/trucks');
          if (allTrucksRes.ok) {
            const allTrucksList: Truck[] = await allTrucksRes.json();
            truckData = allTrucksList[0] || null;
          }
        } catch (e) {}
      }

      setAssignedTruck(truckData);

      // 4. Fallback shipment from truck if none found
      if (!targetShipment && truckData && truckData.currentShipmentId) {
        try {
          const fallbackShipRes = await fetch(`/api/shipments?id=${truckData.currentShipmentId}`);
          if (fallbackShipRes.ok) {
            targetShipment = await fallbackShipRes.json();
          }
        } catch (e) {}
      }

      setCurrentShipment(targetShipment);

      // 5. Fetch packages for target shipment
      const activeShipId = targetShipment?.id || truckData?.currentShipmentId;
      if (activeShipId) {
        const pkgsRes = await fetch(`/api/packages?shipmentId=${activeShipId}`);
        if (pkgsRes.ok) {
          const pkgsData = await pkgsRes.json();
          const mappedPackages = pkgsData.map((p: any) => ({
            ...p,
            loadingOrder: p.loadingOrder || 0,
            isLoaded: !!p.isLoaded,
          }));
          setPackages(mappedPackages);
        } else {
          setPackages([]);
        }
      } else {
        setPackages([]);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      toast.error('Failed to load real-time station data');
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user, selectedShipmentId]);

  // Operational Calculations
  const totalPackages = packages.length;
  const loadedPackages = packages.filter((p) => p.isLoaded).length;
  const remainingPackages = totalPackages - loadedPackages;
  const progressPercent = totalPackages > 0 ? Math.round((loadedPackages / totalPackages) * 100) : 0;
  const damagedPackagesCount = packages.filter((p) => p.status === 'DAMAGED').length;

  const currentLoadedWeight = packages
    .filter((p) => p.isLoaded)
    .reduce((sum, p) => sum + (p.weight || 0), 0);

  // Identify next package in AI loading sequence
  const nextStepPackage = useMemo(() => {
    const unplaced = packages.filter((p) => !p.isLoaded && p.status !== 'DAMAGED');
    if (unplaced.length === 0) return null;
    return unplaced.sort((a, b) => (a.loadingOrder || 0) - (b.loadingOrder || 0))[0];
  }, [packages]);

  // Unique delivery stops for filter
  const deliveryStops = useMemo(() => {
    const stops = new Set<number>();
    packages.forEach((p) => {
      if (p.deliverySequence) stops.add(p.deliverySequence);
    });
    return Array.from(stops).sort((a, b) => a - b);
  }, [packages]);

  // Filtered package list for sequence view
  const filteredPackages = useMemo(() => {
    return packages
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchId = p.digitalId.toLowerCase().includes(q);
          const matchDest = p.destination.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchDest) return false;
        }

        // Status Filter
        if (statusFilter === 'QUEUED' && (p.isLoaded || p.status === 'DAMAGED')) return false;
        if (statusFilter === 'LOADED' && !p.isLoaded) return false;
        if (statusFilter === 'EXCEPTIONS' && p.status !== 'DAMAGED') return false;

        // Stop Filter
        if (stopFilter !== 'ALL' && String(p.deliverySequence) !== stopFilter) return false;

        return true;
      })
      .sort((a, b) => (a.loadingOrder || 0) - (b.loadingOrder || 0));
  }, [packages, searchQuery, statusFilter, stopFilter]);

  // Compute 3D placed packages layout
  const allPlacedPackages: PlacedPackage[] = useMemo(() => {
    if (!assignedTruck || packages.length === 0) return [];

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
        isSelected: pkg.id === (selected3DPkgId || selectedPackageForModal),
        isHighlighted: pkg.id === nextStepPackage?.id,
        damageRisk: pkg.riskScore || 0,
        damageReasons: [],
        loadingOrder: pkg.loadingOrder || 1,
      }));
    }

    const computed = autoOptimize(packages, assignedTruck, 'BALANCED');
    return computed.map((p) => ({
      ...p,
      isSelected: p.package.id === (selected3DPkgId || selectedPackageForModal),
      isHighlighted: p.package.id === nextStepPackage?.id,
    }));
  }, [packages, assignedTruck, selected3DPkgId, selectedPackageForModal, nextStepPackage]);

  // Filter packages for 3D Viewport based on Progress vs Planner
  const displayed3DPackages = useMemo(() => {
    if (loader3DViewMode === 'PROGRESS') {
      return allPlacedPackages.filter((p) => p.package.isLoaded);
    }
    return allPlacedPackages;
  }, [allPlacedPackages, loader3DViewMode]);

  // Confirm loading a package
  const handleQuickConfirmLoad = async (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    setLoadingPackageId(packageId);
    try {
      // 1. Update package status in database
      const res = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkg.id,
          status: 'LOADED',
          isLoaded: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update package status in database');
      }

      // 2. Audit tracking event
      await fetch('/api/tracking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: currentShipment?.id || 'shipment-001',
          packageId: pkg.id,
          eventType: 'LOADED',
          description: `Parcel ${pkg.digitalId} (${pkg.name}) loaded into vehicle position ${pkg.loadingOrder || 1}.`,
          location: currentShipment?.origin || 'Nagpur Hub',
          createdBy: user?.name || 'Loader Station',
        }),
      });

      // 3. Update local state
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, isLoaded: true, status: 'LOADED' } : p))
      );

      toast.success(`Loaded Step #${pkg.loadingOrder || 1}: ${pkg.name} into container!`);
    } catch (err: any) {
      console.error('Error confirming load:', err);
      toast.error(err.message || 'Failed to update package');
    } finally {
      setLoadingPackageId(null);
    }
  };

  // Barcode Verification Handler
  const handleScanVerify = async (scannedIdOrCode: string): Promise<boolean> => {
    const clean = scannedIdOrCode.toLowerCase().trim();
    const matched = packages.find(
      (p) =>
        p.id.toLowerCase().trim() === clean ||
        p.digitalId.toLowerCase().trim() === clean ||
        p.name.toLowerCase().includes(clean)
    );

    if (!matched) {
      toast.error(`No parcel matching barcode/ID "${scannedIdOrCode}" in current manifest.`);
      return false;
    }

    if (matched.isLoaded) {
      toast.info(`Parcel ${matched.digitalId} is ALREADY loaded.`);
      return false;
    }

    if (matched.status === 'DAMAGED') {
      toast.error(`Parcel ${matched.digitalId} is flagged as DAMAGED.`);
      return false;
    }

    await handleQuickConfirmLoad(matched.id);
    return true;
  };

  if (isLoading || dashboardLoading) {
    return (
      <AppLayout role={user?.role || 'LOADER'} userName={user?.name || ''} userEmail={user?.email || ''}>
        <div className="min-h-screen bg-[#070D1E] flex items-center justify-center text-white">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Connecting to station loading dock...</p>
            <button
              onClick={loadDashboardData}
              className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh Station Data</span>
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!assignedTruck || !currentShipment) {
    return (
      <AppLayout role={user?.role || 'LOADER'} userName={user?.name || ''} userEmail={user?.email || ''}>
        <div className="min-h-screen bg-[#070D1E] flex items-center justify-center p-6 text-white">
          <div className="text-center max-w-md bg-[#0F172A] border border-slate-800 p-8 rounded-2xl shadow-xl space-y-4">
            <TruckIcon size={40} className="mx-auto text-primary" />
            <h2 className="text-lg font-bold text-white">No Active Vehicle Dispatches</h2>
            <p className="text-xs text-slate-400">
              There are currently no active or pending dispatches assigned to this loading bay station.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh Station</span>
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin-dashboard')}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Go to Admin Hub
                </button>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role={user?.role || 'LOADER'} userName={user?.name || ''} userEmail={user?.email || ''}>
      <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-screen-2xl mx-auto space-y-5 text-white">
        {/* Top Header & Dispatch Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0F172A] p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Bay Loading Station
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold font-mono">
                {assignedTruck.registrationNumber}
              </span>
              <StatusBadge variant={currentShipment.status as any} size="sm" />
            </div>

            {/* Route & Corridor */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-0.5">
              <span className="font-semibold text-white">{assignedTruck.model}</span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-primary" />
                <strong>{currentShipment.origin}</strong>
                <span className="text-slate-500">→</span>
                <strong className="text-primary">{currentShipment.destination}</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                Dispatch:{' '}
                <strong className="text-white font-mono">{currentShipment.id}</strong>
              </span>
            </div>
          </div>

          {/* Primary Touch Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Dispatch Switcher (if multiple dispatches) */}
            {assignedDispatches.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <span className="text-xs text-slate-400">Switch:</span>
                <select
                  value={selectedShipmentId || currentShipment.id}
                  onChange={(e) => setSelectedShipmentId(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-primary focus:outline-none cursor-pointer"
                >
                  {assignedDispatches.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.id} ({s.destination})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Activity History Toggle */}
            <button
              onClick={() => setShowActivityDrawer(true)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white transition-colors border border-slate-800"
              title="View bay activity history"
            >
              <History size={16} />
            </button>

            {currentShipment.status === 'LOADED' || currentShipment.status === 'READY' || currentShipment.status === 'IN_TRANSIT' ? (
              <button
                onClick={() => router.push('/driver-dashboard')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
              >
                <Navigation size={15} />
                <span>Track Stop Deliveries</span>
              </button>
            ) : (
              <>
                {/* Scan Barcode Button */}
                <button
                  onClick={() => setShowScannerModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <QrCode size={16} />
                  <span>Scan Parcel</span>
                  <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {loadedPackages}/{totalPackages}
                  </span>
                </button>

                {/* Complete Loading Session Button */}
                <button
                  onClick={() => setShowCompletionModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-lg shadow-primary/20"
                >
                  <CheckCircle2 size={15} />
                  <span>Complete Loading</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading Session Completed Banner */}
        {(currentShipment.status === 'LOADED' || currentShipment.status === 'READY' || currentShipment.status === 'IN_TRANSIT') && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Loading Session Completed</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                    {currentShipment.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Vehicle <strong>{assignedTruck.registrationNumber}</strong> is fully loaded ({loadedPackages}/{totalPackages} parcels) and in transit on the highway.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/driver-dashboard')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 flex-shrink-0"
            >
              <Navigation size={14} />
              <span>Track Stop Deliveries</span>
            </button>
          </div>
        )}

        {/* Operational KPI Bento Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          {/* 1. Loading Progress */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Loading Progress
            </span>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">
                  {loadedPackages}/{totalPackages}
                </span>
                <span className="text-xs font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              {remainingPackages} parcel(s) remaining
            </span>
          </div>

          {/* 2. Payload Weight Check */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Gross Weight
            </span>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">
                  {currentLoadedWeight.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1">kg</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-400">
                  {Math.round((currentLoadedWeight / (assignedTruck.maxWeight || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((currentLoadedWeight / (assignedTruck.maxWeight || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              Max limit: {assignedTruck.maxWeight?.toLocaleString()} kg
            </span>
          </div>

          {/* 3. Trailer Dimensions */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Cargo Dimensions
            </span>
            <div className="mt-2">
              <span className="text-lg font-black text-white block">
                {assignedTruck.length}×{assignedTruck.width}×{assignedTruck.height}
              </span>
              <span className="text-[10px] text-slate-400">centimeters (L × W × H)</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              Volume: {((assignedTruck.length * assignedTruck.width * assignedTruck.height) / 1000000).toFixed(1)} m³
            </span>
          </div>

          {/* 4. Incidents & Exceptions */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Exceptions Logged
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-black ${damagedPackagesCount > 0 ? 'text-red-400' : 'text-white'}`}>
                {damagedPackagesCount}
              </span>
              <button
                onClick={() => {
                  setSelectedPackageForModal(null);
                  setShowExceptionModal(true);
                }}
                className="text-[11px] font-bold text-red-400 hover:underline"
              >
                + Report
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              {damagedPackagesCount > 0 ? 'Damage incidents active' : 'Zero reported issues'}
            </span>
          </div>
        </div>

        {/* Main Operational Grid: 3D Viewport in Center/Left, Control Window on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CENTER WINDOW: Live 3D Cargo Viewport & Toggle */}
          <div className="lg:col-span-7 xl:col-span-8 bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[620px] shadow-xl">
            {/* Header & Mode Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Box size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Live 3D Cargo Viewport</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
                      {assignedTruck.registrationNumber}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Interactive 3D container view — shift between Current Progress & AI Planner
                  </p>
                </div>
              </div>

              {/* Controls & Mode Shift Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setLoader3DViewMode('PROGRESS')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      loader3DViewMode === 'PROGRESS'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>Current Progress ({loadedPackages}/{totalPackages})</span>
                  </button>
                  <button
                    onClick={() => setLoader3DViewMode('PLANNER')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      loader3DViewMode === 'PLANNER'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>AI Planner</span>
                  </button>
                </div>

                {/* Color Mode Selector */}
                <select
                  value={loaderColorMode}
                  onChange={(e) => setLoaderColorMode(e.target.value as ColorMode)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  <option value="STOP">By Stop</option>
                  <option value="FRAGILITY">Fragility</option>
                  <option value="RISK_HEATMAP">Risk Heatmap</option>
                </select>
              </div>
            </div>

            {/* 3D Canvas Box */}
            <div className="flex-1 relative bg-[#070D1E] rounded-xl overflow-hidden border border-slate-800 min-h-[480px]">
              <TruckViewer3D
                truck={assignedTruck}
                placedPackages={displayed3DPackages}
                selectedPackageId={selected3DPkgId || selectedPackageForModal || null}
                highlightedPackageId={nextStepPackage?.id || null}
                colorMode={loaderColorMode}
                showLabels={showLabels}
                showCoG={showCoG}
                onSelectPackage={(pkgId: string | null) => {
                  setSelected3DPkgId(pkgId);
                  setSelectedPackageForModal(pkgId);
                }}
              />

              {/* Viewport Overlay Info Badge */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-lg flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    loader3DViewMode === 'PROGRESS' ? 'bg-emerald-400 animate-pulse' : 'bg-primary'
                  }`}
                />
                <span>
                  Viewing:{' '}
                  {loader3DViewMode === 'PROGRESS'
                    ? `Current Progress (${loadedPackages} Loaded in Truck)`
                    : 'Full Target AI Load Plan'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Shifted Sequence & Control Window */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-3">
            {/* Right Sidebar Header: View Mode Switcher (AI Sequence vs Completed Dispatches) */}
            <div className="flex items-center bg-[#0F172A] p-1 rounded-2xl border border-slate-800 text-xs shadow-md">
              <button
                onClick={() => setRightPanelTab('SEQUENCE')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  rightPanelTab === 'SEQUENCE'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>AI Sequence ({filteredPackages.length})</span>
              </button>

              <button
                onClick={() => setRightPanelTab('COMPLETED')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  rightPanelTab === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>Completed ({completedDispatches.length})</span>
              </button>
            </div>

            {rightPanelTab === 'COMPLETED' ? (
              /* COMPLETED & DELIVERED DISPATCHES PANEL */
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Completed / Delivered Dispatches ({completedDispatches.length})</span>
                  </h2>
                  <span className="text-[10px] text-slate-500">Click card to fetch to 3D Viewport</span>
                </div>

                {completedDispatches.length === 0 ? (
                  <div className="p-8 text-center bg-[#0F172A] border border-slate-800 rounded-2xl text-xs text-slate-500 space-y-1">
                    <CheckCircle2 size={24} className="mx-auto text-slate-600 mb-1" />
                    <p className="font-semibold text-slate-400">No completed dispatches stored yet</p>
                    <p className="text-[11px] text-slate-500">
                      Dispatches completed or delivered on route will be stored here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[550px] overflow-y-auto scrollbar-thin pr-1">
                    {completedDispatches.map((s) => {
                      const isSelectedInViewport = currentShipment?.id === s.id;
                      return (
                        <div
                          key={`completed-ship-${s.id}`}
                          onClick={() => {
                            setSelectedShipmentId(s.id);
                            toast.success(`Fetched dispatch ${s.id} into middle 3D Viewport!`);
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                            isSelectedInViewport
                              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                              : 'border-slate-800 bg-[#0F172A] hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <CheckCircle2 size={15} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-mono text-xs font-bold text-white block truncate">
                                  {s.id}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  Vehicle: {s.truckRegistration || 'Container'}
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase font-mono shrink-0">
                              {s.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                            <span className="flex items-center gap-1 font-semibold text-white truncate">
                              <MapPin size={12} className="text-primary shrink-0" />
                              {s.origin} → {s.destination}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px] shrink-0">
                              {s.packageCount} Pkgs · {s.totalWeight}kg
                            </span>
                          </div>

                          {isSelectedInViewport && (
                            <div className="pt-1.5 flex items-center justify-between text-[11px] text-emerald-400 font-bold border-t border-emerald-500/20">
                              <span className="flex items-center gap-1">
                                <Eye size={12} /> Currently Loaded in Middle Window
                              </span>
                              <span>Inspect 3D →</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* AI PLAN SEQUENCE & PARCEL LIST */
              <>
                {/* Search, Filter Bar & Quick Tools */}
                <div className="flex flex-col gap-2.5 bg-[#0F172A] p-3.5 rounded-2xl border border-slate-800 shadow-md">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Search package by ID, name, or stop..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="ALL">All ({packages.length})</option>
                      <option value="QUEUED">Queued ({remainingPackages})</option>
                      <option value="LOADED">Loaded ({loadedPackages})</option>
                      <option value="EXCEPTIONS">Exceptions ({damagedPackagesCount})</option>
                    </select>

                    {/* Stop Filter */}
                    {deliveryStops.length > 1 && (
                      <select
                        value={stopFilter}
                        onChange={(e) => setStopFilter(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      >
                        <option value="ALL">All Stops</option>
                        {deliveryStops.map((st) => (
                          <option key={st} value={String(st)}>
                            Stop #{st}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* AI Loading Plan Sequence Cards List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={14} className="text-primary" />
                      <span>AI Plan Sequence ({filteredPackages.length})</span>
                    </h2>
                    <span className="text-[10px] text-slate-500">LIFO Order</span>
                  </div>

                  {filteredPackages.length === 0 ? (
                    <div className="p-8 text-center bg-[#0F172A] border border-slate-800 rounded-2xl text-xs text-slate-500 space-y-1">
                      <PackageIcon size={24} className="mx-auto text-slate-600 mb-1" />
                      <p className="font-semibold text-slate-400">No matching packages</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                      {filteredPackages.map((pkg) => {
                        const isDamaged = pkg.status === 'DAMAGED';
                        const isLoaded = pkg.isLoaded;
                        const isNext = nextStepPackage?.id === pkg.id;

                        let badgeStyle = 'bg-slate-800 text-slate-300';
                        if (pkg.fragilityLevel === 'FRAGILE') {
                          badgeStyle = 'bg-red-500/20 text-red-400 border border-red-500/30';
                        } else if (pkg.fragilityLevel === 'HIGH') {
                          badgeStyle = 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
                        } else if (pkg.fragilityLevel === 'MEDIUM') {
                          badgeStyle = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
                        }

                        return (
                          <div
                            key={pkg.id}
                            className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                              isDamaged
                                ? 'border-red-500/40 bg-red-950/10'
                                : isLoaded
                                ? 'border-emerald-500/25 bg-emerald-950/10 opacity-80'
                                : isNext
                                ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
                                : 'border-slate-800 bg-[#0F172A] hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-primary/20 text-primary border border-primary/30">
                                    Step #{pkg.loadingOrder || 1}
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-slate-300 truncate">
                                    {pkg.digitalId}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeStyle}`}>
                                    {pkg.fragilityLevel}
                                  </span>
                                  {isNext && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                      LOAD NOW
                                    </span>
                                  )}
                                </div>

                                <h3 className={`text-sm font-bold ${isDamaged ? 'text-red-400 line-through' : 'text-white'} truncate`}>
                                  {pkg.name}
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                  Dest: <strong className="text-slate-200">{pkg.destination}</strong> (Stop #{pkg.deliverySequence || 1})
                                </p>
                              </div>

                              {/* 3D Location Button */}
                              <button
                                onClick={() => {
                                  setSelected3DPkgId(pkg.id);
                                  setSelectedPackageForModal(pkg.id);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1 shrink-0"
                                title="Highlight box in 3D viewport"
                              >
                                <Box size={13} className="text-primary" />
                                <span>3D Loc</span>
                              </button>
                            </div>

                            {/* Specs & 3D Spot */}
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span>Dims: <strong className="text-white">{pkg.length}×{pkg.width}×{pkg.height} cm</strong></span>
                              <span>·</span>
                              <span>Weight: <strong className="text-white">{pkg.weight} kg</strong></span>
                              {pkg.positionX !== null && pkg.positionX !== undefined && (
                                <span className="font-mono text-[9px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                  Spot: X:{Math.round(pkg.positionX)} Y:{Math.round(pkg.positionY || 0)} Z:{Math.round(pkg.positionZ || 0)}
                                </span>
                              )}
                            </div>

                            {/* Note */}
                            {pkg.stackingNote && (
                              <div className="flex items-start gap-1 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                <span className="truncate"><strong>Note:</strong> {pkg.stackingNote}</span>
                              </div>
                            )}

                            {/* Touch Actions */}
                            <div className="pt-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                {!isLoaded && !isDamaged && (
                                  <button
                                    onClick={() => {
                                      setSelectedPackageForModal(pkg.id);
                                      setShowDeviationModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 text-[10px] font-semibold rounded-lg border border-slate-800 transition-colors flex items-center gap-1"
                                  >
                                    <Sliders size={12} />
                                    <span>Deviate</span>
                                  </button>
                                )}
                                {!isLoaded && (
                                  <button
                                    onClick={() => {
                                      setSelectedPackageForModal(pkg.id);
                                      setShowExceptionModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-red-400 text-[10px] font-semibold rounded-lg border border-slate-800 transition-colors flex items-center gap-1"
                                  >
                                    <Flag size={12} />
                                    <span>Issue</span>
                                  </button>
                                )}
                              </div>

                              {isLoaded ? (
                                <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-lg flex items-center gap-1">
                                  <CheckCircle2 size={13} />
                                  <span>LOADED</span>
                                </div>
                              ) : isDamaged ? (
                                <div className="px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-[10px] rounded-lg flex items-center gap-1">
                                  <ShieldAlert size={12} />
                                  <span>EXCEPTION</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleQuickConfirmLoad(pkg.id)}
                                  disabled={loadingPackageId === pkg.id}
                                  className={`px-4 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md disabled:opacity-60 ${
                                    isNext
                                      ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-95 shadow-primary/30'
                                      : 'bg-primary text-white hover:opacity-90'
                                  }`}
                                >
                                  {loadingPackageId === pkg.id ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin text-white" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={14} />
                                      <span>Confirm Loaded</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 1. Barcode Scanner Modal */}
      {showScannerModal && (
        <BarcodeScannerModal
          assignedTruck={assignedTruck}
          packages={packages}
          onClose={() => setShowScannerModal(false)}
          onScanVerify={handleScanVerify}
        />
      )}

      {/* 2. Exception Reporting Modal */}
      {showExceptionModal && (
        <LoaderExceptionModal
          currentShipment={currentShipment}
          packages={packages}
          preselectedPackageId={selectedPackageForModal}
          onClose={() => setShowExceptionModal(false)}
          onExceptionReported={(pkgId, type, note) => {
            if (pkgId) {
              setPackages((prev) =>
                prev.map((p) =>
                  p.id === pkgId
                    ? {
                        ...p,
                        status: type === 'DAMAGED' ? 'DAMAGED' : p.status,
                        isLoaded: false,
                        stackingNote: `[EXCEPTION: ${type}] ${note}`,
                      }
                    : p
                )
              );
            }
          }}
        />
      )}

      {/* 3. Loading Deviation Modal */}
      {showDeviationModal && (
        <LoaderDeviationModal
          currentShipment={currentShipment}
          packages={packages}
          preselectedPackageId={selectedPackageForModal}
          onClose={() => setShowDeviationModal(false)}
          onDeviationSaved={(pkgId, deviationNote) => {
            setPackages((prev) =>
              prev.map((p) =>
                p.id === pkgId
                  ? {
                      ...p,
                      isLoaded: true,
                      status: 'LOADED',
                      stackingNote: deviationNote,
                    }
                  : p
              )
            );
          }}
        />
      )}

      {/* 4. Loading Completion Modal */}
      {showCompletionModal && (
        <LoaderCompletionModal
          currentShipment={currentShipment}
          assignedTruck={assignedTruck}
          packages={packages}
          onClose={() => setShowCompletionModal(false)}
          onCompleted={() => {
            setCurrentShipment((prev) => (prev ? { ...prev, status: 'READY' } : prev));
            loadDashboardData();
          }}
        />
      )}

      {/* 5. Live Activity Drawer */}
      {showActivityDrawer && (
        <LoaderActivityDrawer
          currentShipment={currentShipment}
          onClose={() => setShowActivityDrawer(false)}
        />
      )}
    </AppLayout>
  );
}

export default function LoaderDashboardClient() {
  return <LoaderDashboardInner />;
}
