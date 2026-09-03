import React from 'react';
import { Truck, Package, Ship, AlertTriangle, Clock, Weight, CheckCircle } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import { Truck as TruckType, Shipment as ShipmentType, Package as PackageType } from '@/lib/types';

interface AdminMetricsBentoProps {
  trucks?: TruckType[];
  shipments?: ShipmentType[];
  packages?: PackageType[];
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

  const avgSpaceUtil =
    activeTrucks.length > 0
      ? (activeTrucks.reduce((sum, t) => sum + t.currentUtilization, 0) / activeTrucks.length).toFixed(1)
      : '0.0';

  const spaceSubtext = `${activeTrucks.length} of ${trucks.length} trucks active · ${availableTrucks.length} available · ${maintenanceTrucks.length} in maintenance`;

  // 2. Active Shipments
  const activeShipmentsCount = shipments.filter(
    (s) => s.status === 'LOADING' || s.status === 'IN_TRANSIT' || s.status === 'PENDING' || s.status === 'DELAYED'
  ).length;
  const inTransitCount = shipments.filter((s) => s.status === 'IN_TRANSIT').length;
  const loadingCount = shipments.filter((s) => s.status === 'LOADING').length;
  const deliveredTotalCount = shipments.filter((s) => s.status === 'DELIVERED').length;

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
  const avgWeightUtil =
    activeTrucks.length > 0
      ? (activeTrucks.reduce((sum, t) => sum + t.weightUtilization, 0) / activeTrucks.length).toFixed(1)
      : '0.0';

  // 6. Total Packages
  const totalPkgsCount = packages.length;
  const pendingCount = packages.filter((p) => p.status === 'PENDING').length;
  const inTransitPkgs = packages.filter((p) => p.status === 'IN_TRANSIT').length;
  const loadedPkgs = packages.filter((p) => p.status === 'LOADED').length;

  // 7. Fleet Total Payload Capacity
  const totalFleetCapacityTonnes = (
    trucks.reduce((sum, t) => sum + (t.maxWeight || 0), 0) / 1000
  ).toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero: Fleet Space Utilization */}
      <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2">
        <MetricCard
          label="Avg Fleet Space Utilization"
          value={avgSpaceUtil}
          unit="%"
          subtext={spaceSubtext}
          trend="neutral"
          trendValue="Active fleet calculated"
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
        subtext={`${inTransitCount} in transit · ${loadingCount} loading`}
        trend="neutral"
        trendValue={`${deliveredTotalCount} delivered`}
        icon={Ship}
        iconColor="text-info"
        variant="default"
      />

      {/* High-Risk Packages */}
      <MetricCard
        label="High-Risk Packages"
        value={String(highRiskPackages.length)}
        subtext={`${fragileCount} fragile · ${highRiskPackages.length} risk score ≥ 70`}
        trend={highRiskPackages.length > 0 ? 'down' : 'neutral'}
        trendValue={highRiskPackages.length > 0 ? 'Review required' : 'Clear'}
        icon={AlertTriangle}
        iconColor="text-negative"
        variant={highRiskPackages.length > 0 ? 'alert' : 'default'}
      />

      {/* Delayed Shipments */}
      <MetricCard
        label="Delayed Shipments"
        value={String(delayedShipmentsCount)}
        subtext={
          delayedShipmentsCount > 0
            ? `${delayedNames} flagged`
            : 'All deliveries on schedule'
        }
        trend={delayedShipmentsCount > 0 ? 'down' : 'neutral'}
        trendValue={delayedShipmentsCount > 0 ? 'Delay detected' : 'On time'}
        icon={Clock}
        iconColor="text-warning"
        variant={delayedShipmentsCount > 0 ? 'warning' : 'default'}
      />

      {/* Weight Utilization */}
      <MetricCard
        label="Avg Weight Utilization"
        value={avgWeightUtil}
        unit="%"
        subtext={`Across ${activeTrucks.length} active vehicles`}
        trend="neutral"
        trendValue="Live calculation"
        icon={Weight}
        iconColor="text-primary"
        variant="default"
      />

      {/* Total Fleet Capacity */}
      <MetricCard
        label="Total Fleet Capacity"
        value={totalFleetCapacityTonnes}
        unit=" tonnes"
        subtext={`${trucks.length} registered vehicles`}
        trend="neutral"
        trendValue="Max payload"
        icon={Truck}
        iconColor="text-positive"
        variant="default"
      />

      {/* Total Packages */}
      <MetricCard
        label="Total Packages"
        value={String(totalPkgsCount)}
        subtext={`${pendingCount} pending · ${loadedPkgs} loaded · ${inTransitPkgs} in transit`}
        trend="neutral"
        trendValue={`${packages.filter((p) => p.status === 'DELIVERED').length} delivered`}
        icon={Package}
        iconColor="text-muted-foreground"
        variant="default"
      />
    </div>
  );
}
