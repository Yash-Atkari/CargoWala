// ─── ALERTS & EXCEPTION MANAGEMENT ENGINE (Feature 11) ─────────────────────────
// Real-time anomaly detection for vehicle payloads, stability, damage risk, route blockage, and loading violations

import { Truck, Shipment, Package } from './types';
import {
  PlacedPackage,
  VehicleStabilityAnalysis,
  ManifestDamageRiskReport,
  RouteAccessibilityReport,
  calculateSpaceMetrics,
} from './loadingOptimizer';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AlertCategory =
  | 'OVERWEIGHT'
  | 'INSTABILITY'
  | 'DAMAGE_RISK'
  | 'ROUTE_BLOCKAGE'
  | 'SCAN_DISCREPANCY'
  | 'LOADING_VIOLATION'
  | 'DELIVERY_DELAY';

export interface LogisticsAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  truckId?: string;
  truckReg?: string;
  shipmentId?: string;
  packageId?: string;
  timestamp: string;
  actionLabel?: string;
  actionType?: 'REBALANCE' | 'MITIGATE_DAMAGE' | 'REOPTIMIZE_ROUTE' | 'VIEW_3D' | 'DISMISS';
}

export function generateLiveExceptions(
  truck: Truck | null,
  placedPackages: PlacedPackage[],
  stability?: VehicleStabilityAnalysis,
  damageReport?: ManifestDamageRiskReport,
  unloadingReport?: RouteAccessibilityReport
): LogisticsAlert[] {
  const alerts: LogisticsAlert[] = [];
  const now = new Date().toLocaleTimeString();

  if (!truck) return alerts;

  const metrics = calculateSpaceMetrics(placedPackages, truck);

  // 1. Overweight payload exception
  if (metrics.totalWeight > truck.maxWeight) {
    const excess = metrics.totalWeight - truck.maxWeight;
    alerts.push({
      id: `alert-weight-${Date.now()}`,
      severity: 'CRITICAL',
      category: 'OVERWEIGHT',
      title: 'Vehicle Gross Payload Exceeded',
      message: `Container payload (${metrics.totalWeight}kg) exceeds max legal limit of ${truck.maxWeight}kg by ${excess}kg.`,
      truckId: truck.id,
      truckReg: truck.registrationNumber,
      timestamp: now,
      actionLabel: 'Re-Optimize Payload',
      actionType: 'REOPTIMIZE_ROUTE',
    });
  } else if (metrics.weightUtilization > 92) {
    alerts.push({
      id: `alert-weight-warn-${Date.now()}`,
      severity: 'WARNING',
      category: 'OVERWEIGHT',
      title: 'High Payload Utilization',
      message: `Payload is at ${metrics.weightUtilization}% capacity (${metrics.totalWeight}/${truck.maxWeight}kg).`,
      truckId: truck.id,
      truckReg: truck.registrationNumber,
      timestamp: now,
    });
  }

  // 2. Vehicle Stability & Rollover exceptions
  if (stability) {
    if (!stability.isStable || stability.rolloverRiskLevel === 'CRITICAL') {
      alerts.push({
        id: `alert-stab-${Date.now()}`,
        severity: 'CRITICAL',
        category: 'INSTABILITY',
        title: 'Dangerous Rollover Vulnerability (Low SRT)',
        message: `Static Rollover Threshold is ${stability.staticRolloverThreshold}g (${stability.rolloverRiskLevel} risk). ${stability.criticalWarnings[0] || ''}`,
        truckId: truck.id,
        truckReg: truck.registrationNumber,
        timestamp: now,
        actionLabel: 'Auto-Balance Center of Gravity',
        actionType: 'REBALANCE',
      });
    }

    if (!stability.steerAxleSafe) {
      alerts.push({
        id: `alert-steer-${Date.now()}`,
        severity: 'WARNING',
        category: 'INSTABILITY',
        title: 'Front Steer Axle Underloaded',
        message: `Steer axle has only ${stability.steerAxlePct}% load (minimum safe threshold is 25%). Risk of steering degradation.`,
        truckId: truck.id,
        truckReg: truck.registrationNumber,
        timestamp: now,
        actionLabel: 'Rebalance Load',
        actionType: 'REBALANCE',
      });
    }
  }

  // 3. Damage Risk exceptions
  if (damageReport && damageReport.criticalRiskCount > 0) {
    const worst = damageReport.highRiskPackages[0];
    alerts.push({
      id: `alert-damage-${Date.now()}`,
      severity: 'CRITICAL',
      category: 'DAMAGE_RISK',
      title: 'Fragile Cargo Crushing Hazard',
      message: `${damageReport.criticalRiskCount} package(s) subjected to severe crushing pressure. Package "${worst?.packageName || 'Cargo'}" has ${worst?.weightAboveKg || 0}kg stacked above.`,
      truckId: truck.id,
      truckReg: truck.registrationNumber,
      timestamp: now,
      actionLabel: 'Apply Fragility-First Cushioning',
      actionType: 'MITIGATE_DAMAGE',
    });
  }

  // 4. Route Accessibility & LIFO Blocking exceptions
  if (unloadingReport && unloadingReport.totalBlockedParcels > 0) {
    alerts.push({
      id: `alert-lifo-${Date.now()}`,
      severity: 'WARNING',
      category: 'ROUTE_BLOCKAGE',
      title: 'Route Extraction Blockage Detected',
      message: `${unloadingReport.totalBlockedParcels} parcel(s) for early delivery stops are obstructed by later stop freight.`,
      truckId: truck.id,
      truckReg: truck.registrationNumber,
      timestamp: now,
      actionLabel: 'Enforce Strict LIFO Policy',
      actionType: 'REOPTIMIZE_ROUTE',
    });
  }

  // 5. Normal healthy state info alert
  if (alerts.length === 0 && placedPackages.length > 0) {
    alerts.push({
      id: `alert-healthy-${Date.now()}`,
      severity: 'INFO',
      category: 'LOADING_VIOLATION',
      title: 'All Compliance Checks Passed',
      message: `Vehicle ${truck.registrationNumber} is fully compliant: 0 crushing risks, optimal CoG, and valid LIFO sequence.`,
      truckId: truck.id,
      truckReg: truck.registrationNumber,
      timestamp: now,
    });
  }

  return alerts;
}
