import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

function mapPackageToCamel(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    digitalId: p.digital_id,
    name: p.name,
    length: p.length,
    width: p.width,
    height: p.height,
    weight: p.weight,
    fragilityLevel: p.fragility_level,
    destination: p.destination,
    priority: p.priority,
    deliverySequence: p.delivery_sequence,
    status: p.status,
    shipmentId: p.shipment_id,
    riskScore: p.risk_score,
    riskLevel: p.risk_level,
    loadingOrder: p.loading_order,
    isLoaded: p.is_loaded,
    stackingNote: p.stacking_note,
    positionX: p.position_x,
    positionY: p.position_y,
    positionZ: p.position_z,
    rotationY: p.rotation_y,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shipmentId = searchParams.get('shipmentId');

    if (id) {
      const { data: pkg, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!pkg) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
      return NextResponse.json(mapPackageToCamel(pkg));
    }

    if (shipmentId) {
      const { data: packages, error } = await supabase
        .from('packages')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('delivery_sequence', { ascending: true });

      if (error) throw error;
      return NextResponse.json(packages.map(mapPackageToCamel));
    }

    const { data: packages, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(packages.map(mapPackageToCamel));
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    return NextResponse.json({ success: true, package: mapPackageToCamel(updatedPackage) });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Batch package update
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { packages } = body;

    if (!Array.isArray(packages)) {
      return NextResponse.json({ error: 'Packages array is required' }, { status: 400 });
    }

    const upsertData = packages.map((pkg) => {
      const data: any = { id: pkg.id };
      if (pkg.status !== undefined) data.status = pkg.status;
      if (pkg.isLoaded !== undefined) data.is_loaded = !!pkg.isLoaded;
      if (pkg.loadingOrder !== undefined) data.loading_order = parseInt(pkg.loadingOrder, 10);
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
