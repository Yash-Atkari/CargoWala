'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Truck, Shipment, LoadingPackage } from '@/lib/types';
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
  Compass,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import Loader3DViewModal from './components/Loader3DViewModal';
import LoaderExceptionModal from './components/LoaderExceptionModal';
import LoaderDeviationModal from './components/LoaderDeviationModal';
import LoaderCompletionModal from './components/LoaderCompletionModal';
import LoaderActivityDrawer from './components/LoaderActivityDrawer';
import StatusBadge from '@/components/ui/StatusBadge';

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

  // Modals & Drawers state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'QUEUED' | 'LOADED' | 'EXCEPTIONS'>('ALL');
  const [stopFilter, setStopFilter] = useState<string>('ALL');

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

      // 1. Fetch all shipments assigned to this loader
      let userShipments: Shipment[] = [];
      try {
        const shipRes = await fetch(`/api/shipments?loaderId=${user.id}&all=true`);
        if (shipRes.ok) {
          userShipments = await shipRes.json();
          setAssignedDispatches(userShipments);
        }
      } catch (e) {
        console.error('Error fetching loader shipments:', e);
      }

      // 2. Identify target shipment
      let targetShipment: Shipment | null = null;
      if (selectedShipmentId) {
        targetShipment = userShipments.find((s) => s.id === selectedShipmentId) || null;
      }
      if (!targetShipment && userShipments.length > 0) {
        targetShipment = userShipments[0];
        setSelectedShipmentId(targetShipment.id);
      }

      // 3. Identify truck
      const targetTruckId = targetShipment?.truckId || user.assignedTruckId || 'truck-001';
      const truckRes = await fetch(`/api/trucks?id=${targetTruckId}`);
      let truckData: Truck | null = null;
      if (truckRes.ok) {
        truckData = await truckRes.json();
        setAssignedTruck(truckData);
      }

      // 4. Fallback shipment from truck if none found
      if (!targetShipment && truckData && truckData.currentShipmentId) {
        const fallbackShipRes = await fetch(`/api/shipments?id=${truckData.currentShipmentId}`);
        if (fallbackShipRes.ok) {
          targetShipment = await fallbackShipRes.json();
        }
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
    loadDashboardData();
  }, [user, selectedShipmentId]);

  // Loading metrics
  const totalPackages = packages.length;
  const loadedPackages = packages.filter((p) => p.isLoaded).length;
  const remainingPackages = packages.filter((p) => !p.isLoaded && p.status !== 'DAMAGED').length;
  const progressPercent = totalPackages > 0 ? Math.round((loadedPackages / totalPackages) * 100) : 0;
  const damagedPackagesCount = packages.filter((p) => p.status === 'DAMAGED').length;

  const currentLoadedWeight = useMemo(() => {
    return packages
      .filter((p) => p.isLoaded)
      .reduce((sum, p) => sum + (p.weight || 0), 0);
  }, [packages]);

  // Unique delivery stops for stop filter
  const deliveryStops = useMemo(() => {
    const stops = new Set<number>();
    packages.forEach((p) => {
      if (p.deliverySequence) stops.add(p.deliverySequence);
    });
    return Array.from(stops).sort((a, b) => a - b);
  }, [packages]);

  // Stacking safety & damage alerts
  const safetyAlertPackages = useMemo(() => {
    return packages.filter(
      (p) => p.fragilityLevel === 'FRAGILE' || (p.riskScore && p.riskScore >= 65) || p.stackingNote
    );
  }, [packages]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages
      .filter((pkg) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          pkg.name.toLowerCase().includes(q) ||
          pkg.digitalId.toLowerCase().includes(q) ||
          pkg.id.toLowerCase().includes(q) ||
          pkg.destination.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'QUEUED' && !pkg.isLoaded && pkg.status !== 'DAMAGED') ||
          (statusFilter === 'LOADED' && pkg.isLoaded) ||
          (statusFilter === 'EXCEPTIONS' && pkg.status === 'DAMAGED');

        const matchesStop =
          stopFilter === 'ALL' || String(pkg.deliverySequence || 1) === stopFilter;

        return matchesSearch && matchesStatus && matchesStop;
      })
      .sort((a, b) => (a.loadingOrder || 999) - (b.loadingOrder || 999));
  }, [packages, searchQuery, statusFilter, stopFilter]);

  // Next expected loading step
  const nextStepPackage = useMemo(() => {
    const queued = [...packages]
      .filter((p) => !p.isLoaded && p.status !== 'DAMAGED')
      .sort((a, b) => (a.loadingOrder || 999) - (b.loadingOrder || 999));
    return queued[0] || null;
  }, [packages]);

  // Actions
  const handleScanVerify = async (scannedId: string): Promise<boolean> => {
    const clean = scannedId.trim().toUpperCase();
    const match = packages.find(
      (p) =>
        p.id.toUpperCase() === clean ||
        p.digitalId.toUpperCase() === clean ||
        p.name.toUpperCase().includes(clean)
    );

    if (!match) return false;

    try {
      const response = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: match.id, isLoaded: true, status: 'LOADED' }),
      });

      if (response.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === match.id ? { ...p, isLoaded: true, status: 'LOADED' as const } : p))
        );

        // Audit log
        if (currentShipment) {
          fetch('/api/tracking-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shipmentId: currentShipment.id,
              packageId: match.id,
              eventType: 'LOADED',
              description: `Package "${match.name}" (${match.digitalId}) scanned & verified into trailer.`,
              location: currentShipment.origin,
              createdBy: user?.name || 'Loader Staff',
            }),
          });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Scan verify error:', err);
      return false;
    }
  };

  const handleQuickConfirmLoad = async (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;

    try {
      const res = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkgId, isLoaded: true, status: 'LOADED' }),
      });

      if (res.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkgId ? { ...p, isLoaded: true, status: 'LOADED' as const } : p))
        );
        toast.success(`Loaded "${pkg.name}" (${pkg.digitalId})`);

        if (currentShipment) {
          fetch('/api/tracking-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shipmentId: currentShipment.id,
              packageId: pkgId,
              eventType: 'LOADED',
              description: `Loader confirmed physical placement for "${pkg.name}" (${pkg.digitalId}) at Step #${pkg.loadingOrder || 1}.`,
              location: currentShipment.origin,
              createdBy: user?.name || 'Loading Operator',
            }),
          });
        }
      } else {
        toast.error('Failed to update package loading state');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during load confirmation');
    }
  };

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-[#070D1E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium">Loading live bay station data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  if (user.role !== 'LOADER') {
    return (
      <div className="min-h-screen bg-[#070D1E] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-400">Access denied. Loader role required.</p>
          <button
            onClick={() => router.push('/admin-dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Go to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!assignedTruck || !currentShipment) {
    return (
      <AppLayout role="LOADER" userName={user.name} userEmail={user.email}>
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="p-8 max-w-md bg-[#0F172A] border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <TruckIcon size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Active Dispatch Assigned</h3>
              <p className="text-xs text-slate-400 mt-1">
                You are currently in free float. As soon as the Dispatch Admin creates a vehicle shipment and assigns your bay station, it will appear here immediately.
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Check for New Dispatches</span>
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="LOADER" userName={user.name} userEmail={user.email}>
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

            {/* 3D Cargo Viewer */}
            <button
              onClick={() => {
                setSelectedPackageForModal(nextStepPackage?.id || null);
                setShow3DModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Box size={15} className="text-primary" />
              <span>3D Cargo View</span>
            </button>

            {/* Activity History Toggle */}
            <button
              onClick={() => setShowActivityDrawer(true)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white transition-colors border border-slate-800"
              title="View bay activity history"
            >
              <History size={16} />
            </button>

            {/* Complete Loading Session Button */}
            <button
              onClick={() => setShowCompletionModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <CheckCircle2 size={15} />
              <span>Complete Loading</span>
            </button>
          </div>
        </div>

        {/* Operational KPI Bento Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
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

          {/* 5. Next Step Action Box */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center gap-1">
              <Sparkles size={12} />
              <span>Next Expected Step</span>
            </span>
            {nextStepPackage ? (
              <div className="mt-1">
                <span className="font-mono text-xs font-black text-white block truncate">
                  Step #{nextStepPackage.loadingOrder || 1}: {nextStepPackage.name}
                </span>
                <span className="text-[10px] text-slate-300 block">
                  {nextStepPackage.weight}kg · Stop #{nextStepPackage.deliverySequence || 1}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-emerald-400 mt-1">
                ✓ All items loaded!
              </span>
            )}
            {nextStepPackage && (
              <button
                onClick={() => handleQuickConfirmLoad(nextStepPackage.id)}
                className="w-full mt-2 py-1 bg-primary hover:bg-primary/90 text-white font-bold text-[11px] rounded-lg transition-colors"
              >
                Confirm Load #{nextStepPackage.loadingOrder || 1}
              </button>
            )}
          </div>
        </div>

        {/* Safety & Damage Warnings Banner (Requirement 8) */}
        {safetyAlertPackages.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle size={15} />
                <span>Cargo Handling & Fragility Directives ({safetyAlertPackages.length} Items)</span>
              </span>
              <span className="text-[10px] text-amber-300">
                Observe stacking limits & anti-crush guidance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {safetyAlertPackages.slice(0, 3).map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-2 bg-slate-900/80 border border-amber-500/20 rounded-xl text-xs flex items-start gap-2"
                >
                  <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white block truncate">
                      {pkg.name} ({pkg.digitalId})
                    </span>
                    <span className="text-[10px] text-amber-300/90 block truncate">
                      {pkg.stackingNote || `Fragile (${pkg.fragilityLevel}) — Top tier only`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search, Filter Bar & Quick Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F172A] p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Manifest ({packages.length})</option>
              <option value="QUEUED">Queued ({remainingPackages})</option>
              <option value="LOADED">Loaded ({loadedPackages})</option>
              <option value="EXCEPTIONS">Exceptions ({damagedPackagesCount})</option>
            </select>

            {/* Stop Filter */}
            {deliveryStops.length > 1 && (
              <select
                value={stopFilter}
                onChange={(e) => setStopFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
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

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPackageForModal(null);
                setShowDeviationModal(true);
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-850 text-amber-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Sliders size={13} />
              <span>Record Deviation</span>
            </button>
            <button
              onClick={() => {
                setSelectedPackageForModal(null);
                setShowExceptionModal(true);
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-850 text-red-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert size={13} />
              <span>Report Issue</span>
            </button>
          </div>
        </div>

        {/* AI Loading Plan Sequence Cards (Requirement 3 & 6) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span>AI Loading Plan Sequence ({filteredPackages.length} Packages)</span>
            </h2>
            <span className="text-xs text-slate-500">
              Arranged in reverse unloading order (LIFO)
            </span>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="p-12 text-center bg-[#0F172A] border border-slate-800 rounded-2xl text-xs text-slate-500 space-y-2">
              <PackageIcon size={32} className="mx-auto text-slate-600 mb-1" />
              <p className="font-semibold text-slate-400">No packages match the current filter</p>
              <p className="text-[11px]">Clear search or select &quot;All Manifest&quot; to view all items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
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
                    className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isDamaged
                        ? 'border-red-500/40 bg-red-950/10'
                        : isLoaded
                        ? 'border-emerald-500/25 bg-emerald-950/10 opacity-80'
                        : isNext
                        ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
                        : 'border-slate-800 bg-[#0F172A] hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Step #, Digital ID, Specs */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Step Order Badge */}
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-primary/20 text-primary border border-primary/30">
                          Step #{pkg.loadingOrder || 1}
                        </span>

                        {/* Digital ID */}
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {pkg.digitalId}
                        </span>

                        {/* Fragility */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeStyle}`}>
                          {pkg.fragilityLevel}
                        </span>

                        {/* Delivery Stop */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                          Stop #{pkg.deliverySequence || 1}
                        </span>

                        {/* Next up indicator */}
                        {isNext && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            ★ LOAD NOW
                          </span>
                        )}
                      </div>

                      {/* Package Name & Destination */}
                      <div>
                        <h3 className={`text-base font-bold ${isDamaged ? 'text-red-400 line-through' : 'text-white'}`}>
                          {pkg.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          Dest: <strong className="text-slate-200">{pkg.destination}</strong>
                        </span>
                      </div>

                      {/* Specs & 3D Placement Coordinates */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 pt-0.5">
                        <span>
                          Dimensions:{' '}
                          <strong className="text-white">
                            {pkg.length}×{pkg.width}×{pkg.height} cm
                          </strong>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>
                          Mass: <strong className="text-white">{pkg.weight} kg</strong>
                        </span>
                        {pkg.positionX !== null && pkg.positionX !== undefined && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                              3D Spot: X:{Math.round(pkg.positionX)} Y:{Math.round(pkg.positionY || 0)} Z:{Math.round(pkg.positionZ || 0)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Stacking / Deviation Note */}
                      {pkg.stackingNote && (
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mt-1">
                          <AlertCircle size={13} className="shrink-0 mt-0.5" />
                          <span>
                            <strong>Note:</strong> {pkg.stackingNote}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Touch Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:self-center">
                      {/* View in 3D */}
                      <button
                        onClick={() => {
                          setSelectedPackageForModal(pkg.id);
                          setShow3DModal(true);
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1"
                        title="Locate package inside 3D container"
                      >
                        <Box size={14} className="text-primary" />
                        <span>3D Loc</span>
                      </button>

                      {/* Deviation Action */}
                      {!isLoaded && !isDamaged && (
                        <button
                          onClick={() => {
                            setSelectedPackageForModal(pkg.id);
                            setShowDeviationModal(true);
                          }}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1"
                          title="Record alternate placement"
                        >
                          <Sliders size={14} />
                          <span>Deviate</span>
                        </button>
                      )}

                      {/* Exception / Issue Button */}
                      {!isLoaded && (
                        <button
                          onClick={() => {
                            setSelectedPackageForModal(pkg.id);
                            setShowExceptionModal(true);
                          }}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-red-400 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1"
                          title="Report damaged or missing parcel"
                        >
                          <Flag size={14} />
                          <span>Issue</span>
                        </button>
                      )}

                      {/* Primary Loading Confirmation */}
                      {isLoaded ? (
                        <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 size={16} />
                          <span>LOADED</span>
                        </div>
                      ) : isDamaged ? (
                        <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center gap-1.5">
                          <ShieldAlert size={14} />
                          <span>EXCEPTION</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleQuickConfirmLoad(pkg.id)}
                          className={`px-5 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md ${
                            isNext
                              ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-95 shadow-primary/30 text-sm'
                              : 'bg-primary text-white hover:opacity-90'
                          }`}
                        >
                          <Check size={16} />
                          <span>Confirm Loaded</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* 2. 3D Loading View Modal */}
      {show3DModal && (
        <Loader3DViewModal
          assignedTruck={assignedTruck}
          packages={packages}
          selectedPackageId={selectedPackageForModal}
          onClose={() => setShow3DModal(false)}
        />
      )}

      {/* 3. Exception Reporting Modal */}
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

      {/* 4. Loading Deviation Modal */}
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

      {/* 5. Loading Completion Modal */}
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

      {/* 6. Live Activity Drawer */}
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
  return (
    <AuthProvider>
      <LoaderDashboardInner />
    </AuthProvider>
  );
}
