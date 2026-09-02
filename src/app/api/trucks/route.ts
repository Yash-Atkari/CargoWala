import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

function mapTruckToCamel(t: any) {
  if (!t) return null;
  return {
    id: t.id,
    registrationNumber: t.registration_number,
    model: t.model,
    length: t.length,
    width: t.width,
    height: t.height,
    maxWeight: t.max_weight,
    currentUtilization: t.current_utilization,
    weightUtilization: t.weight_utilization,
    assignedLoaderId: t.assigned_loader_id,
    assignedLoaderName: t.assigned_loader_name,
    status: t.status,
    currentShipmentId: t.current_shipment_id,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { data: truck, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!truck) {
        return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
      }
      return NextResponse.json(mapTruckToCamel(truck));
    }

    const { data: trucks, error } = await supabase
      .from('trucks')
      .select('*')
      .order('registration_number', { ascending: true });

    if (error) throw error;
    return NextResponse.json(trucks.map(mapTruckToCamel));
  } catch (error) {
    console.error('Error fetching trucks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, currentUtilization, weightUtilization, currentShipmentId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Truck ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (currentUtilization !== undefined) updateData.current_utilization = parseFloat(currentUtilization);
    if (weightUtilization !== undefined) updateData.weight_utilization = parseFloat(weightUtilization);
    if (currentShipmentId !== undefined) updateData.current_shipment_id = currentShipmentId;

    const { data: updatedTruck, error } = await supabase
      .from('trucks')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, truck: mapTruckToCamel(updatedTruck) });
  } catch (error) {
    console.error('Error updating truck:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
