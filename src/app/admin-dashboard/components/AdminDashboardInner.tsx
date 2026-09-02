'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import AdminMetricsBento from './AdminMetricsBento';
import AdminChartsRow from './AdminChartsRow';
import AdminActivityFeed from './AdminActivityFeed';
import AdminQuickActions from './AdminQuickActions';
import AdminTrucksTable from './AdminTrucksTable';
import AdminPackagesTable from './AdminPackagesTable';
import AdminShipmentsTable from './AdminShipmentsTable';
import { MockTruck, MockShipment, MockPackage } from '@/lib/mockData';

type ActiveSection = 'dashboard' | 'trucks' | 'packages' | 'shipments';

function AdminDashboardInner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeSection] = useState<ActiveSection>('dashboard');

  const [trucks, setTrucks] = useState<MockTruck[]>([]);
  const [shipments, setShipments] = useState<MockShipment[]>([]);
  const [packages, setPackages] = useState<MockPackage[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Fetch admin dashboard data
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'ADMIN') return;

    const fetchDashboardData = async () => {
      try {
        setDashboardLoading(true);
        const [trucksRes, shipmentsRes, packagesRes] = await Promise.all([
          fetch('/api/trucks'),
          fetch('/api/shipments'),
          fetch('/api/packages'),
        ]);
        
        if (trucksRes.ok) setTrucks(await trucksRes.json());
        if (shipmentsRes.ok) setShipments(await shipmentsRes.json());
        if (packagesRes.ok) setPackages(await packagesRes.json());
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, user]);

  if (isLoading || (isAuthenticated && user && user.role === 'ADMIN' && dashboardLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Verifying session & fetching fleet metrics...</p>
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
            onClick={() => router.push('/')}
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

  return (
    <AppLayout role="ADMIN" userName={user.name} userEmail={user.email}>
      <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fleet Operations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live overview — Aug 13, 2026 · 03:46 UTC
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-positive/10 border border-positive/20">
              <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
              <span className="text-xs font-600 text-positive">Live</span>
            </div>
          </div>
        </div>

        {/* Metrics bento */}
        <AdminMetricsBento trucks={trucks} shipments={shipments} packages={packages} />

        {/* Charts row */}
        <AdminChartsRow trucks={trucks} shipments={shipments} />

        {/* Bottom section: activity + quick actions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <AdminActivityFeed />
          </div>
          <div>
            <AdminQuickActions />
          </div>
        </div>

        {/* Trucks table */}
        <AdminTrucksTable trucks={trucks} />

        {/* Packages & Shipments */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AdminShipmentsTable shipments={shipments} />
          <AdminPackagesTable packages={packages} />
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminDashboardClient() {
  return (
    <AuthProvider>
      <AdminDashboardInner />
    </AuthProvider>
  );
}
