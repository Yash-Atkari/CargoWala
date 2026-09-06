import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { MOCK_USERS } from '@/lib/mockData';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. If Supabase is configured, attempt database lookup
    if (isSupabaseConfigured) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!error && user) {
          if (user.password !== password) {
            return NextResponse.json(
              { success: false, error: 'Invalid email or password' },
              { status: 401 }
            );
          }

          if (!user.is_active) {
            return NextResponse.json(
              { success: false, error: 'Account is deactivated' },
              { status: 403 }
            );
          }

          return NextResponse.json({
            success: true,
            role: user.role,
            id: user.id,
            name: user.name,
            email: user.email,
            assignedTruckId: user.assigned_truck_id,
          });
        }
      } catch (dbErr) {
        console.warn('Supabase query failed, falling back to mock auth:', dbErr);
      }
    }

    // 2. Fallback to MOCK_USERS for smooth local demo experience
    const mockUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password
    );

    if (mockUser) {
      return NextResponse.json({
        success: true,
        role: mockUser.role,
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        assignedTruckId: mockUser.assignedTruckId,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error in auth login API:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred' },
      { status: 500 }
    );
  }
}
