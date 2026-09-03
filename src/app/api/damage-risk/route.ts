import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  autoOptimize,
  analyzeManifestDamageRisk,
  calculateDetailedDamageRisk,
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
    const { truckId, truck: customTruck, shipmentId, packages: customPackages } = body;

    let targetTruck: Truck | null = customTruck || null;
    let targetPackages: Package[] = customPackages || [];

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

    if (targetPackages.length === 0 && shipmentId) {
      const { data: pData, error: pErr } = await supabase
        .from('packages')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('delivery_sequence', { ascending: true });

      if (pErr) throw pErr;
      if (pData) {
        targetPackages = pData.map(mapPackageToCamel);
      }
    }

    if (!targetTruck) {
      return NextResponse.json(
        { error: 'A valid truck configuration or truckId is required' },
        { status: 400 }
      );
    }

    if (targetPackages.length === 0) {
      return NextResponse.json(
        { error: 'At least one package or a valid shipmentId is required' },
        { status: 400 }
      );
    }

    // Auto-optimize or evaluate existing positions
    const placedPackages = autoOptimize(targetPackages, targetTruck, 'BALANCED');
    const damageReport = analyzeManifestDamageRisk(placedPackages, targetTruck);

    return NextResponse.json({
      success: true,
      truck: targetTruck,
      totalPackages: targetPackages.length,
      damageReport,
    });
  } catch (error: any) {
    console.error('Error running Damage Risk Prediction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to predict package damage risk' },
      { status: 500 }
    );
  }
}
