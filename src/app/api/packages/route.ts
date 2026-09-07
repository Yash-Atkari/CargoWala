import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_PACKAGES } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

function mapPackageToCamel(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    digitalId: p.digital_id || p.digitalId,
    name: p.name,
    length: p.length,
    width: p.width,
    height: p.height,
    weight: p.weight,
    fragilityLevel: p.fragility_level || p.fragilityLevel,
    destination: p.destination,
    priority: p.priority,
    deliverySequence: p.delivery_sequence ?? p.deliverySequence,
    status: p.status,
    shipmentId: p.shipment_id || p.shipmentId,
    riskScore: p.risk_score ?? p.riskScore,
    riskLevel: p.risk_level || p.riskLevel,
    loadingOrder: p.loading_order ?? p.loadingOrder,
    isLoaded: p.is_loaded ?? p.isLoaded,
    stackingNote: p.stacking_note || p.stackingNote,
    positionX: p.position_x ?? p.positionX,
    positionY: p.position_y ?? p.positionY,
    positionZ: p.position_z ?? p.positionZ,
    rotationY: p.rotation_y ?? p.rotationY,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shipmentId = searchParams.get('shipmentId');

    if (isSupabaseConfigured) {
      try {
        if (id) {
          const { data: pkg, error } = await supabase
            .from('packages')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && pkg) {
            return NextResponse.json(mapPackageToCamel(pkg));
          }
        } else if (shipmentId) {
          const { data: packages, error } = await supabase
            .from('packages')
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('delivery_sequence', { ascending: true });

          if (!error && packages) {
            return NextResponse.json(packages.map(mapPackageToCamel));
          }
        } else {
          const { data: packages, error } = await supabase
            .from('packages')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && packages) {
            return NextResponse.json(packages.map(mapPackageToCamel));
          }
        }
      } catch (dbErr) {
        console.warn('Supabase query failed, falling back to mock packages:', dbErr);
      }
    }

    // Fallback to MOCK_PACKAGES
    if (id) {
      const pkg = MOCK_PACKAGES.find((p) => p.id === id);
      if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      return NextResponse.json(pkg);
    }
    if (shipmentId) {
      const pkgs = MOCK_PACKAGES.filter((p) => p.shipmentId === shipmentId);
      return NextResponse.json(pkgs);
    }

    return NextResponse.json(MOCK_PACKAGES);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(MOCK_PACKAGES);
  }
}
<<<<<<< HEAD
=======

// Single package update
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      isLoaded,
      loadingOrder,
      stackingNote,
      positionX,
      positionY,
      positionZ,
      rotationY,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.digitalId !== undefined) updateData.digital_id = body.digitalId;
    if (body.length !== undefined) updateData.length = parseFloat(body.length);
    if (body.width !== undefined) updateData.width = parseFloat(body.width);
    if (body.height !== undefined) updateData.height = parseFloat(body.height);
    if (body.weight !== undefined) updateData.weight = parseFloat(body.weight);
    if (body.fragilityLevel !== undefined) updateData.fragility_level = body.fragilityLevel;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.destination !== undefined) updateData.destination = body.destination;
    if (body.deliverySequence !== undefined) updateData.delivery_sequence = parseInt(body.deliverySequence, 10);
    if (status !== undefined) updateData.status = status;
    if (isLoaded !== undefined) updateData.is_loaded = !!isLoaded;
    if (loadingOrder !== undefined) updateData.loading_order = parseInt(loadingOrder, 10);
    if (stackingNote !== undefined) updateData.stacking_note = stackingNote;
    if (positionX !== undefined) updateData.position_x = positionX !== null ? parseFloat(positionX) : null;
    if (positionY !== undefined) updateData.position_y = positionY !== null ? parseFloat(positionY) : null;
    if (positionZ !== undefined) updateData.position_z = positionZ !== null ? parseFloat(positionZ) : null;
    if (rotationY !== undefined) updateData.rotation_y = rotationY !== null ? parseFloat(rotationY) : null;

    const { data: updatedPackage, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    let shipmentStatusUpdated = false;
    let newShipmentStatus: string | null = null;

    if (updatedPackage && updatedPackage.shipment_id && updateData.status === 'DELIVERED') {
      const { data: sisterPkgs } = await supabase
        .from('packages')
        .select('status')
        .eq('shipment_id', updatedPackage.shipment_id);

      if (sisterPkgs && sisterPkgs.length > 0) {
        const allDelivered = sisterPkgs.every(
          (p) => p.status === 'DELIVERED' || p.status === 'CANCELLED'
        );
        if (allDelivered) {
          await supabase
            .from('shipments')
            .update({ status: 'DELIVERED' })
            .eq('id', updatedPackage.shipment_id);

          const { data: shipData } = await supabase
            .from('shipments')
            .select('truck_id')
            .eq('id', updatedPackage.shipment_id)
            .maybeSingle();

          if (shipData?.truck_id) {
            await supabase
              .from('trucks')
              .update({
                status: 'AVAILABLE',
                current_shipment_id: null,
                current_utilization: 0,
                weight_utilization: 0,
              })
              .eq('id', shipData.truck_id);
          }

          await supabase.from('tracking_events').insert([
            {
              id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              shipment_id: updatedPackage.shipment_id,
              event_type: 'DELIVERED',
              description: `Shipment ${updatedPackage.shipment_id} status updated to DELIVERED (all items delivered).`,
              timestamp: new Date().toISOString(),
              location: updatedPackage.destination || 'Destination',
              created_by: 'System',
            },
          ]);

          shipmentStatusUpdated = true;
          newShipmentStatus = 'DELIVERED';
        }
      }
    }

    return NextResponse.json({
      success: true,
      package: mapPackageToCamel(updatedPackage),
      shipmentStatusUpdated,
      newShipmentStatus,
    });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Batch package update / upsert
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { packages } = body;

    if (!Array.isArray(packages)) {
      return NextResponse.json({ error: 'Packages array is required' }, { status: 400 });
    }

    const upsertData = packages.map((pkg) => {
      const data: any = { id: pkg.id };
      if (pkg.digitalId !== undefined || pkg.digital_id !== undefined) data.digital_id = pkg.digitalId || pkg.digital_id;
      if (pkg.name !== undefined) data.name = pkg.name;
      if (pkg.length !== undefined) data.length = parseFloat(pkg.length);
      if (pkg.width !== undefined) data.width = parseFloat(pkg.width);
      if (pkg.height !== undefined) data.height = parseFloat(pkg.height);
      if (pkg.weight !== undefined) data.weight = parseFloat(pkg.weight);
      if (pkg.fragilityLevel !== undefined || pkg.fragility_level !== undefined) data.fragility_level = pkg.fragilityLevel || pkg.fragility_level;
      if (pkg.destination !== undefined) data.destination = pkg.destination;
      if (pkg.priority !== undefined) data.priority = pkg.priority;
      if (pkg.deliverySequence !== undefined || pkg.delivery_sequence !== undefined) data.delivery_sequence = parseInt(pkg.deliverySequence || pkg.delivery_sequence || 1, 10);
      if (pkg.shipmentId !== undefined || pkg.shipment_id !== undefined) data.shipment_id = pkg.shipmentId || pkg.shipment_id;
      if (pkg.riskScore !== undefined || pkg.risk_score !== undefined) data.risk_score = pkg.riskScore !== undefined ? parseFloat(pkg.riskScore) : pkg.risk_score;
      if (pkg.riskLevel !== undefined || pkg.risk_level !== undefined) data.risk_level = pkg.riskLevel || pkg.risk_level;
      if (pkg.status !== undefined) data.status = pkg.status;
      if (pkg.isLoaded !== undefined) data.is_loaded = !!pkg.isLoaded;
      if (pkg.loadingOrder !== undefined) data.loading_order = pkg.loadingOrder ? parseInt(pkg.loadingOrder, 10) : null;
      if (pkg.stackingNote !== undefined) data.stacking_note = pkg.stackingNote;
      if (pkg.positionX !== undefined) data.position_x = pkg.positionX !== null ? parseFloat(pkg.positionX) : null;
      if (pkg.positionY !== undefined) data.position_y = pkg.positionY !== null ? parseFloat(pkg.positionY) : null;
      if (pkg.positionZ !== undefined) data.position_z = pkg.positionZ !== null ? parseFloat(pkg.positionZ) : null;
      if (pkg.rotationY !== undefined) data.rotation_y = pkg.rotationY !== null ? parseFloat(pkg.rotationY) : null;
      return data;
    });

    const { error } = await supabase.from('packages').upsert(upsertData);

    if (error) throw error;
    return NextResponse.json({ success: true, count: packages.length });
  } catch (error) {
    console.error('Error batch updating packages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateInitialRisk(fragility: string, weight: number): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' } {
  let score = 15;
  if (fragility === 'FRAGILE') score += 55;
  else if (fragility === 'HIGH') score += 40;
  else if (fragility === 'MEDIUM') score += 20;

  if (weight > 100) score += 15;
  else if (weight > 50) score += 10;

  score = Math.min(100, Math.max(0, score));
  let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (score >= 60) level = 'HIGH';
  else if (score >= 30) level = 'MEDIUM';

  return { score, level };
}

function preparePackageRow(p: any) {
  const name = String(p.name || '').trim();
  const destination = String(p.destination || '').trim();
  const length = parseFloat(p.length);
  const width = parseFloat(p.width);
  const height = parseFloat(p.height);
  const weight = parseFloat(p.weight);

  if (!name) throw new Error('Package name is required');
  if (!destination) throw new Error('Destination is required');
  if (isNaN(length) || length <= 0) throw new Error(`Invalid length (${p.length}) for "${name}"`);
  if (isNaN(width) || width <= 0) throw new Error(`Invalid width (${p.width}) for "${name}"`);
  if (isNaN(height) || height <= 0) throw new Error(`Invalid height (${p.height}) for "${name}"`);
  if (isNaN(weight) || weight <= 0) throw new Error(`Invalid weight (${p.weight}) for "${name}"`);

  const fragilityUpper = String(p.fragilityLevel || p.fragility || 'LOW').toUpperCase();
  const validFragility = ['LOW', 'MEDIUM', 'HIGH', 'FRAGILE'].includes(fragilityUpper)
    ? fragilityUpper
    : 'LOW';

  const priorityUpper = String(p.priority || 'NORMAL').toUpperCase();
  const validPriority = ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priorityUpper)
    ? priorityUpper
    : 'NORMAL';

  const deliverySequence = parseInt(p.deliverySequence || p.delivery_sequence || 1, 10) || 1;
  const status = p.status || 'PENDING';

  const { score, level } = calculateInitialRisk(validFragility, weight);
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const digitalId = (p.digitalId || p.digital_id || `CW-2026-PKG-${randomSuffix}`).trim();
  const id = (p.id || `pkg-${Date.now().toString(36)}-${randomSuffix.toLowerCase()}`).trim();

  return {
    id,
    digital_id: digitalId,
    name,
    length,
    width,
    height,
    weight,
    fragility_level: validFragility,
    destination,
    priority: validPriority,
    delivery_sequence: deliverySequence,
    status,
    shipment_id: p.shipmentId || p.shipment_id || null,
    risk_score: p.riskScore !== undefined ? parseFloat(p.riskScore) : score,
    risk_level: p.riskLevel || level,
    stacking_note: p.stackingNote || p.stacking_note || '',
    created_at: p.createdAt || new Date().toISOString(),
    is_loaded: !!p.isLoaded,
    loading_order: p.loadingOrder ? parseInt(p.loadingOrder, 10) : null,
  };
}

// Create single or batch packages
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.packages && Array.isArray(body.packages)) {
      if (body.packages.length === 0) {
        return NextResponse.json({ error: 'Packages array is empty' }, { status: 400 });
      }

      const rowsToInsert = body.packages.map(preparePackageRow);

      const { data, error } = await supabase
        .from('packages')
        .insert(rowsToInsert)
        .select();

      if (error) {
        console.error('Supabase batch insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const insertedMapped = (data || []).map(mapPackageToCamel);
      return NextResponse.json({
        success: true,
        count: insertedMapped.length,
        packages: insertedMapped,
      });
    }

    // Single package
    const pkgData = body.package || body;
    const row = preparePackageRow(pkgData);

    const { data, error } = await supabase
      .from('packages')
      .insert([row])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase single insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      package: mapPackageToCamel(data),
    });
  } catch (error: any) {
    console.error('Error creating package(s):', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while creating package' },
      { status: 400 }
    );
  }
}

// Delete single package by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while deleting package' },
      { status: 500 }
    );
  }
}
