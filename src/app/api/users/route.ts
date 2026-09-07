import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');

    let query = supabase.from('users').select('id, name, email, role, is_active, assigned_truck_id');

    if (role) {
      query = query.eq('role', role.toUpperCase());
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: users, error } = await query.order('name', { ascending: true });

    if (error) throw error;

    const mapped = (users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.is_active,
      assignedTruckId: u.assigned_truck_id,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
