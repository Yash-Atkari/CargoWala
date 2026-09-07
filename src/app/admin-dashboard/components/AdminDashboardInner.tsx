'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import AdminMetricsBento from './AdminMetricsBento';
import AdminChartsRow from './AdminChartsRow';
import AdminTrucksTable from './AdminTrucksTable';
import AdminShipmentsTable from './AdminShipmentsTable';
import AdminPackagesView from './packages/AdminPackagesView';
import AdminDispatchesView from './dispatch/AdminDispatchesView';
import CreateDispatchModal from './dispatch/CreateDispatchModal';
import { Truck, Shipment, Package, User } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  LayoutDashboard,
  Package as PackageIcon,
  Ship,
  Truck as TruckIcon,
  Users,
  Compass,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw,
} from 'lucide-react';

type AdminTab = 'DASHBOARD' | 'PACKAGES' | 'DISPATCHES' | 'VEHICLES' | 'LOADERS' | 'SHIPMENTS';

function AdminDashboardInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loaders, setLoaders] = useState<User[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [showCreateDispatch, setShowCreateDispatch] = useState(false);

  // Fetch admin dashboard data from live database APIs
  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const [trucksRes, shipmentsRes, packagesRes, loadersRes] = await Promise.all([
        fetch('/api/trucks'),
        fetch('/api/shipments'),
        fetch('/api/packages'),
        fetch('/api/users?role=LOADER'),
      ]);

      if (trucksRes.ok) setTrucks(await trucksRes.json());
      if (shipmentsRes.ok) setShipments(await shipmentsRes.json());
      if (packagesRes.ok) setPackages(await packagesRes.json());
      if (loadersRes.ok) setLoaders(await loadersRes.json());
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'ADMIN') return;
    fetchDashboardData();
  }, [isAuthenticated, user]);

  // Operational metrics requested in Requirement 7
  const operationalMetrics = useMemo(() => {
    const pendingPackages = packages.filter((p) => p.status === 'PENDING').length;
    const plannedDispatches = shipments.filter((s) => s.status === 'PLANNED').length;
    const vehiclesAvailable = trucks.filter((t) => t.status === 'AVAILABLE').length;
    const vehiclesLoading = trucks.filter((t) => {
      if (t.status !== 'LOADING') return false;
      if (t.currentShipmentId) {
        const matchingShip = shipments.find((s) => s.id === t.currentShipmentId);
        if (matchingShip && (matchingShip.status === 'IN_TRANSIT' || matchingShip.status === 'LOADED' || matchingShip.status === 'READY')) {
          return false;
        }
      }
      return true;
    }).length;
    const dispatchesReady = shipments.filter(
      (s) => s.status === 'READY' || s.status === 'LOADED'
    ).length;

    // Loading progress calculation across active loading shipments
    const loadingShipmentIds = new Set(
      shipments.filter((s) => s.status === 'LOADING').map((s) => s.id)
    );
    const packagesInLoading = packages.filter(
      (p) => p.shipmentId && loadingShipmentIds.has(p.shipmentId)
    );
    const packagesLoaded = packagesInLoading.filter((p) => p.isLoaded || p.status === 'LOADED').length;
    const loadingProgressPct =
      packagesInLoading.length > 0
        ? Math.round((packagesLoaded / packagesInLoading.length) * 100)
        : 0;

    // Recently dispatched vehicles
    const recentlyDispatched = shipments
      .filter((s) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT')
      .slice(0, 5);

    return {
      pendingPackages,
      plannedDispatches,
      vehiclesAvailable,
      vehiclesLoading,
      dispatchesReady,
      loadingProgressPct,
      packagesLoaded,
      totalInLoading: packagesInLoading.length,
      recentlyDispatched,
    };
  }, [packages, shipments, trucks]);

  if (isLoading || (isAuthenticated && user && user.role === 'ADMIN' && dashboardLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Verifying session & fetching fleet metrics...
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
            Please sign in to access the admin dashboard.
          </p>
          <button
            onClick={() => router.push('/login-screen')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Access denied. Admin role required.</p>
          <button
            onClick={() => router.push('/loader-dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-600"
          >
            Go to Loader Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'PACKAGES', label: 'Packages', icon: PackageIcon, badge: operationalMetrics.pendingPackages },
    { key: 'DISPATCHES', label: 'Dispatches', icon: Ship, badge: operationalMetrics.plannedDispatches },
    { key: 'VEHICLES', label: 'Vehicles', icon: TruckIcon, badge: operationalMetrics.vehiclesAvailable },
    { key: 'LOADERS', label: 'Loaders', icon: Users },
    { key: 'SHIPMENTS', label: 'Shipments', icon: Compass },
  ];

  return (
    <AppLayout role="ADMIN" userName={user.name} userEmail={user.email}>
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Top Header & Create Dispatch Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fleet Operations Hub</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Admin-Side Shipment & Dispatch Preparation Center
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDispatch(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Create Dispatch</span>
            </button>
            <button
              onClick={fetchDashboardData}
              className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
              title="Refresh database data"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Navigation Bar (Requirement 7) */}
        <div className="flex items-center gap-1.5 border-b border-border pb-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-background/25 text-white'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: MAIN DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            {/* Requirement 7: Operational Highlights Bento */}
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Compass size={14} className="text-primary" />
                  <span>Dispatch Preparation & Operational Status</span>
                </span>
                <button
                  onClick={() => setShowCreateDispatch(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>+ Prepare Vehicle Dispatch</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Pending packages */}
                <button
                  onClick={() => setActiveTab('PACKAGES')}
                  className="p-3 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-left transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Pending Packages
                  </span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {operationalMetrics.pendingPackages}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Awaiting Dispatch ›</span>
                </button>

                {/* 2. Planned dispatches */}
                <button
                  onClick={() => setActiveTab('DISPATCHES')}
                  className="p-3 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-left transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Planned Dispatches
                  </span>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {operationalMetrics.plannedDispatches}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Queued for Loading ›</span>
                </button>

                {/* 3. Vehicles available */}
                <button
                  onClick={() => setActiveTab('VEHICLES')}
                  className="p-3 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-left transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Vehicles Available
                  </span>
                  <div className="text-xl font-bold text-positive mt-1">
                    {operationalMetrics.vehiclesAvailable}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ready for Assignment ›</span>
                </button>

                {/* 4. Vehicles currently loading */}
                <button
                  onClick={() => setActiveTab('VEHICLES')}
                  className="p-3 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-left transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Vehicles Loading
                  </span>
                  <div className="text-xl font-bold text-primary mt-1">
                    {operationalMetrics.vehiclesLoading}
                  </div>
                  <span className="text-[10px] text-muted-foreground">At Bay Stations ›</span>
                </button>

                {/* 5. Dispatches ready for loading/highway */}
                <button
                  onClick={() => setActiveTab('DISPATCHES')}
                  className="p-3 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-left transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Dispatches Ready
                  </span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {operationalMetrics.dispatchesReady}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Staged & Inspected ›</span>
                </button>
              </div>

              {/* 7. Recently Dispatched Vehicles */}
              {operationalMetrics.recentlyDispatched.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-[11px] font-bold text-muted-foreground block mb-2">
                    Recently Dispatched Vehicles En Route:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {operationalMetrics.recentlyDispatched.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <TruckIcon size={14} className="text-primary shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-foreground block truncate">
                              {s.truckRegistration || s.truckId}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {s.origin} → {s.destination}
                            </span>
                          </div>
                        </div>
                        <StatusBadge variant={s.status as any} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Existing Metrics Bento */}
            <AdminMetricsBento trucks={trucks} shipments={shipments} packages={packages} />

            {/* Existing Charts Row */}
            <AdminChartsRow trucks={trucks} shipments={shipments} />
          </div>
        )}

        {/* TAB 2: PACKAGES */}
        {activeTab === 'PACKAGES' && (
          <AdminPackagesView
            packages={packages}
            trucks={trucks}
            shipments={shipments}
            onPackagesUpdate={(updated) => setPackages(updated)}
            onRefresh={fetchDashboardData}
          />
        )}

        {/* TAB 3: DISPATCHES */}
        {activeTab === 'DISPATCHES' && (
          <AdminDispatchesView
            shipments={shipments}
            trucks={trucks}
            packages={packages}
            onShipmentsUpdate={(updated) => setShipments(updated)}
            onRefresh={fetchDashboardData}
          />
        )}

        {/* TAB 4: VEHICLES */}
        {activeTab === 'VEHICLES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Fleet Vehicle Inventory</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monitor capacity utilization, cargo dimensions, and availability of carrier vehicles
                </p>
              </div>
              <button
                onClick={() => setShowCreateDispatch(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Assign Vehicle to Dispatch</span>
              </button>
            </div>
            <AdminTrucksTable trucks={trucks} />
          </div>
        )}

        {/* TAB 5: LOADERS */}
        {activeTab === 'LOADERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Loading Bay Staff Directory</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active loaders assigned to vehicles, scanning stations, and bay operations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loaders.map((loader) => {
                const assignedTruck = trucks.find((t) => t.id === loader.assignedTruckId);
                const activeShipments = shipments.filter(
                  (s) =>
                    s.loaderId === loader.id &&
                    (s.status === 'LOADING' || s.status === 'PLANNED' || s.status === 'READY')
                );

                return (
                  <div
                    key={loader.id}
                    className="p-4 bg-card border border-border rounded-xl space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                        {loader.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-foreground">{loader.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{loader.email}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-positive/10 text-positive font-bold border border-positive/20">
                        Active
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned Truck:</span>
                        <span className="font-semibold text-foreground">
                          {assignedTruck?.registrationNumber || loader.assignedTruckId || 'Free Float'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Active Dispatches:</span>
                        <span className="font-bold text-primary">
                          {activeShipments.length} queue
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: SHIPMENTS */}
        {activeTab === 'SHIPMENTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Shipments</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Multi-hub transfer corridors, live transit checkpoints, and arrival schedules
                </p>
              </div>
            </div>

            <AdminShipmentsTable shipments={shipments} />
          </div>
        )}
      </div>

      {/* Create Dispatch Wizard Modal */}
      {showCreateDispatch && (
        <CreateDispatchModal
          trucks={trucks}
          packages={packages}
          onClose={() => setShowCreateDispatch(false)}
          onDispatchCreated={(newShipment) => {
            setShipments((prev) => [newShipment, ...prev]);
            fetchDashboardData();
          }}
          onPackagesUpdated={(updated) => setPackages(updated)}
        />
      )}
    </AppLayout>
  );
}

export default function AdminDashboardClient() {
  return <AdminDashboardInner />;
}
