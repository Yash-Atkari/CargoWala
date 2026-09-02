import React from 'react';
import { Truck, Package, Ship, AlertTriangle, Clock, Leaf, Weight, Activity } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import { MockTruck, MockShipment, MockPackage } from '@/lib/mockData';

interface AdminMetricsBentoProps {
  trucks?: MockTruck[];
  shipments?: MockShipment[];
  packages?: MockPackage[];
}

export default function AdminMetricsBento({
  trucks = [],
  shipments = [],
  packages = [],
}: AdminMetricsBentoProps) {
  // 1. Space Utilization calculations
  const activeTrucks = trucks.filter((t) => t.status === 'LOADING' || t.status === 'IN_TRANSIT');
  const availableTrucks = trucks.filter((t) => t.status === 'AVAILABLE');
  const maintenanceTrucks = trucks.filter((t) => t.status === 'MAINTENANCE');
  
  const avgSpaceUtil = activeTrucks.length > 0
    ? (activeTrucks.reduce((sum, t) => sum + t.currentUtilization, 0) / activeTrucks.length).toFixed(1)
    : '0.0';

  const spaceSubtext = `${activeTrucks.length} of ${trucks.length} trucks active · ${availableTrucks.length} available · ${maintenanceTrucks.length} in maintenance`;

  // 2. Active Shipments
  const activeShipmentsCount = shipments.filter(
    (s) => s.status === 'LOADING' || s.status === 'IN_TRANSIT' || s.status === 'PENDING' || s.status === 'DELAYED'
  ).length;
  const inTransitCount = shipments.filter((s) => s.status === 'IN_TRANSIT').length;
  const loadingCount = shipments.filter((s) => s.status === 'LOADING').length;
  const deliveredTodayCount = shipments.filter((s) => s.status === 'DELIVERED').length;

  // 3. High-Risk Packages
  const highRiskPackages = packages.filter((p) => p.riskScore >= 70);
  const fragileCount = packages.filter((p) => p.fragilityLevel === 'FRAGILE').length;

  // 4. Delayed Shipments
  const delayedShipmentsCount = shipments.filter((s) => s.status === 'DELAYED').length;
  const delayedNames = shipments
    .filter((s) => s.status === 'DELAYED')
    .map((s) => s.id.replace('shipment-', 'SHP-'))
    .join(', ');

  // 5. Avg Weight Utilization
  const avgWeightUtil = activeTrucks.length > 0
    ? (activeTrucks.reduce((sum, t) => sum + t.weightUtilization, 0) / activeTrucks.length).toFixed(1)
    : '0.0';

  // 6. Total Packages
  const totalPkgsCount = packages.length;
  const pendingCount = packages.filter((p) => p.status === 'PENDING').length;
  const inTransitPkgs = packages.filter((p) => p.status === 'IN_TRANSIT').length;
  const deliveredPkgs = packages.filter((p) => p.status === 'DELIVERED').length;
  const damagedPkgs = packages.filter((p) => p.status === 'DAMAGED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero: Fleet Space Utilization */}
      <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2">
        <MetricCard
          label="Avg Fleet Space Utilization"
          value={avgSpaceUtil}
          unit="%"
          subtext={spaceSubtext}
          trend="up"
          trendValue="+4.2% vs last week"
          icon={Truck}
          iconColor="text-primary"
          variant="hero"
          className="h-full"
        />
      </div>

      {/* Active Shipments */}
      <MetricCard
        label="Active Shipments"
        value={String(activeShipmentsCount)}
        subtext={`${inTransitCount} in transit · ${loadingCount} loading now`}
        trend="neutral"
        trendValue={`${deliveredTodayCount} delivered total`}
        icon={Ship}
        iconColor="text-info"
        variant="default"
      />

      {/* High-Risk Packages — ALERT */}
      <MetricCard
        label="High-Risk Packages"
        value={String(highRiskPackages.length)}
        subtext={`${fragileCount} FRAGILE · ${highRiskPackages.length} score > 70`}
        trend="down"
        trendValue="Safety review active"
        icon={AlertTriangle}
        iconColor="text-negative"
        variant="alert"
      />

      {/* Delayed Shipments — WARNING */}
      <MetricCard
        label="Delayed Shipments"
        value={String(delayedShipmentsCount)}
        subtext={delayedShipmentsCount > 0 ? `${delayedNames} · Check traffic info` : 'All deliveries on schedule'}
        trend="down"
        trendValue="ETA updates in feed"
        icon={Clock}
        iconColor="text-warning"
        variant="warning"
      />

      {/* Weight Utilization */}
      <MetricCard
        label="Avg Weight Utilization"
        value={avgWeightUtil}
        unit="%"
        subtext={`Across ${activeTrucks.length} active vehicles`}
        trend="up"
        trendValue="+2.8%"
        icon={Weight}
        iconColor="text-primary"
        variant="default"
      />

      {/* Carbon Emissions */}
      <MetricCard
        label="Today's CO₂ Estimate"
        value="89"
        unit="kg"
        subtext={`${activeTrucks.length * 12} L fuel · ${activeTrucks.length} active routes`}
        trend="down"
        trendValue="-71% vs yesterday"
        icon={Leaf}
        iconColor="text-positive"
        variant="positive"
      />

      {/* Avg Loading Time */}
      <MetricCard
        label="Avg Loading Session"
        value="47"
        unit="min"
        subtext="Based on last 6 loads"
        trend="up"
        trendValue="-8 min vs avg"
        icon={Activity}
        iconColor="text-accent"
        variant="default"
      />

      {/* Total Packages */}
      <MetricCard
        label="Total Packages (Active)"
        value={String(totalPkgsCount)}
        subtext={`${pendingCount} pending · ${inTransitPkgs} in transit · ${deliveredPkgs} delivered`}
        trend="neutral"
        trendValue={`${damagedPkgs} damaged reports`}
        icon={Package}
        iconColor="text-muted-foreground"
        variant="default"
      />
    </div>
  );
}
