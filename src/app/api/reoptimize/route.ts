import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  dynamicReoptimize,
  OptimizationStrategy,
  ReoptimizationEventType,
  PlacedPackage,
} from '@/lib/loadingOptimizer';
import { Truck, Package } from '@/lib/types';

function mapTruckToCamel(t: any): Truck {
  return {
    id: t.id,
    registrationNumber: t.registration_number,
    model: t.model,
    length: parseFloat(t.length),
    width: parseFloat(t.width),
    height: parseFloat(t.height),
    maxWeight: parseFloat(t.max_weight),
    currentUtilization: parseFloat(t.current_utilization || 0),
    weightUtilization: parseFloat(t.weight_utilization || 0),
    assignedLoaderId: t.assigned_loader_id,
    assignedLoaderName: t.assigned_loader_name,
    status: t.status,
    currentShipmentId: t.current_shipment_id,
  };
}

function mapPackageToCamel(p: any): Package {
  return {
    id: p.id,
    digitalId: p.digital_id,
    name: p.name,
    length: parseFloat(p.length),
    width: parseFloat(p.width),
    height: parseFloat(p.height),
    weight: parseFloat(p.weight),
    fragilityLevel: p.fragility_level,
    destination: p.destination,
    priority: p.priority,
    deliverySequence: parseInt(p.delivery_sequence, 10) || 1,
    status: p.status,
    shipmentId: p.shipment_id,
    riskScore: parseFloat(p.risk_score || 0),
    riskLevel: p.risk_level,
    loadingOrder: p.loading_order ? parseInt(p.loading_order, 10) : undefined,
    isLoaded: p.is_loaded,
    stackingNote: p.stacking_note,
    positionX: p.position_x,
    positionY: p.position_y,
    positionZ: p.position_z,
    rotationY: p.rotation_y,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      truckId,
      truck: customTruck,
      placedPackages = [],
      allPackages = [],
      addedPackages = [],
      removedPackageIds = [],
      lockedPackageIds = [],
      strategy = 'BALANCED',
      eventType = 'PACKAGE_ADDED',
      eventDescription,
    } = body;

    let targetTruck: Truck | null = customTruck || null;

    if (!targetTruck && truckId) {
      const { data: tData, error: tErr } = await supabase
        .from('trucks')
        .select('*')
        .eq('id', truckId)
        .maybeSingle();

      if (tErr) throw tErr;
      if (tData) {
        targetTruck = mapTruckToCamel(tData);
      }
    }

    if (!targetTruck) {
      return NextResponse.json(
        { error: 'A valid truck configuration or truckId is required' },
        { status: 400 }
      );
    }

    // Assemble updated allPackages list after additions and removals
    let combinedPackages: Package[] = [...allPackages];
    if (addedPackages.length > 0) {
      combinedPackages.push(...addedPackages);
    }
    if (removedPackageIds.length > 0) {
      const remSet = new Set(removedPackageIds);
      combinedPackages = combinedPackages.filter((p) => !remSet.has(p.id));
    }

    // Filter placedPackages removing any cancelled/removed packages
    let currentPlaced: PlacedPackage[] = [...placedPackages];
    if (removedPackageIds.length > 0) {
      const remSet = new Set(removedPackageIds);
      currentPlaced = currentPlaced.filter((p) => !remSet.has(p.package.id));
    }

    const validStrategy: OptimizationStrategy =
      ['BALANCED', 'SPACE_MAX', 'FRAGILITY_FIRST', 'LIFO_PRIORITY'].includes(strategy)
        ? strategy
        : 'BALANCED';

    const validEvent: ReoptimizationEventType = eventType || 'PACKAGE_ADDED';

    // Execute dynamic load re-optimization
    const result = dynamicReoptimize(
      currentPlaced,
      combinedPackages,
      targetTruck,
      validStrategy,
      lockedPackageIds,
      validEvent,
      eventDescription
    );

    return NextResponse.json({
      success: true,
      strategy: validStrategy,
      truck: targetTruck,
      totalPackages: combinedPackages.length,
      placedPackageCount: result.placedPackages.length,
      placedPackages: result.placedPackages,
      diff: result.diff,
      report: result.report,
    });
  } catch (error: any) {
    console.error('Error running Dynamic Load Re-Optimization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dynamically re-optimize load' },
      { status: 500 }
    );
  }
}
