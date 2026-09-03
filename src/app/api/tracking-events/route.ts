import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    let query = supabase
      .from('tracking_events')
      .select('*')
      .order('timestamp', { ascending: false });

    if (shipmentId) {
      query = query.eq('shipment_id', shipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map((e: any) => ({
      id: e.id,
      shipmentId: e.shipment_id,
      packageId: e.package_id,
      eventType: e.event_type,
      description: e.description,
      timestamp: e.timestamp,
      location: e.location,
      createdBy: e.created_by,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('Error fetching tracking events:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      shipmentId,
      packageId,
      eventType,
      description,
      location,
      createdBy,
    } = body;

    if (!shipmentId || !eventType || !description) {
      return NextResponse.json(
        { error: 'shipmentId, eventType, and description are required' },
        { status: 400 }
      );
    }

    const newEvent = {
      id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      shipment_id: shipmentId,
      package_id: packageId || null,
      event_type: eventType,
      description,
      location: location || 'Loading Bay Station',
      created_by: createdBy || 'Loading Operator',
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tracking_events')
      .insert([newEvent])
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      event: {
        id: data.id,
        shipmentId: data.shipment_id,
        packageId: data.package_id,
        eventType: data.event_type,
        description: data.description,
        timestamp: data.timestamp,
        location: data.location,
        createdBy: data.created_by,
      },
    });
  } catch (error: any) {
    console.error('Error creating tracking event:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
