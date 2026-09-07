import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

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

async function syncCompletedShipments() {
  try {
    const { data: activeShipments } = await supabase
      .from('shipments')
      .select('id, truck_id, status')
      .neq('status', 'DELIVERED')
      .neq('status', 'CANCELLED');

    if (!activeShipments || activeShipments.length === 0) return;

    for (const ship of activeShipments) {
      const { data: pkgs } = await supabase
        .from('packages')
        .select('status')
        .eq('shipment_id', ship.id);

      if (pkgs && pkgs.length > 0) {
        const allDelivered = pkgs.every(
          (p) => p.status === 'DELIVERED' || p.status === 'CANCELLED'
        );
        if (allDelivered) {
          await supabase.from('shipments').update({ status: 'DELIVERED' }).eq('id', ship.id);
          if (ship.truck_id) {
            await supabase
              .from('trucks')
              .update({
                status: 'AVAILABLE',
                current_shipment_id: null,
                current_utilization: 0,
                weight_utilization: 0,
              })
              .eq('id', ship.truck_id);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error auto-syncing completed shipments:', err);
  }
}

export async function GET(request: Request) {
  try {
    await syncCompletedShipments();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const loaderId = searchParams.get('loaderId');
    const all = searchParams.get('all') === 'true';

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
      if (all) {
        const { data: shipments, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('loader_id', loaderId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json((shipments || []).map(mapShipmentToCamel));
      }

      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('loader_id', loaderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Prefer active shipment first
      const activeShipment = shipments?.find((s) =>
        ['PLANNED', 'PENDING', 'LOADING', 'READY', 'LOADED', 'IN_TRANSIT'].includes(s.status)
      );
      return NextResponse.json(mapShipmentToCamel(activeShipment || (shipments && shipments[0]) || null));
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id: customId,
      truckId,
      truckRegistration: customReg,
      loaderId,
      loaderName: customLoaderName,
      origin,
      destination,
      status = 'PLANNED',
      packageIds = [],
      packages = [],
      totalWeight: customWeight,
      totalVolume: customVolume,
      departureTime,
      arrivalTime,
      updateTruckStatus = true,
    } = body;

    if (!truckId) {
      return NextResponse.json({ error: 'Vehicle (truckId) is required' }, { status: 400 });
    }
    if (!loaderId) {
      return NextResponse.json({ error: 'Assigned loader (loaderId) is required' }, { status: 400 });
    }
    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }
    if (!Array.isArray(packageIds) || packageIds.length === 0) {
      return NextResponse.json({ error: 'At least one package must be selected for dispatch' }, { status: 400 });
    }

    // 1. Fetch truck details
    const { data: truck, error: truckErr } = await supabase
      .from('trucks')
      .select('*')
      .eq('id', truckId)
      .maybeSingle();

    if (truckErr) throw truckErr;
    if (!truck) {
      return NextResponse.json({ error: 'Selected vehicle not found' }, { status: 404 });
    }

    // 2. Fetch loader details
    let loaderName = customLoaderName;
    if (!loaderName) {
      const { data: loaderUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', loaderId)
        .maybeSingle();
      loaderName = loaderUser?.name || 'Assigned Loader';
    }

    const truckRegistration = customReg || truck.registration_number;

    // 3. Duplicate Prevention: Check if any of the packages are already assigned to an active dispatch
    const { data: existingPackages, error: pkgFetchErr } = await supabase
      .from('packages')
      .select('id, digital_id, name, weight, length, width, height, shipment_id, status')
      .in('id', packageIds);

    if (pkgFetchErr) throw pkgFetchErr;

    // Check for active shipments associated with these packages
    const existingShipmentIds = (existingPackages || [])
      .map((p) => p.shipment_id)
      .filter(Boolean);

    if (existingShipmentIds.length > 0) {
      const { data: activeShipments, error: activeErr } = await supabase
        .from('shipments')
        .select('id, status')
        .in('id', existingShipmentIds)
        .in('status', ['PLANNED', 'PENDING', 'LOADING', 'READY', 'LOADED', 'IN_TRANSIT']);

      if (activeErr) throw activeErr;

      const activeShipmentIdSet = new Set((activeShipments || []).map((s) => s.id));
      const conflictedPackage = (existingPackages || []).find(
        (p) => p.shipment_id && activeShipmentIdSet.has(p.shipment_id)
      );

      if (conflictedPackage) {
        return NextResponse.json(
          {
            error: `Package "${conflictedPackage.name}" (${conflictedPackage.digital_id}) is already assigned to active dispatch "${conflictedPackage.shipment_id}". Please remove it or complete the active dispatch first.`,
          },
          { status: 409 }
        );
      }
    }

    // 4. Calculate total weight and volume
    const calculatedWeight = (existingPackages || []).reduce((sum, p) => sum + (parseFloat(p.weight) || 0), 0);
    const calculatedVolume = (existingPackages || []).reduce((sum, p) => {
      const volM3 = ((parseFloat(p.length) || 0) * (parseFloat(p.width) || 0) * (parseFloat(p.height) || 0)) / 1000000;
      return sum + volM3;
    }, 0);

    const totalWeight = customWeight !== undefined ? parseFloat(customWeight) : Math.round(calculatedWeight);
    const totalVolume = customVolume !== undefined ? parseFloat(customVolume) : Math.round(calculatedVolume * 10) / 10;

    // 5. Generate unique dispatch ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const dispatchId = customId || `shipment-${Date.now().toString(36)}-${randomCode}`;

    const newShipmentRow = {
      id: dispatchId,
      truck_id: truckId,
      truck_registration: truckRegistration,
      loader_id: loaderId,
      loader_name: loaderName,
      status,
      origin,
      destination,
      total_weight: totalWeight,
      total_volume: totalVolume,
      package_count: packageIds.length,
      departure_time: departureTime ? new Date(departureTime).toISOString() : null,
      arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
      created_at: new Date().toISOString(),
    };

    const { data: createdShipment, error: insertErr } = await supabase
      .from('shipments')
      .insert([newShipmentRow])
      .select()
      .maybeSingle();

    if (insertErr) {
      console.error('Error inserting shipment:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 6. Update packages with assignment, delivery sequence, and status
    for (let idx = 0; idx < packageIds.length; idx++) {
      const pkgId = packageIds[idx];
      const customPkgData = (packages || []).find((p: any) => p.id === pkgId) || {};
      const updateObj: any = {
        shipment_id: dispatchId,
        delivery_sequence: customPkgData.deliverySequence !== undefined ? customPkgData.deliverySequence : idx + 1,
        status: status === 'LOADING' ? 'STAGED' : 'PENDING',
      };
      if (customPkgData.positionX !== undefined) updateObj.position_x = customPkgData.positionX;
      if (customPkgData.positionY !== undefined) updateObj.position_y = customPkgData.positionY;
      if (customPkgData.positionZ !== undefined) updateObj.position_z = customPkgData.positionZ;
      if (customPkgData.rotationY !== undefined) updateObj.rotation_y = customPkgData.rotationY;
      if (customPkgData.loadingOrder !== undefined) updateObj.loading_order = customPkgData.loadingOrder;
      if (customPkgData.stackingNote !== undefined) updateObj.stacking_note = customPkgData.stackingNote;

      const { error: pkgUpErr } = await supabase
        .from('packages')
        .update(updateObj)
        .eq('id', pkgId);

      if (pkgUpErr) {
        console.error(`Error updating package ${pkgId} assignment:`, pkgUpErr);
      }
    }

    // 7. Update Truck status, assigned loader and current shipment
    if (updateTruckStatus) {
      const truckUpdateData: any = {
        current_shipment_id: dispatchId,
        assigned_loader_id: loaderId,
        assigned_loader_name: loaderName,
        status: status === 'PLANNED' ? 'AVAILABLE' : 'LOADING',
      };
      await supabase.from('trucks').update(truckUpdateData).eq('id', truckId);
    }

    // 8. Log tracking event
    await supabase.from('tracking_events').insert([
      {
        id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        shipment_id: dispatchId,
        event_type: 'CREATED',
        description: `Dispatch ${dispatchId} created. Route: ${origin} → ${destination}. Assigned to vehicle ${truckRegistration} and loader ${loaderName} (${packageIds.length} packages).`,
        timestamp: new Date().toISOString(),
        location: origin,
        created_by: 'Fleet Administrator',
      },
    ]);

    return NextResponse.json({
      success: true,
      shipment: mapShipmentToCamel(createdShipment),
      packageCount: packageIds.length,
    });
  } catch (error: any) {
    console.error('Error creating dispatch:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while creating dispatch' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      departureTime,
      arrivalTime,
      totalWeight,
      totalVolume,
      packageCount,
      loaderId,
      loaderName,
      truckId,
      truckRegistration,
    } = body;

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
    if (loaderId !== undefined) updateData.loader_id = loaderId;
    if (loaderName !== undefined) updateData.loader_name = loaderName;
    if (truckId !== undefined) updateData.truck_id = truckId;
    if (truckRegistration !== undefined) updateData.truck_registration = truckRegistration;

    const { data: updatedShipment, error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // Sync status with associated vehicle and packages
    if (status && updatedShipment) {
      const currentTruckId = updatedShipment.truck_id;

      if (status === 'DISPATCHED' || status === 'IN_TRANSIT') {
        if (currentTruckId) {
          await supabase
            .from('trucks')
            .update({ status: 'IN_TRANSIT' })
            .eq('id', currentTruckId);
        }
        await supabase
          .from('packages')
          .update({ status: 'IN_TRANSIT' })
          .eq('shipment_id', id);

        await supabase.from('tracking_events').insert([
          {
            id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            shipment_id: id,
            event_type: 'IN_TRANSIT',
            description: `Vehicle ${updatedShipment.truck_registration} dispatched in transit to ${updatedShipment.destination}.`,
            timestamp: new Date().toISOString(),
            location: updatedShipment.origin,
            created_by: 'Fleet Administrator',
          },
        ]);
      } else if (status === 'COMPLETED' || status === 'DELIVERED') {
        if (currentTruckId) {
          await supabase
            .from('trucks')
            .update({
              status: 'AVAILABLE',
              current_shipment_id: null,
              current_utilization: 0,
              weight_utilization: 0,
            })
            .eq('id', currentTruckId);
        }
        await supabase
          .from('packages')
          .update({ status: 'DELIVERED' })
          .eq('shipment_id', id);

        await supabase.from('tracking_events').insert([
          {
            id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            shipment_id: id,
            event_type: 'DELIVERED',
            description: `Shipment ${id} completed. All packages delivered.`,
            timestamp: new Date().toISOString(),
            location: updatedShipment.destination,
            created_by: 'System',
          },
        ]);
      } else if (status === 'LOADING') {
        if (currentTruckId) {
          await supabase
            .from('trucks')
            .update({ status: 'LOADING' })
            .eq('id', currentTruckId);
        }
      }
    }

    return NextResponse.json({ success: true, shipment: mapShipmentToCamel(updatedShipment) });
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
