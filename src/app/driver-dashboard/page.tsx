'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Truck, Shipment, Package } from '@/lib/types';
import { getStopColor } from '@/lib/loadingOptimizer';
import {
  Truck as TruckIcon,
  Package as PackageIcon,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Search,
  Navigation,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

function DriverDashboardInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [truck, setTruck] = useState<Truck | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [activeStop, setActiveStop] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Fetch driver assigned vehicle and packages
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setDashboardLoading(true);
        const truckId = user?.assignedTruckId || 'truck-001';
        const truckRes = await fetch(`/api/trucks?id=${truckId}`);
        if (!truckRes.ok) throw new Error('Failed to fetch truck');
        const truckData = await truckRes.json();
        setTruck(truckData);

        if (truckData?.currentShipmentId) {
          const sRes = await fetch(`/api/shipments?id=${truckData.currentShipmentId}`);
          if (sRes.ok) setShipment(await sRes.json());

          const pRes = await fetch(`/api/packages?shipmentId=${truckData.currentShipmentId}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            setPackages(pData);
          }
        }
      } catch (err) {
        console.error('Error fetching driver dashboard data:', err);
      } finally {
        setDashboardLoading(false);
      }
    };

    if (isAuthenticated) fetchDriverData();
  }, [isAuthenticated, user]);

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
      .map(([stopNumber, data]) => ({
        stopNumber,
        destination: data.destination,
        packages: data.packages,
        totalWeight: data.packages.reduce((s, p) => s + p.weight, 0),
        isCompleted: data.packages.every((p) => p.status === 'DELIVERED'),
      }))
      .sort((a, b) => a.stopNumber - b.stopNumber);
  }, [packages]);

  // Packages for currently selected stop
  const currentStopData = stops.find((s) => s.stopNumber === activeStop) || stops[0];

  // Filtered packages by search
  const filteredStopPackages = useMemo(() => {
    if (!currentStopData) return [];
    if (!searchQuery.trim()) return currentStopData.packages;
    const q = searchQuery.toLowerCase();
    return currentStopData.packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.digitalId && p.digitalId.toLowerCase().includes(q)) ||
        (p.destination && p.destination.toLowerCase().includes(q))
    );
  }, [currentStopData, searchQuery]);

  // Handle Proof of Delivery / Mark Package Delivered
  const handleDeliverPackage = async (packageId: string) => {
    try {
      const res = await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: packageId, status: 'DELIVERED' }),
      });

      if (res.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === packageId ? { ...p, status: 'DELIVERED' } : p))
        );
        toast.success('Package delivered and signed by consignee!');
      }
    } catch (err) {
      toast.error('Failed to confirm delivery');
    }
  };

  // Complete entire stop
  const handleCompleteStop = async () => {
    if (!currentStopData) return;
    try {
      const unDelivered = currentStopData.packages.filter((p) => p.status !== 'DELIVERED');
      for (const p of unDelivered) {
        await fetch('/api/packages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, status: 'DELIVERED' }),
        });
      }

      setPackages((prev) =>
        prev.map((p) =>
          (p.deliverySequence || 1) === activeStop ? { ...p, status: 'DELIVERED' } : p
        )
      );

      toast.success(`Stop #${activeStop} (${currentStopData.destination}) completed!`);

      // Advance to next uncompleted stop
      const nextStop = stops.find((s) => s.stopNumber > activeStop && !s.isCompleted);
      if (nextStop) setActiveStop(nextStop.stopNumber);
    } catch (err) {
      toast.error('Failed to complete stop');
    }
  };

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading driver route & delivery manifests...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to access Driver Dashboard.</p>
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

  const totalDelivered = packages.filter((p) => p.status === 'DELIVERED').length;
  const progressPct = packages.length > 0 ? Math.round((totalDelivered / packages.length) * 100) : 0;

  return (
    <AppLayout role={user.role} userName={user.name} userEmail={user.email}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="card-elevated p-5 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Navigation size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">Driver & Route Logistics</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-positive-bg text-positive border border-positive/20">
                    Feature 10
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vehicle: <strong className="text-foreground">{truck?.registrationNumber || 'MH-12-AB-4521'}</strong> · Driver: <span className="text-primary font-semibold">{user.name}</span>
                </p>
              </div>
            </div>

            {/* Delivery Progress Bar */}
            <div className="sm:text-right">
              <div className="text-xs text-muted-foreground font-medium">
                Route Delivery Progress: <strong className="text-foreground">{totalDelivered}/{packages.length} pkgs ({progressPct}%)</strong>
              </div>
              <div className="w-full sm:w-48 bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Route Stops Stepper Navigation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin size={14} className="text-primary" />
              Multi-Stop Delivery Route ({stops.length} Stops)
            </span>
            <span className="text-[10px] text-muted-foreground">Order: Stop 1 (Rear) $\to$ Stop {stops.length} (Cab)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {stops.map((s) => {
              const stopColor = getStopColor(s.stopNumber);
              const isActive = activeStop === s.stopNumber;

              return (
                <div
                  key={`stop-${s.stopNumber}`}
                  onClick={() => setActiveStop(s.stopNumber)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary bg-blue-50/80 shadow-md shadow-blue-500/10 scale-102 ring-2 ring-blue-500/20'
                      : s.isCompleted
                        ? 'border-positive/30 bg-emerald-50/60'
                        : 'border-border bg-card hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-sm"
                      style={{ background: stopColor }}
                    >
                      Stop #{s.stopNumber}
                    </span>
                    {s.isCompleted ? (
                      <span className="text-[10px] text-positive font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Delivered
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {s.packages.filter((p) => p.status === 'DELIVERED').length}/{s.packages.length} Done
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-foreground truncate mb-1">{s.destination}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.packages.length} packages · {s.totalWeight}kg load
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Active Stop Unloading Hub */}
        {currentStopData && (
          <div className="card-elevated p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                  Active Unloading Stop #{currentStopData.stopNumber}
                </span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  {currentStopData.destination}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompleteStop}
                  disabled={currentStopData.isCompleted}
                  className="px-4 py-2 rounded-xl gradient-primary text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <FileCheck size={14} />
                  Complete Stop & Sign PoD
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages for this stop by ID or name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>

            {/* Packages list for this stop */}
            <div className="space-y-2.5">
              {filteredStopPackages.map((p) => {
                const isDelivered = p.status === 'DELIVERED';

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDelivered
                        ? 'border-positive/30 bg-emerald-50/60'
                        : 'border-border bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{p.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{p.digitalId}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            p.fragilityLevel === 'FRAGILE'
                              ? 'bg-negative-bg text-negative border border-negative/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {p.fragilityLevel}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                        <span>Weight: <strong className="text-foreground">{p.weight}kg</strong></span>
                        <span>Dimensions: {p.length}×{p.width}×{p.height}cm</span>
                        {p.loadingOrder && (
                          <span className="text-primary font-bold">
                            Extraction Step: #{p.loadingOrder}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDelivered ? (
                        <span className="text-xs text-positive font-bold flex items-center gap-1">
                          <CheckCircle2 size={14} /> Delivered
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeliverPackage(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          Confirm Unloaded
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function DriverDashboard() {
  return (
    <AuthProvider>
      <DriverDashboardInner />
    </AuthProvider>
  );
}
