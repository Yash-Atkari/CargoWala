const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (parts) {
      const key = parts[1];
      let val = parts[2] || '';
      if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase credentials are missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearDatabase() {
  console.log('--- Cleaning Supabase Data for Fresh Testing ---');

  // 1. Reset all trucks to free/available state first
  console.log('Resetting trucks to AVAILABLE state with 0% utilization...');
  const { error: truckResetErr } = await supabase
    .from('trucks')
    .update({
      status: 'AVAILABLE',
      current_shipment_id: null,
      current_utilization: 0,
      weight_utilization: 0,
      assigned_loader_id: null,
      assigned_loader_name: null,
    })
    .neq('id', 'placeholder');

  if (truckResetErr) {
    console.error('Error resetting trucks:', truckResetErr);
  }

  // 2. Delete all tracking events
  console.log('Removing all tracking events...');
  const { error: teErr } = await supabase
    .from('tracking_events')
    .delete()
    .neq('id', 'placeholder');

  if (teErr) console.error('Error removing tracking events:', teErr);

  // 3. Delete all packages
  console.log('Removing all packages...');
  const { error: pkgErr } = await supabase
    .from('packages')
    .delete()
    .neq('id', 'placeholder');

  if (pkgErr) console.error('Error removing packages:', pkgErr);

  // 4. Delete all shipments / dispatches
  console.log('Removing all shipments / dispatches...');
  const { error: shipErr } = await supabase
    .from('shipments')
    .delete()
    .neq('id', 'placeholder');

  if (shipErr) console.error('Error removing shipments:', shipErr);

  // 5. Verify counts
  const { data: p } = await supabase.from('packages').select('id');
  const { data: s } = await supabase.from('shipments').select('id');
  const { data: te } = await supabase.from('tracking_events').select('id');
  const { data: tr } = await supabase.from('trucks').select('id, status, current_shipment_id');
  const { data: u } = await supabase.from('users').select('id, email, role');

  console.log('\n--- Final Database Status ---');
  console.log(`Packages count: ${p ? p.length : 0}`);
  console.log(`Shipments count: ${s ? s.length : 0}`);
  console.log(`Tracking events count: ${te ? te.length : 0}`);
  console.log(`Trucks available: ${tr ? tr.filter(t => t.status === 'AVAILABLE').length : 0} of ${tr ? tr.length : 0}`);
  console.log(`Users preserved for login: ${u ? u.length : 0} (Admin & Loaders ready)`);
  console.log('-------------------------------------------');
  console.log('Database successfully cleared! Ready for fresh testing.');
}

clearDatabase().catch((err) => {
  console.error('Clear failed:', err);
  process.exit(1);
});
