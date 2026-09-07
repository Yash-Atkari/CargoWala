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

const MOCK_USERS = [
  { id: 'user-001', name: 'Rajesh Kumar', email: 'admin@cargowala.com', password: 'Admin@123', role: 'ADMIN', is_active: true },
  { id: 'user-002', name: 'Arjun Singh', email: 'loader1@cargowala.com', password: 'Loader@123', role: 'LOADER', is_active: true, assigned_truck_id: 'truck-001' },
  { id: 'user-003', name: 'Priya Sharma', email: 'loader2@cargowala.com', password: 'Loader@123', role: 'LOADER', is_active: true, assigned_truck_id: 'truck-003' },
];

const MOCK_TRUCKS = [
  { id: 'truck-001', registration_number: 'MH-12-AB-4521', model: 'Tata Prima 4928.S', length: 720, width: 240, height: 260, max_weight: 28000, current_utilization: 74, weight_utilization: 68, assigned_loader_id: 'user-002', assigned_loader_name: 'Arjun Singh', status: 'LOADING', current_shipment_id: 'shipment-001' },
  { id: 'truck-002', registration_number: 'DL-01-CG-7834', model: 'Ashok Leyland 3518', length: 600, width: 230, height: 250, max_weight: 18000, current_utilization: 91, weight_utilization: 88, assigned_loader_id: 'user-003', assigned_loader_name: 'Priya Sharma', status: 'IN_TRANSIT', current_shipment_id: 'shipment-002' },
  { id: 'truck-003', registration_number: 'GJ-05-DE-2290', model: 'Eicher Pro 6031', length: 540, width: 220, height: 240, max_weight: 14000, current_utilization: 55, weight_utilization: 51, assigned_loader_id: 'user-002', assigned_loader_name: 'Arjun Singh', status: 'AVAILABLE' },
  { id: 'truck-004', registration_number: 'KA-09-FG-5512', model: 'BharatBenz 3523R', length: 660, width: 235, height: 255, max_weight: 22000, current_utilization: 0, weight_utilization: 0, status: 'MAINTENANCE' },
  { id: 'truck-005', registration_number: 'TN-22-HJ-8801', model: 'Volvo FM 420', length: 780, width: 245, height: 270, max_weight: 32000, current_utilization: 82, weight_utilization: 79, assigned_loader_id: 'user-003', assigned_loader_name: 'Priya Sharma', status: 'IN_TRANSIT', current_shipment_id: 'shipment-003' },
  { id: 'truck-006', registration_number: 'RJ-14-KL-3340', model: 'Tata LPT 3118', length: 480, width: 210, height: 230, max_weight: 12000, current_utilization: 0, weight_utilization: 0, status: 'AVAILABLE' },
  { id: 'truck-007', registration_number: 'UP-80-MN-6673', model: 'Mahindra Blazo X 35', length: 630, width: 232, height: 252, max_weight: 20000, current_utilization: 63, weight_utilization: 59, status: 'IN_TRANSIT', current_shipment_id: 'shipment-004' },
  { id: 'truck-008', registration_number: 'WB-06-PQ-9921', model: 'Eicher Pro 8031', length: 700, width: 238, height: 258, max_weight: 25000, current_utilization: 0, weight_utilization: 0, status: 'AVAILABLE' },
];

const MOCK_PACKAGES = [
  { id: 'pkg-001', digital_id: 'CW-2026-PKG-001', name: 'Industrial Motor Unit', length: 80, width: 60, height: 70, weight: 145, fragility_level: 'MEDIUM', destination: 'Amravati', priority: 'HIGH', delivery_sequence: 1, status: 'PENDING', shipment_id: null, risk_score: 42, risk_level: 'MEDIUM', created_at: '2026-08-10T08:00:00Z', loading_order: 1, is_loaded: false, stacking_note: 'Bottom layer, secure with straps' },
  { id: 'pkg-002', digital_id: 'CW-2026-PKG-002', name: 'Medical Supplies Crate', length: 60, width: 50, height: 45, weight: 38, fragility_level: 'FRAGILE', destination: 'Akola', priority: 'URGENT', delivery_sequence: 2, status: 'PENDING', shipment_id: null, risk_score: 78, risk_level: 'HIGH', created_at: '2026-08-10T08:15:00Z', loading_order: 2, is_loaded: false, stacking_note: 'TOP SHELF ONLY — FRAGILE' },
  { id: 'pkg-003', digital_id: 'CW-2026-PKG-003', name: 'Auto Parts Bundle', length: 120, width: 80, height: 50, weight: 210, fragility_level: 'LOW', destination: 'Jalgaon', priority: 'NORMAL', delivery_sequence: 3, status: 'PENDING', shipment_id: null, risk_score: 18, risk_level: 'LOW', created_at: '2026-08-10T09:00:00Z', loading_order: 3, is_loaded: false, stacking_note: 'Heavy base layer' },
  { id: 'pkg-004', digital_id: 'CW-2026-PKG-004', name: 'Electronic Components Box', length: 55, width: 45, height: 35, weight: 22, fragility_level: 'HIGH', destination: 'Nashik', priority: 'HIGH', delivery_sequence: 4, status: 'PENDING', shipment_id: null, risk_score: 65, risk_level: 'HIGH', created_at: '2026-08-10T09:30:00Z', loading_order: 4, is_loaded: false, stacking_note: 'Do not stack above 2 layers' },
  { id: 'pkg-005', digital_id: 'CW-2026-PKG-005', name: 'Textile Rolls Pallet', length: 200, width: 100, height: 80, weight: 320, fragility_level: 'LOW', destination: 'Mumbai', priority: 'NORMAL', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 12, risk_level: 'LOW', created_at: '2026-08-09T10:00:00Z' },
  { id: 'pkg-006', digital_id: 'CW-2026-PKG-006', name: 'Pharmaceutical Cold Pack', length: 40, width: 35, height: 30, weight: 15, fragility_level: 'FRAGILE', destination: 'Jabalpur', priority: 'URGENT', delivery_sequence: 2, status: 'PENDING', shipment_id: null, risk_score: 82, risk_level: 'HIGH', created_at: '2026-08-09T10:30:00Z' },
  { id: 'pkg-007', digital_id: 'CW-2026-PKG-007', name: 'Construction Steel Rods', length: 300, width: 30, height: 30, weight: 480, fragility_level: 'LOW', destination: 'Delhi', priority: 'LOW', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 8, risk_level: 'LOW', created_at: '2026-08-09T11:00:00Z' },
  { id: 'pkg-008', digital_id: 'CW-2026-PKG-008', name: 'Precision Instruments Set', length: 70, width: 55, height: 50, weight: 68, fragility_level: 'FRAGILE', destination: 'Mumbai', priority: 'URGENT', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 74, risk_level: 'HIGH', created_at: '2026-08-08T07:00:00Z' },
  { id: 'pkg-009', digital_id: 'CW-2026-PKG-009', name: 'FMCG Goods Carton Stack', length: 150, width: 100, height: 120, weight: 280, fragility_level: 'MEDIUM', destination: 'Chennai', priority: 'NORMAL', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 31, risk_level: 'MEDIUM', created_at: '2026-08-08T07:30:00Z' },
  { id: 'pkg-010', digital_id: 'CW-2026-PKG-010', name: 'Chemical Drums (Sealed)', length: 90, width: 90, height: 110, weight: 390, fragility_level: 'HIGH', destination: 'Hyderabad', priority: 'HIGH', delivery_sequence: 3, status: 'PENDING', shipment_id: null, risk_score: 57, risk_level: 'MEDIUM', created_at: '2026-08-08T08:00:00Z' },
  { id: 'pkg-011', digital_id: 'CW-2026-PKG-011', name: 'Furniture Flat Pack x6', length: 180, width: 80, height: 15, weight: 95, fragility_level: 'MEDIUM', destination: 'Wardha', priority: 'NORMAL', delivery_sequence: 1, status: 'PENDING', shipment_id: null, risk_score: 29, risk_level: 'LOW', created_at: '2026-08-11T06:00:00Z' },
  { id: 'pkg-012', digital_id: 'CW-2026-PKG-012', name: 'Server Rack Unit', length: 100, width: 60, height: 180, weight: 125, fragility_level: 'FRAGILE', destination: 'Pune', priority: 'URGENT', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 71, risk_level: 'HIGH', created_at: '2026-08-11T06:30:00Z' },
  { id: 'pkg-013', digital_id: 'CW-2026-PKG-013', name: 'Agri Equipment Parts', length: 140, width: 90, height: 60, weight: 260, fragility_level: 'LOW', destination: 'Ahmednagar', priority: 'LOW', delivery_sequence: 4, status: 'PENDING', shipment_id: null, risk_score: 15, risk_level: 'LOW', created_at: '2026-08-11T07:00:00Z' },
  { id: 'pkg-014', digital_id: 'CW-2026-PKG-014', name: 'Ceramic Tiles Pallet', length: 120, width: 80, height: 60, weight: 540, fragility_level: 'HIGH', destination: 'Pune', priority: 'NORMAL', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 88, risk_level: 'HIGH', created_at: '2026-08-11T07:30:00Z' },
  { id: 'pkg-015', digital_id: 'CW-2026-PKG-015', name: 'Frozen Food Container', length: 80, width: 70, height: 65, weight: 190, fragility_level: 'MEDIUM', destination: 'Delhi', priority: 'URGENT', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 35, risk_level: 'MEDIUM', created_at: '2026-08-06T09:00:00Z' },
  { id: 'pkg-016', digital_id: 'CW-2026-PKG-016', name: 'Optical Fiber Spools', length: 110, width: 110, height: 90, weight: 155, fragility_level: 'HIGH', destination: 'Agra', priority: 'HIGH', delivery_sequence: 4, status: 'PENDING', shipment_id: null, risk_score: 48, risk_level: 'MEDIUM', created_at: '2026-08-06T09:30:00Z' },
  { id: 'pkg-017', digital_id: 'CW-2026-PKG-017', name: 'Bagged Cement x20', length: 200, width: 100, height: 100, weight: 1000, fragility_level: 'LOW', destination: 'Gwalior', priority: 'NORMAL', delivery_sequence: 3, status: 'PENDING', shipment_id: null, risk_score: 10, risk_level: 'LOW', created_at: '2026-08-06T10:00:00Z' },
  { id: 'pkg-018', digital_id: 'CW-2026-PKG-018', name: 'Solar Panel Array', length: 165, width: 100, height: 8, weight: 42, fragility_level: 'FRAGILE', destination: 'Delhi', priority: 'HIGH', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 69, risk_level: 'HIGH', created_at: '2026-08-06T10:30:00Z' },
  { id: 'pkg-019', digital_id: 'CW-2026-PKG-019', name: 'Hydraulic Press Components', length: 95, width: 75, height: 85, weight: 310, fragility_level: 'MEDIUM', destination: 'Chandrapur', priority: 'NORMAL', delivery_sequence: 1, status: 'PENDING', shipment_id: null, risk_score: 22, risk_level: 'LOW', created_at: '2026-08-05T08:00:00Z' },
  { id: 'pkg-020', digital_id: 'CW-2026-PKG-020', name: 'Glassware Export Carton', length: 65, width: 55, height: 60, weight: 48, fragility_level: 'FRAGILE', destination: 'Adilabad', priority: 'HIGH', delivery_sequence: 2, status: 'PENDING', shipment_id: null, risk_score: 76, risk_level: 'HIGH', created_at: '2026-08-05T08:30:00Z' },
  { id: 'pkg-021', digital_id: 'CW-2026-PKG-021', name: 'Tyre Batch x12', length: 140, width: 140, height: 60, weight: 420, fragility_level: 'LOW', destination: 'Chennai', priority: 'LOW', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 9, risk_level: 'LOW', created_at: '2026-08-05T09:00:00Z' },
  { id: 'pkg-022', digital_id: 'CW-2026-PKG-022', name: 'Paint Drums x8', length: 100, width: 80, height: 90, weight: 280, fragility_level: 'MEDIUM', destination: 'Vijayawada', priority: 'NORMAL', delivery_sequence: 4, status: 'PENDING', shipment_id: null, risk_score: 33, risk_level: 'MEDIUM', created_at: '2026-08-05T09:30:00Z' },
  { id: 'pkg-023', digital_id: 'CW-2026-PKG-023', name: 'Network Switch Stack', length: 50, width: 45, height: 40, weight: 18, fragility_level: 'HIGH', destination: 'Pune', priority: 'URGENT', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 61, risk_level: 'HIGH', created_at: '2026-08-12T10:00:00Z', loading_order: 5, is_loaded: false, stacking_note: 'Bubble wrap confirmed' },
  { id: 'pkg-024', digital_id: 'CW-2026-PKG-024', name: 'Bulk Grain Bags x30', length: 250, width: 120, height: 100, weight: 1500, fragility_level: 'LOW', destination: 'Akola', priority: 'LOW', delivery_sequence: 2, status: 'PENDING', shipment_id: null, risk_score: 5, risk_level: 'LOW', created_at: '2026-08-12T10:30:00Z', loading_order: 6, is_loaded: false, stacking_note: 'Floor position only' },
  { id: 'pkg-025', digital_id: 'CW-2026-PKG-025', name: 'Refrigeration Unit', length: 85, width: 70, height: 80, weight: 130, fragility_level: 'HIGH', destination: 'Pune', priority: 'HIGH', delivery_sequence: 5, status: 'PENDING', shipment_id: null, risk_score: 67, risk_level: 'HIGH', created_at: '2026-08-12T11:00:00Z', loading_order: 7, is_loaded: false, stacking_note: 'Secure refrigeration unit upright' },
];

const MOCK_SHIPMENTS = [
  { id: 'shipment-001', truck_id: 'truck-001', truck_registration: 'MH-12-AB-4521', loader_id: 'user-002', loader_name: 'Arjun Singh', status: 'LOADING', origin: 'Nagpur Hub', destination: 'Mumbai', departure_time: '2026-08-13T14:00:00Z', arrival_time: '2026-08-13T17:00:00Z', total_weight: 8450, total_volume: 12.4, package_count: 7, created_at: '2026-08-13T07:00:00Z' },
  { id: 'shipment-002', truck_id: 'truck-002', truck_registration: 'DL-01-CG-7834', loader_id: 'user-003', loader_name: 'Priya Sharma', status: 'IN_TRANSIT', origin: 'Nagpur Hub', destination: 'Delhi', departure_time: '2026-08-12T06:00:00Z', arrival_time: '2026-08-13T18:00:00Z', total_weight: 15800, total_volume: 28.7, package_count: 3, created_at: '2026-08-11T20:00:00Z' },
  { id: 'shipment-003', truck_id: 'truck-005', truck_registration: 'TN-22-HJ-8801', loader_id: 'user-003', loader_name: 'Priya Sharma', status: 'IN_TRANSIT', origin: 'Nagpur Hub', destination: 'Pune', departure_time: '2026-08-11T08:00:00Z', arrival_time: '2026-08-13T20:00:00Z', total_weight: 25300, total_volume: 42.1, package_count: 3, created_at: '2026-08-10T22:00:00Z' },
  { id: 'shipment-004', truck_id: 'truck-007', truck_registration: 'UP-80-MN-6673', loader_id: 'user-002', loader_name: 'Arjun Singh', status: 'DELAYED', origin: 'Nagpur Hub', destination: 'Chennai', departure_time: '2026-08-10T10:00:00Z', arrival_time: '2026-08-12T10:00:00Z', total_weight: 12500, total_volume: 18.9, package_count: 4, created_at: '2026-08-09T18:00:00Z' },
  { id: 'shipment-005', truck_id: 'truck-003', truck_registration: 'GJ-05-DE-2290', loader_id: 'user-002', loader_name: 'Arjun Singh', status: 'DELIVERED', origin: 'Nagpur Hub', destination: 'Mumbai', departure_time: '2026-08-07T06:00:00Z', arrival_time: '2026-08-08T18:00:00Z', total_weight: 11200, total_volume: 22.8, package_count: 4, created_at: '2026-08-06T20:00:00Z' },
  { id: 'shipment-006', truck_id: 'truck-002', truck_registration: 'DL-01-CG-7834', loader_id: 'user-003', loader_name: 'Priya Sharma', status: 'DELIVERED', origin: 'Nagpur Hub', destination: 'Delhi', departure_time: '2026-08-05T07:00:00Z', arrival_time: '2026-08-06T15:00:00Z', total_weight: 10800, total_volume: 19.3, package_count: 4, created_at: '2026-08-04T21:00:00Z' },
];

const MOCK_TRACKING_EVENTS = [
  { id: 'evt-001', shipment_id: 'shipment-001', event_type: 'CREATED', description: 'Shipment SHP-001 created and packages assigned.', timestamp: '2026-08-13T07:00:00Z', location: 'Mumbai Warehouse A', created_by: 'Rajesh Kumar' },
  { id: 'evt-002', shipment_id: 'shipment-001', event_type: 'RECEIVED', description: 'Truck MH-12-AB-4521 arrived at loading bay 3.', timestamp: '2026-08-13T08:30:00Z', location: 'Mumbai Warehouse A — Bay 3', created_by: 'Arjun Singh' },
  { id: 'evt-003', shipment_id: 'shipment-001', event_type: 'LOADING', description: 'Loading session started. 7 packages queued.', timestamp: '2026-08-13T09:15:00Z', location: 'Mumbai Warehouse A — Bay 3', created_by: 'Arjun Singh' },
  { id: 'evt-004', shipment_id: 'shipment-001', package_id: 'pkg-001', event_type: 'LOADED', description: 'Industrial Motor Unit loaded at position 1. Weight OK.', timestamp: '2026-08-13T09:40:00Z', location: 'Truck MH-12-AB-4521', created_by: 'Arjun Singh' },
  { id: 'evt-005', shipment_id: 'shipment-001', package_id: 'pkg-002', event_type: 'LOADED', description: 'Medical Supplies Crate loaded — FRAGILE, top-shelf position confirmed.', timestamp: '2026-08-13T10:05:00Z', location: 'Truck MH-12-AB-4521', created_by: 'Arjun Singh' },
  { id: 'evt-006', shipment_id: 'shipment-002', event_type: 'IN_TRANSIT', description: 'Truck DL-01-CG-7834 departed Delhi NCR Depot. ETA Ahmedabad 18:00.', timestamp: '2026-08-12T06:10:00Z', location: 'NH-48, Gurgaon Bypass', created_by: 'System' },
  { id: 'evt-007', shipment_id: 'shipment-003', event_type: 'IN_TRANSIT', description: 'Truck TN-22-HJ-8801 en route. Crossed Krishnagiri checkpoint.', timestamp: '2026-08-12T14:00:00Z', location: 'NH-44, Krishnagiri', created_by: 'System' },
  { id: 'evt-008', shipment_id: 'shipment-004', event_type: 'DELAYED', description: 'Shipment delayed — road closure on NH-275. New ETA 2026-08-14 10:00.', timestamp: '2026-08-12T08:00:00Z', location: 'NH-275, Mysuru Bypass', created_by: 'System' },
  { id: 'evt-009', shipment_id: 'shipment-004', package_id: 'pkg-014', event_type: 'DAMAGED', description: 'Ceramic Tiles Pallet reported damaged during transit. Assessment initiated.', timestamp: '2026-08-12T09:00:00Z', location: 'Truck UP-80-MN-6673', created_by: 'Arjun Singh' },
  { id: 'evt-010', shipment_id: 'shipment-005', event_type: 'DELIVERED', description: 'All 4 packages delivered to Lucknow Warehouse. POD signed.', timestamp: '2026-08-08T18:30:00Z', location: 'Lucknow Warehouse', created_by: 'Rajesh Kumar' },
  { id: 'evt-011', shipment_id: 'shipment-006', event_type: 'DELIVERED', description: 'Shipment delivered. 4/4 packages intact.', timestamp: '2026-08-06T15:00:00Z', location: 'Bhubaneswar Depot', created_by: 'Rajesh Kumar' },
];

async function seedTable(tableName, items) {
  console.log(`Seeding table ${tableName}...`);
  const { data, error } = await supabase.from(tableName).insert(items);
  if (error) {
    console.error(`Error seeding ${tableName}:`, error);
    throw error;
  }
}

async function main() {
  console.log('Clearing database tables...');
  // Delete all rows in each table
  await supabase.from('tracking_events').delete().neq('id', 'placeholder');
  await supabase.from('packages').delete().neq('id', 'placeholder');
  await supabase.from('shipments').delete().neq('id', 'placeholder');
  await supabase.from('trucks').delete().neq('id', 'placeholder');
  await supabase.from('users').delete().neq('id', 'placeholder');

  await seedTable('users', MOCK_USERS);
  await seedTable('trucks', MOCK_TRUCKS);
  
  // Format packages dates
  const pkgs = MOCK_PACKAGES.map(p => ({
    ...p,
    created_at: new Date(p.created_at || p.createdAt).toISOString()
  }));
  await seedTable('packages', pkgs);

  // Format shipments dates
  const shipments = MOCK_SHIPMENTS.map(s => ({
    ...s,
    departure_time: s.departure_time ? new Date(s.departure_time).toISOString() : null,
    arrival_time: s.arrival_time ? new Date(s.arrival_time).toISOString() : null,
    created_at: new Date(s.created_at).toISOString()
  }));
  await seedTable('shipments', shipments);

  // Format tracking events dates
  const events = MOCK_TRACKING_EVENTS.map(e => ({
    ...e,
    timestamp: new Date(e.timestamp).toISOString()
  }));
  await seedTable('tracking_events', events);

  console.log('Database seeding completed successfully!');
}

main().catch(err => {
  console.error('Seeding process failed:', err);
  process.exit(1);
});
