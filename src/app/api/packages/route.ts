import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_PACKAGES } from '@/lib/mockData';

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
