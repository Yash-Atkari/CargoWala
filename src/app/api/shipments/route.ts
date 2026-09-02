import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

function mapShipmentToCamel(s: any) {
  if (!s) return null;
  return {
    id: s.id,
    truckId: s.truck_id,
    truckRegistration: s.truck_registration,
    loaderId: s.loader_id,
    loaderName: s.loader_name,
    status: s.status,
    departureTime: s.departure_time,
    arrivalTime: s.arrival_time,
    origin: s.origin,
    destination: s.destination,
    totalWeight: s.total_weight,
    totalVolume: s.total_volume,
    packageCount: s.package_count,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const loaderId = searchParams.get('loaderId');

    if (id) {
      const { data: shipment, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!shipment) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }
      return NextResponse.json(mapShipmentToCamel(shipment));
    }

    if (loaderId) {
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('loader_id', loaderId)
        .in('status', ['PENDING', 'LOADING', 'LOADED'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return NextResponse.json(shipments && shipments.length > 0 ? mapShipmentToCamel(shipments[0]) : null);
    }

    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(shipments.map(mapShipmentToCamel));
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, departureTime, arrivalTime, totalWeight, totalVolume, packageCount } = body;

    if (!id) {
      return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (departureTime !== undefined) updateData.departure_time = departureTime ? new Date(departureTime) : null;
    if (arrivalTime !== undefined) updateData.arrival_time = arrivalTime ? new Date(arrivalTime) : null;
    if (totalWeight !== undefined) updateData.total_weight = parseFloat(totalWeight);
    if (totalVolume !== undefined) updateData.total_volume = parseFloat(totalVolume);
    if (packageCount !== undefined) updateData.package_count = parseInt(packageCount, 10);

    const { data: updatedShipment, error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, shipment: mapShipmentToCamel(updatedShipment) });
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
