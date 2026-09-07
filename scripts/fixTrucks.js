const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fixing truck-002 and all trucks state...');
  const { data, error } = await supabase
    .from('trucks')
    .update({
      status: 'AVAILABLE',
      assigned_loader_id: null,
      assigned_loader_name: null,
      current_shipment_id: null,
      current_utilization: 0,
      weight_utilization: 0
    })
    .eq('id', 'truck-002')
    .select();

  console.log('Result:', data, 'Error:', error);

  // Also reset all other trucks if any are loading
  const { data: allTrucks } = await supabase.from('trucks').select('id');
  for (const t of allTrucks || []) {
    await supabase.from('trucks').update({
      status: 'AVAILABLE',
      assigned_loader_id: null,
      assigned_loader_name: null,
      current_shipment_id: null,
      current_utilization: 0,
      weight_utilization: 0
    }).eq('id', t.id);
  }

  const { data: all } = await supabase.from('trucks').select('id, registration_number, status, assigned_loader_name');
  console.log('All trucks status after update:', all);
}

run();
