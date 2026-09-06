import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_TRUCKS } from '@/lib/mockData';

function mapTruckToCamel(t: any) {
  if (!t) return null;
  return {
    id: t.id,
    registrationNumber: t.registration_number || t.registrationNumber,
    model: t.model,
    length: t.length,
    width: t.width,
    height: t.height,
    maxWeight: t.max_weight || t.maxWeight,
    currentUtilization: t.current_utilization ?? t.currentUtilization,
    weightUtilization: t.weight_utilization ?? t.weightUtilization,
    assignedLoaderId: t.assigned_loader_id || t.assignedLoaderId,
    assignedLoaderName: t.assigned_loader_name || t.assignedLoaderName,
    status: t.status,
    currentShipmentId: t.current_shipment_id || t.currentShipmentId,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (isSupabaseConfigured) {
      try {
        if (id) {
          const { data: truck, error } = await supabase
            .from('trucks')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && truck) {
            return NextResponse.json(mapTruckToCamel(truck));
          }
        } else {
          const { data: trucks, error } = await supabase
            .from('trucks')
            .select('*')
            .order('registration_number', { ascending: true });

          if (!error && trucks) {
            return NextResponse.json(trucks.map(mapTruckToCamel));
          }
        }
      } catch (dbErr) {
        console.warn('Supabase query failed, falling back to mock trucks:', dbErr);
      }
    }

    // Fallback to MOCK_TRUCKS
    if (id) {
      const mockTruck = MOCK_TRUCKS.find((t) => t.id === id);
      if (!mockTruck) {
        return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
      }
      return NextResponse.json(mockTruck);
    }

    return NextResponse.json(MOCK_TRUCKS);
  } catch (error) {
    console.error('Error fetching trucks:', error);
    return NextResponse.json(MOCK_TRUCKS);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, currentUtilization, weightUtilization } = body;

    if (!id) {
      return NextResponse.json({ error: 'Truck ID is required' }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      try {
        const updateData: any = {};
        if (status !== undefined) updateData.status = status;
        if (currentUtilization !== undefined) updateData.current_utilization = currentUtilization;
        if (weightUtilization !== undefined) updateData.weight_utilization = weightUtilization;

        const { data: updated, error } = await supabase
          .from('trucks')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (!error && updated) {
          return NextResponse.json(mapTruckToCamel(updated));
        }
      } catch (dbErr) {
        console.warn('Supabase update failed:', dbErr);
      }
    }

    const mockTruck = MOCK_TRUCKS.find((t) => t.id === id) || MOCK_TRUCKS[0];
    return NextResponse.json(mockTruck);
  } catch (error) {
    console.error('Error updating truck:', error);
    return NextResponse.json({ error: 'Failed to update truck' }, { status: 500 });
  }
}
