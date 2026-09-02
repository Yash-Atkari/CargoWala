'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import {
  MOCK_TRUCKS,
  MOCK_SHIPMENTS,
  LOADER_PACKAGE_QUEUE,
  MOCK_NOTIFICATIONS,
  MockLoadingPackage,
  MockTruck,
  MockShipment,
} from '@/lib/mockData';
import {
  Truck as TruckIcon,
  Package as PackageIcon,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Box,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

function LoaderDashboardInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Local state for dynamic database query
  const [assignedTruck, setAssignedTruck] = useState<MockTruck | null>(null);
  const [currentShipment, setCurrentShipment] = useState<MockShipment | null>(null);
  const [packages, setPackages] = useState<MockLoadingPackage[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Redirect if not loaded/authenticated
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.replace('/login-screen');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Fetch dashboard data from database APIs
  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      try {
        setDashboardLoading(true);
        const truckId = user.assignedTruckId || 'truck-001';
        const truckRes = await fetch(`/api/trucks?id=${truckId}`);
        if (!truckRes.ok) throw new Error('Failed to fetch truck');
        const truckData = await truckRes.json();
        setAssignedTruck(truckData);

        if (truckData && truckData.currentShipmentId) {
          const shipmentRes = await fetch(`/api/shipments?id=${truckData.currentShipmentId}`);
          if (shipmentRes.ok) {
            const shipmentData = await shipmentRes.json();
            setCurrentShipment(shipmentData);
          }

          const pkgsRes = await fetch(`/api/packages?shipmentId=${truckData.currentShipmentId}`);
          if (pkgsRes.ok) {
            const pkgsData = await pkgsRes.json();
            const mappedPackages = pkgsData.map((p: any) => ({
              ...p,
              loadingOrder: p.loadingOrder || 0,
              isLoaded: !!p.isLoaded,
            }));
            setPackages(mappedPackages);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        toast.error('Failed to load real-time station data');
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading live bay data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Handled by redirect useEffect
  }

  if (user.role !== 'LOADER') {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
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
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-orange-500 mx-auto mb-2" />
          <p className="text-slate-400">No active truck or shipment assigned to this loader bay.</p>
        </div>
      </div>
    );
  }

  // Helper stats
  const totalPackages = packages.length;
  const loadedPackages = packages.filter((p) => p.isLoaded).length;
  const progressPercent = Math.round((loadedPackages / totalPackages) * 100) || 0;
  const damagedPackagesCount = packages.filter((p) => p.status === 'DAMAGED').length;

  // Stacking risk warnings filter
  const loaderNotifications = MOCK_NOTIFICATIONS.filter((n) => n.userId === user.id);

  // Actions
  const handleLoadPackage = async (pkgId: string) => {
    try {
      const response = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkgId, isLoaded: true, status: 'LOADED' }),
      });
      if (response.ok) {
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id === pkgId) {
              const updated = { ...p, isLoaded: true, status: 'LOADED' as const };
              toast.success(`Loaded "${p.name}" successfully!`);
              return updated;
            }
            return p;
          })
        );
      } else {
        toast.error('Failed to update package loading state');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error during package load');
    }
  };

  const handleReportDamage = async (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;

    const isCurrentlyDamaged = pkg.status === 'DAMAGED';
    const newStatus = isCurrentlyDamaged ? ('PENDING' as const) : ('DAMAGED' as const);

    try {
      const response = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkgId,
          status: newStatus,
          isLoaded: isCurrentlyDamaged ? pkg.isLoaded : false,
        }),
      });

      if (response.ok) {
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id === pkgId) {
              const updated = {
                ...p,
                status: newStatus,
                isLoaded: isCurrentlyDamaged ? p.isLoaded : false,
              };

              if (!isCurrentlyDamaged) {
                toast.error(`Reported damage for "${p.name}"`);
              } else {
                toast.info(`Cleared damage report for "${p.name}"`);
              }
              return updated;
            }
            return p;
          })
        );
      } else {
        toast.error('Failed to report damage state');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error reporting damage');
    }
  };

  return (
    <AppLayout role="LOADER" userName={user.name} userEmail={user.email}>
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Loading Station</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Assigned Vehicle:{' '}
              <span className="text-white font-semibold">{assignedTruck.registrationNumber}</span> ·{' '}
              {assignedTruck.model}
            </p>
          </div>

          <button
            onClick={() => router.push('/load-planner')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/10 self-start md:self-auto"
          >
            <Box size={16} />
            Open 3D Load Planner
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Mini Bento Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Progress Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Loading Progress</span>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {loadedPackages}/{totalPackages}
                </span>
                <span className="text-xs font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Assigned Bay */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Loading Bay</span>
              <MapPin className="w-5 h-5 text-orange-400" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-white">Bay #3</span>
              <p className="text-[11px] text-slate-400 mt-1">Mumbai Warehouse A</p>
            </div>
          </div>

          {/* Shipment Weight Utilization */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Weight Capacity</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {assignedTruck.weightUtilization}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Max {assignedTruck.maxWeight.toLocaleString()}kg
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${assignedTruck.weightUtilization}%` }}
                />
              </div>
            </div>
          </div>

          {/* Damaged packages warning */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Incidents</span>
              <AlertTriangle
                className={`w-5 h-5 ${damagedPackagesCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}
              />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-white">{damagedPackagesCount}</span>
              <p className="text-[11px] text-slate-400 mt-1">Damaged reports submitted</p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Loading Queue Column */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <PackageIcon className="text-primary w-5 h-5" />
                  Active Package Queue
                </h2>
                <span className="text-xs text-slate-400 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                  Shipment: {currentShipment.id.toUpperCase()}
                </span>
              </div>

              {/* Package cards container */}
              <div className="space-y-3">
                {packages.map((pkg) => {
                  const isDamaged = pkg.status === 'DAMAGED';
                  const isLoaded = pkg.isLoaded;

                  // Fragility Badge config
                  let fragilityClass = 'bg-slate-800 text-slate-300';
                  if (pkg.fragilityLevel === 'FRAGILE')
                    fragilityClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
                  if (pkg.fragilityLevel === 'HIGH')
                    fragilityClass = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                  if (pkg.fragilityLevel === 'MEDIUM')
                    fragilityClass = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';

                  return (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDamaged
                          ? 'border-red-500/30 bg-red-950/5'
                          : isLoaded
                            ? 'border-green-500/20 bg-green-950/5 opacity-70'
                            : 'border-slate-850 bg-slate-950/50 hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {pkg.digitalId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${fragilityClass}`}
                          >
                            {pkg.fragilityLevel}
                          </span>
                          {pkg.priority === 'URGENT' && (
                            <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30">
                              URGENT
                            </span>
                          )}
                          <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-medium">
                            Seq: {pkg.deliverySequence}
                          </span>
                        </div>
                        <h3
                          className={`text-sm font-bold ${isDamaged ? 'text-red-400 line-through' : 'text-white'}`}
                        >
                          {pkg.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {pkg.length} × {pkg.width} × {pkg.height} cm ·{' '}
                          <span className="font-semibold text-slate-300">{pkg.weight} kg</span>
                        </p>
                        {pkg.stackingNote && (
                          <div className="flex items-start gap-1.5 text-xs text-orange-400/90 bg-orange-500/5 border border-orange-500/10 p-2 rounded-lg mt-2">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>
                              <strong className="font-semibold">Note:</strong> {pkg.stackingNote}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:self-center">
                        {isLoaded ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <CheckCircle2 size={14} />
                            Loaded
                          </div>
                        ) : isDamaged ? (
                          <button
                            onClick={() => handleReportDamage(pkg.id)}
                            className="text-xs text-red-400 font-semibold hover:underline bg-red-500/10 px-3 py-1.5 border border-red-500/20 rounded-xl"
                          >
                            Reset Status
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReportDamage(pkg.id)}
                              className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 text-xs text-slate-400 hover:text-red-400 transition-colors"
                            >
                              Report Damage
                            </button>
                            <button
                              onClick={() => handleLoadPackage(pkg.id)}
                              className="px-4 py-1.5 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/10"
                            >
                              Load Package
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Truck details & notifications */}
          <div className="space-y-6">
            {/* Truck Dimensions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <TruckIcon size={16} className="text-primary" />
                Vehicle Specifications
              </h2>
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Space Volume Utilization</span>
                    <span className="font-semibold text-white">
                      {assignedTruck.currentUtilization}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${assignedTruck.currentUtilization}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Length
                    </span>
                    <span className="text-sm font-bold text-white">{assignedTruck.length} cm</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Width
                    </span>
                    <span className="text-sm font-bold text-white">{assignedTruck.width} cm</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Height
                    </span>
                    <span className="text-sm font-bold text-white">{assignedTruck.height} cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipment Route Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Calendar size={16} className="text-primary" />
                Shipment Transit Info
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Route Origin:</span>
                  <span className="text-white font-semibold">{currentShipment.origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Route Destination:</span>
                  <span className="text-white font-semibold">{currentShipment.destination}</span>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-2.5">
                  <span className="text-slate-400">Departure Schedule:</span>
                  <span className="text-white">Aug 13, 2026 · 14:00 UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transit Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase border border-primary/20">
                    {currentShipment.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Stacking Safety Notifications */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle size={16} className="text-orange-400" />
                Stacking Safety Alerts
              </h2>
              <div className="space-y-3">
                {loaderNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1"
                  >
                    <p className="text-xs font-bold text-white">{notif.title}</p>
                    <p className="text-[11px] text-slate-400 leading-normal">{notif.message}</p>
                    <span className="text-[9px] text-slate-500 block pt-1">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {loaderNotifications.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    No active safety alerts for this vehicle.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function LoaderDashboardPage() {
  return (
    <AuthProvider>
      <LoaderDashboardInner />
    </AuthProvider>
  );
}
