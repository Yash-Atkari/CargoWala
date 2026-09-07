'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Truck, Shipment, Package } from '@/lib/types';
import { getStopColor } from '@/lib/loadingOptimizer';
import {
  Navigation,
  Truck as TruckIcon,
  MapPin,
  Package as PackageIcon,
  User,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Loader2,
  X,
  Layers,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

function DriverDashboardInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [truck, setTruck] = useState<Truck | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [allTrucks, setAllTrucks] = useState<Truck[]>([]);
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);

  // Accordion state for stops
  const [expandedStops, setExpandedStops] = useState<Record<number, boolean>>({ 1: true });

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [trackingLogs, setTrackingLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deliveringPkgId, setDeliveringPkgId] = useState<string | null>(null);
  const [selectedStopFilter, setSelectedStopFilter] = useState<string>('all');

  // Fetch initial data (trucks, shipments, users)
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setDashboardLoading(true);
        const [tRes, sRes, uRes] = await Promise.all([
          fetch('/api/trucks'),
          fetch('/api/shipments'),
          fetch('/api/users?role=LOADER'),
        ]);

        const fetchedTrucks: Truck[] = tRes.ok ? await tRes.json() : [];
        const fetchedShipments: Shipment[] = sRes.ok ? await sRes.json() : [];

        setAllTrucks(fetchedTrucks);
        setAllShipments(fetchedShipments);

        // Select initial active or existing shipment from database
        const initialShipment =
          fetchedShipments.find(
            (s) =>
              s.status === 'IN_TRANSIT' ||
              s.status === 'DISPATCHED' ||
              s.status === 'LOADED' ||
              s.status === 'READY'
          ) || fetchedShipments[0];

        if (initialShipment) {
          setShipment(initialShipment);
          const foundTruck = fetchedTrucks.find((t) => t.id === initialShipment.truckId);
          setTruck(foundTruck || null);

          loadShipmentPackages(initialShipment.id);
          fetchTrackingLogs(initialShipment.id);
        }
      } catch (err) {
        console.error('Error fetching driver dashboard data:', err);
      } finally {
        setDashboardLoading(false);
      }
    };

    if (isAuthenticated) fetchDriverData();
  }, [isAuthenticated, user]);

  const loadShipmentPackages = async (shipmentId: string) => {
    try {
      const pRes = await fetch(`/api/packages?shipmentId=${shipmentId}`);
      if (pRes.ok) {
        const pkgs: Package[] = await pRes.json();
        setPackages(pkgs || []);
        return;
      }
      setPackages([]);
    } catch (err) {
      console.error('Error loading shipment packages:', err);
      setPackages([]);
    }
  };

  const fetchTrackingLogs = async (shipmentId: string) => {
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/tracking-events?shipmentId=${shipmentId}`);
      if (res.ok) {
        setTrackingLogs(await res.json());
      }
    } catch (err) {
      console.error('Error fetching tracking events:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenAuditLogs = (targetShipmentId?: string) => {
    const sId = targetShipmentId || shipment?.id;
    if (sId) {
      fetchTrackingLogs(sId);
      setShowLogsModal(true);
    } else {
      toast.info('No active shipment selected for audit logs.');
    }
  };

  // Select Shipment Handler
  const handleSelectShipment = async (shipmentId: string) => {
    const match = allShipments.find((s) => s.id === shipmentId);
    if (!match) return;
    setShipment(match);

    const foundTruck = allTrucks.find((t) => t.id === match.truckId);
    setTruck(foundTruck || null);

    loadShipmentPackages(match.id);
    fetchTrackingLogs(match.id);
  };

  // Toggle stop accordion open/close
  const toggleStopExpand = (stopNumber: number) => {
    setExpandedStops((prev) => ({
      ...prev,
      [stopNumber]: !prev[stopNumber],
    }));
  };

  // Group packages by delivery stop sequence
  const stops = useMemo(() => {
    const map = new Map<number, { destination: string; packages: Package[] }>();
    packages.forEach((p) => {
      const seq = p.deliverySequence || 1;
      if (!map.has(seq)) {
        map.set(seq, { destination: p.destination || `Stop #${seq}`, packages: [] });
      }
      map.get(seq)!.packages.push(p);
    });

    return Array.from(map.entries())
      .map(([stopNumber, data]) => {
        const deliveredPkgs = data.packages.filter((p) => p.status === 'DELIVERED').length;
        const totalStopPkgs = data.packages.length;

        return {
          stopNumber,
          destination: data.destination,
          packages: data.packages,
          deliveredPkgs,
          totalStopPkgs,
          isCompleted: deliveredPkgs === totalStopPkgs && totalStopPkgs > 0,
        };
      })
      .sort((a, b) => a.stopNumber - b.stopNumber);
  }, [packages]);

  // Operational metrics
  const totalPackages = packages.length;
  const deliveredCount = packages.filter((p) => p.status === 'DELIVERED').length;
  const pendingCount = totalPackages - deliveredCount;
  const issueCount = packages.filter(
    (p) => p.status === 'DAMAGED' || p.status === 'CANCELLED'
  ).length;

  // Filtered stops and packages
  const filteredStops = useMemo(() => {
    return stops
      .map((stop) => {
        if (selectedStopFilter !== 'all' && stop.stopNumber !== Number(selectedStopFilter)) {
          return null;
        }

        const filteredPkgs = stop.packages.filter((p) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesName = p.name.toLowerCase().includes(q);
            const matchesId = p.digitalId && p.digitalId.toLowerCase().includes(q);
            const matchesDest = p.destination && p.destination.toLowerCase().includes(q);
            if (!matchesName && !matchesId && !matchesDest) return false;
          }

          return true;
        });

        if (searchQuery.trim() && filteredPkgs.length === 0) return null;

        return {
          ...stop,
          displayPackages: filteredPkgs,
        };
      })
      .filter(Boolean) as (typeof stops[0] & { displayPackages: Package[] })[];
  }, [stops, selectedStopFilter, searchQuery]);

  // Handle Mark Package Delivered
  const handleDeliverPackage = async (packageId: string) => {
    try {
      setDeliveringPkgId(packageId);
      const targetPkg = packages.find((p) => p.id === packageId);
      const res = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: packageId, status: 'DELIVERED' }),
      });

      if (res.ok) {
        const resData = await res.json();
        await fetch('/api/tracking-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipmentId: shipment?.id || 'shipment-001',
            packageId: packageId,
            eventType: 'DELIVERED',
            description: `Package ${targetPkg?.name || packageId} delivered at Stop #${targetPkg?.deliverySequence || 1} (${targetPkg?.destination || 'Destination'}).`,
            location: targetPkg?.destination || shipment?.destination || 'Hub Location',
            createdBy: user?.name || 'Station Operator',
          }),
        });

        const updatedPkgs = packages.map((p) =>
          p.id === packageId ? { ...p, status: 'DELIVERED' as const } : p
        );
        setPackages(updatedPkgs);

        // Check if all packages for this shipment are now delivered
        const allDelivered = updatedPkgs.every(
          (p) => p.status === 'DELIVERED' || p.status === 'CANCELLED'
        );

        if (allDelivered && shipment) {
          setShipment((prev) => (prev ? { ...prev, status: 'DELIVERED' } : null));
          setAllShipments((prev) =>
            prev.map((s) => (s.id === shipment.id ? { ...s, status: 'DELIVERED' } : s))
          );
          if (truck) {
            setTruck((prev) => (prev ? { ...prev, status: 'AVAILABLE', currentShipmentId: undefined, currentUtilization: 0, weightUtilization: 0 } : null));
            setAllTrucks((prev) =>
              prev.map((t) => (t.id === truck.id ? { ...t, status: 'AVAILABLE', currentShipmentId: undefined, currentUtilization: 0, weightUtilization: 0 } : t))
            );
            await fetch('/api/trucks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: truck.id,
                status: 'AVAILABLE',
                currentShipmentId: null,
                currentUtilization: 0,
                weightUtilization: 0,
              }),
            });
          }
          await fetch('/api/shipments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: shipment.id, status: 'DELIVERED' }),
          });
          toast.success('All packages delivered! Shipment status updated to DELIVERED & Vehicle is now AVAILABLE across the app.');
        } else {
          toast.success('Package delivered and logged on Driver Route Hub!');
        }
      }
    } catch (err) {
      toast.error('Failed to confirm delivery');
    } finally {
      setDeliveringPkgId(null);
    }
  };

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-[#070D1E] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading driver route & shipment manifests...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#070D1E] flex items-center justify-center p-4 text-white">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Please sign in to access Driver Route Hub.</p>
          <button
            onClick={() => router.replace('/login-screen')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout role={user.role} userName={user.name} userEmail={user.email}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-white">

        {/* MAIN OUTER CARD CONTAINER MATCHING THE MOCKUP */}
        <div className="bg-[#0B132B] border border-blue-900/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">

          {/* SECTION 1: HEADER BAR (DRIVER & ROUTE LOGISTICS + PAST SHIPMENT SELECTOR & AUDIT LOGS) */}
          <div className="pb-5 border-b border-blue-900/30">
            {/* Title & Top Right Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                  <Navigation size={20} className="text-white fill-white" />
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Driver & Route Logistics
                  </h1>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    Admin Operational Hub
                  </span>
                </div>
              </div>

              {/* Right Header Actions: Past Shipment Selector + Audit Logs */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                {/* Past Shipment Selector Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#0D1836] border border-blue-900/50 rounded-xl px-3 py-1.5 text-blue-300 text-xs">
                  <PackageIcon size={14} className="text-blue-400 shrink-0" />
                  <span className="text-slate-400 font-medium">Past Shipment:</span>
                  <select
                    value={shipment?.id || ''}
                    onChange={(e) => handleSelectShipment(e.target.value)}
                    className="bg-transparent text-blue-300 font-semibold focus:outline-none cursor-pointer text-xs"
                  >
                    {allShipments.length === 0 ? (
                      <option value="" className="bg-[#0B132B] text-white">No Shipments Found</option>
                    ) : (
                      allShipments.map((s) => {
                        const sTruck = allTrucks.find((t) => t.id === s.truckId);
                        const truckName = sTruck?.model || s.truckRegistration || 'Vehicle';
                        return (
                          <option key={s.id} value={s.id} className="bg-[#0B132B] text-white">
                            {s.id} ({truckName} · {s.origin} → {s.destination})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* Audit Logs Trigger Button */}
                <button
                  onClick={() => handleOpenAuditLogs()}
                  className="px-3.5 py-1.5 bg-[#0D1836] hover:bg-[#13234d] text-blue-300 hover:text-white border border-blue-900/50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="View shipment audit & tracking logs"
                >
                  <History size={14} className="text-blue-400" />
                  <span>Audit Logs</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: TITLE & OPERATIONAL METRICS SUMMARY ROW */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Title & Subtitle showing Vehicle, Shipment, Route, and Driver */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>{truck?.model || truck?.registrationNumber || shipment?.truckRegistration || 'No Vehicle'}</span>
                  <span className="text-blue-500 font-normal">·</span>
                  <span className="text-blue-400 font-mono">{shipment?.id || 'No Shipment'}</span>
                  <span className="text-blue-500 font-normal">·</span>
                  <span className="text-slate-300 font-mono">{shipment ? `${shipment.origin} → ${shipment.destination}` : 'No Active Route'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-300 font-semibold">
                    Status: <strong className={shipment?.status === 'COMPLETED' || shipment?.status === 'DELIVERED' ? 'text-emerald-400' : 'text-blue-400'}>{shipment?.status || 'N/A'}</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Right Metric Cards (4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              {/* Card 1: Total Packages */}
              <div className="bg-[#0D1735]/80 border border-blue-900/40 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <PackageIcon size={16} />
                </div>
                <div>
                  <div className="text-base font-bold text-white leading-tight">{totalPackages}</div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Packages</div>
                </div>
              </div>

              {/* Card 2: Delivered */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div className="text-base font-bold text-emerald-400 leading-tight">{deliveredCount}</div>
                  <div className="text-[10px] font-medium text-emerald-500/80 uppercase tracking-wider">Delivered</div>
                </div>
              </div>

              {/* Card 3: Pending */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="text-base font-bold text-amber-400 leading-tight">{pendingCount}</div>
                  <div className="text-[10px] font-medium text-amber-500/80 uppercase tracking-wider">Pending</div>
                </div>
              </div>

              {/* Card 4: Issue */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <XCircle size={16} />
                </div>
                <div>
                  <div className="text-base font-bold text-rose-400 leading-tight">{issueCount}</div>
                  <div className="text-[10px] font-medium text-rose-500/80 uppercase tracking-wider">Issue</div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: SEARCH BAR & DROPDOWN FILTERS */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages by name, ID, or destination..."
                className="w-full bg-[#070E22] border border-blue-900/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Stop Filter Dropdown */}
            <select
              value={selectedStopFilter}
              onChange={(e) => setSelectedStopFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#070E22] border border-blue-900/40 text-slate-300 font-semibold text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all" className="bg-[#0B132B] text-white">
                All Stops ({totalPackages} pkgs)
              </option>
              {stops.map((s) => (
                <option key={`stop-opt-${s.stopNumber}`} value={s.stopNumber} className="bg-[#0B132B] text-white">
                  Stop #{s.stopNumber} - {s.destination} ({s.deliveredPkgs}/{s.totalStopPkgs} Done)
                </option>
              ))}
            </select>
          </div>

          {/* SECTION 4: ACCORDION GROUPED STOPS & PACKAGE TABLES */}
          <div className="space-y-3 pt-1">
            {filteredStops.length === 0 ? (
              <div className="text-center py-10 bg-[#070E22]/60 rounded-2xl border border-blue-900/30">
                <p className="text-xs text-slate-400">No route stops or packages match your selected filters.</p>
              </div>
            ) : (
              filteredStops.map((stop) => {
                const isExpanded = !!expandedStops[stop.stopNumber];
                const isCompleted = stop.isCompleted;

                return (
                  <div
                    key={`stop-accordion-${stop.stopNumber}`}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? isCompleted
                          ? 'border-emerald-500/50 bg-[#0A162B] shadow-lg shadow-emerald-950/20'
                          : 'border-blue-500/50 bg-[#0A162B] shadow-lg shadow-blue-950/20'
                        : 'border-blue-900/40 bg-[#080E24] hover:border-blue-900/80'
                    }`}
                  >
                    {/* STOP HEADER ACCORDION BAR */}
                    <div
                      onClick={() => toggleStopExpand(stop.stopNumber)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      {/* Left: Check/Status Circle + Stop Title + Location/ETA */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Circle Status Badge */}
                        {isCompleted ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 shrink-0">
                            <CheckCircle2 size={18} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-blue-500/60 bg-blue-500/10 flex items-center justify-center shrink-0">
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white tracking-tight">
                              Stop #{stop.stopNumber} · {stop.destination}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-blue-400" />
                              {stop.destination}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span>{stop.totalStopPkgs} Package{stop.totalStopPkgs === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Delivered Status Pill + Chevron */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        {/* Delivered Count Status Pill */}
                        {isCompleted ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            {stop.deliveredPkgs}/{stop.totalStopPkgs} Delivered
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5">
                            <Clock size={13} />
                            {stop.deliveredPkgs}/{stop.totalStopPkgs} Delivered
                          </span>
                        )}

                        {/* Accordion Chevron */}
                        <div className="text-slate-400 hover:text-white transition-colors">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED PACKAGE TABLE FOR THIS STOP */}
                    {isExpanded && (
                      <div className="border-t border-blue-900/30 bg-[#060C1E]/80 p-4 space-y-3">
                        <div className="overflow-x-auto scrollbar-thin">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-blue-900/40">
                                <th className="pb-2.5 px-3">Package ID</th>
                                <th className="pb-2.5 px-3">Cargo Name</th>
                                <th className="pb-2.5 px-3">Dimensions (cm)</th>
                                <th className="pb-2.5 px-3">Weight</th>
                                <th className="pb-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-900/20 text-xs">
                              {stop.displayPackages.map((pkg) => {
                                const isDelivered = pkg.status === 'DELIVERED';
                                return (
                                  <tr
                                    key={pkg.id}
                                    className="hover:bg-blue-950/30 transition-colors text-slate-200"
                                  >
                                    <td className="py-3 px-3 font-mono text-slate-300 font-semibold">
                                      {pkg.digitalId || pkg.id}
                                    </td>
                                    <td className="py-3 px-3 font-bold text-white">{pkg.name}</td>
                                    <td className="py-3 px-3 text-slate-400">
                                      {pkg.length} × {pkg.width} × {pkg.height}
                                    </td>
                                    <td className="py-3 px-3 font-semibold text-slate-200">
                                      {pkg.weight} kg
                                    </td>
                                    <td className="py-3 px-3">
                                      {isDelivered ? (
                                        <span className="px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5 w-max">
                                          <CheckCircle2 size={12} /> Delivered
                                        </span>
                                      ) : user?.role !== 'ADMIN' ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeliverPackage(pkg.id);
                                          }}
                                          disabled={deliveringPkgId === pkg.id}
                                          className="px-3 py-1 rounded-full bg-blue-950/80 hover:bg-blue-900/80 text-blue-400 border border-blue-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1.5 w-max cursor-pointer disabled:opacity-50"
                                        >
                                          {deliveringPkgId === pkg.id ? (
                                            <Loader2 size={12} className="animate-spin" />
                                          ) : (
                                            <CheckCircle2 size={12} />
                                          )}
                                          <span>{deliveringPkgId === pkg.id ? 'Unloading...' : 'Confirm Unloaded'}</span>
                                        </button>
                                      ) : (
                                        <span className="px-3 py-1 rounded-full bg-blue-950/80 text-blue-400 border border-blue-500/40 text-[11px] font-semibold flex items-center gap-1.5 w-max">
                                          <Clock size={12} /> In Transit
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SECTION 5: FOOTER STRING */}
          <div className="pt-2 text-xs text-slate-400 font-medium">
            Showing {totalPackages} of {totalPackages} packages
          </div>

        </div>

        {/* Audit Logs Stream Modal */}
        {showLogsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0B132B] border border-blue-900/50 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-white">
              <div className="p-4 border-b border-blue-900/40 flex items-center justify-between bg-[#070E22]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <History size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Shipment & Truck Audit Logs</h2>
                    <p className="text-xs text-slate-400">
                      {shipment?.id} · {truck?.registrationNumber || 'Vehicle Audit Stream'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-1.5 rounded-lg hover:bg-blue-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                {logsLoading ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit logs...
                  </div>
                ) : trackingLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No tracking events recorded for this shipment yet.
                  </p>
                ) : (
                  trackingLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#070E22] border border-blue-900/30 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-400 text-[11px] font-mono">
                          {log.eventType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs">{log.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-blue-900/20">
                        <span>Location: {log.location || 'Hub'}</span>
                        <span>By: {log.createdBy || 'System'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

export default function DriverDashboard() {
  return <DriverDashboardInner />;
}
