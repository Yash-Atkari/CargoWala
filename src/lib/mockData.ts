// Re-export all type definitions from clean types module
export * from './types';

export const MOCK_USERS = [
  { id: 'user-001', name: 'Rajesh Kumar', email: 'admin@cargowala.com', password: 'Admin@123', role: 'ADMIN', isActive: true },
  { id: 'user-002', name: 'Arjun Singh', email: 'loader1@cargowala.com', password: 'Loader@123', role: 'LOADER', isActive: true, assignedTruckId: 'truck-001' },
  { id: 'user-003', name: 'Priya Sharma', email: 'loader2@cargowala.com', password: 'Loader@123', role: 'LOADER', isActive: true, assignedTruckId: 'truck-003' },
];

export const MOCK_TRUCKS = [
  { id: 'truck-001', registrationNumber: 'MH-12-AB-4521', model: 'Tata Prima 4928.S', length: 720, width: 240, height: 260, maxWeight: 28000, currentUtilization: 74, weightUtilization: 68, assignedLoaderId: 'user-002', assignedLoaderName: 'Arjun Singh', status: 'LOADING', currentShipmentId: 'shipment-001' },
  { id: 'truck-002', registrationNumber: 'DL-01-CG-7834', model: 'Ashok Leyland 3518', length: 600, width: 230, height: 250, maxWeight: 18000, currentUtilization: 91, weightUtilization: 88, assignedLoaderId: 'user-003', assignedLoaderName: 'Priya Sharma', status: 'IN_TRANSIT', currentShipmentId: 'shipment-002' },
  { id: 'truck-003', registrationNumber: 'GJ-05-DE-2290', model: 'Eicher Pro 6031', length: 540, width: 220, height: 240, maxWeight: 14000, currentUtilization: 55, weightUtilization: 51, assignedLoaderId: 'user-002', assignedLoaderName: 'Arjun Singh', status: 'AVAILABLE' },
  { id: 'truck-004', registrationNumber: 'KA-09-FG-5512', model: 'BharatBenz 3523R', length: 660, width: 235, height: 255, maxWeight: 22000, currentUtilization: 0, weightUtilization: 0, status: 'MAINTENANCE' },
  { id: 'truck-005', registrationNumber: 'TN-22-HJ-8801', model: 'Volvo FM 420', length: 780, width: 245, height: 270, maxWeight: 32000, currentUtilization: 82, weightUtilization: 79, assignedLoaderId: 'user-003', assignedLoaderName: 'Priya Sharma', status: 'IN_TRANSIT', currentShipmentId: 'shipment-003' },
  { id: 'truck-006', registrationNumber: 'RJ-14-KL-3340', model: 'Tata LPT 3118', length: 480, width: 210, height: 230, maxWeight: 12000, currentUtilization: 0, weightUtilization: 0, status: 'AVAILABLE' },
  { id: 'truck-007', registrationNumber: 'UP-80-MN-6673', model: 'Mahindra Blazo X 35', length: 630, width: 232, height: 252, maxWeight: 20000, currentUtilization: 63, weightUtilization: 59, status: 'IN_TRANSIT', currentShipmentId: 'shipment-004' },
  { id: 'truck-008', registrationNumber: 'WB-06-PQ-9921', model: 'Eicher Pro 8031', length: 700, width: 238, height: 258, maxWeight: 25000, currentUtilization: 0, weightUtilization: 0, status: 'AVAILABLE' },
];

export const MOCK_PACKAGES = [
  { id: 'pkg-001', digitalId: 'CW-2026-PKG-001', name: 'Industrial Motor Unit', length: 80, width: 60, height: 70, weight: 145, fragilityLevel: 'MEDIUM', destination: 'Pune', priority: 'HIGH', deliverySequence: 1, status: 'LOADED', shipmentId: 'shipment-001', riskScore: 42, riskLevel: 'MEDIUM', createdAt: '2026-08-10T08:00:00Z', loadingOrder: 1, isLoaded: true, stackingNote: 'Bottom layer, secure with straps' },
  { id: 'pkg-002', digitalId: 'CW-2026-PKG-002', name: 'Medical Supplies Crate', length: 60, width: 50, height: 45, weight: 38, fragilityLevel: 'FRAGILE', destination: 'Nashik', priority: 'URGENT', deliverySequence: 2, status: 'LOADED', shipmentId: 'shipment-001', riskScore: 78, riskLevel: 'HIGH', createdAt: '2026-08-10T08:15:00Z', loadingOrder: 2, isLoaded: true, stackingNote: 'TOP SHELF ONLY — FRAGILE' },
  { id: 'pkg-003', digitalId: 'CW-2026-PKG-003', name: 'Auto Parts Bundle', length: 120, width: 80, height: 50, weight: 210, fragilityLevel: 'LOW', destination: 'Aurangabad', priority: 'NORMAL', deliverySequence: 3, status: 'PENDING', shipmentId: 'shipment-001', riskScore: 18, riskLevel: 'LOW', createdAt: '2026-08-10T09:00:00Z', loadingOrder: 3, isLoaded: false, stackingNote: 'Heavy base layer' },
  { id: 'pkg-004', digitalId: 'CW-2026-PKG-004', name: 'Electronic Components Box', length: 55, width: 45, height: 35, weight: 22, fragilityLevel: 'HIGH', destination: 'Nagpur', priority: 'HIGH', deliverySequence: 4, status: 'PENDING', shipmentId: 'shipment-001', riskScore: 65, riskLevel: 'HIGH', created_at: '2026-08-10T09:30:00Z', loadingOrder: 4, isLoaded: false, stackingNote: 'Do not stack above 2 layers' },
  { id: 'pkg-005', digitalId: 'CW-2026-PKG-005', name: 'Textile Rolls Pallet', length: 200, width: 100, height: 80, weight: 320, fragilityLevel: 'LOW', destination: 'Surat', priority: 'NORMAL', deliverySequence: 1, status: 'IN_TRANSIT', shipmentId: 'shipment-002', riskScore: 12, riskLevel: 'LOW', createdAt: '2026-08-09T10:00:00Z' },
  { id: 'pkg-006', digitalId: 'CW-2026-PKG-006', name: 'Pharmaceutical Cold Pack', length: 40, width: 35, height: 30, weight: 15, fragilityLevel: 'FRAGILE', destination: 'Ahmedabad', priority: 'URGENT', deliverySequence: 2, status: 'IN_TRANSIT', shipmentId: 'shipment-002', riskScore: 82, riskLevel: 'HIGH', createdAt: '2026-08-09T10:30:00Z' },
  { id: 'pkg-007', digitalId: 'CW-2026-PKG-007', name: 'Construction Steel Rods', length: 300, width: 30, height: 30, weight: 480, fragilityLevel: 'LOW', destination: 'Vadodara', priority: 'LOW', deliverySequence: 3, status: 'IN_TRANSIT', shipmentId: 'shipment-002', riskScore: 8, riskLevel: 'LOW', createdAt: '2026-08-09T11:00:00Z' },
];
