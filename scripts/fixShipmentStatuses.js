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
  console.error('Error: Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixShipments() {
  console.log('--- Updating active shipments with status LOADED to LOADING ---');
  const { data: shipments, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('status', 'LOADED');

  if (error) {
    console.error('Error fetching shipments:', error);
    return;
  }

  console.log(`Found ${shipments?.length || 0} shipments with status LOADED.`);
  if (shipments && shipments.length > 0) {
    for (const s of shipments) {
      console.log(`Updating shipment ${s.id} status to LOADING...`);
      const { error: updateErr } = await supabase
        .from('shipments')
        .update({ status: 'LOADING' })
        .eq('id', s.id);
      if (updateErr) {
        console.error(`Error updating shipment ${s.id}:`, updateErr);
      } else {
        console.log(`Successfully updated ${s.id} to LOADING.`);
      }
    }
  }

  // Also update any packages associated with these shipments to STAGED
  const { error: pkgErr } = await supabase
    .from('packages')
    .update({ status: 'STAGED', is_loaded: false })
    .eq('status', 'LOADED');

  if (pkgErr) {
    console.error('Error updating packages:', pkgErr);
  } else {
    console.log('Successfully updated packages to STAGED / is_loaded: false.');
  }

  console.log('--- Status Fix Complete ---');
}

fixShipments();
