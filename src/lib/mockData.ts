export type UserRole = 'ADMIN' | 'LOADER';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  assignedTruckId?: string;
}

export interface MockTruck {
  id: string;
  registrationNumber: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  currentUtilization: number;
  weightUtilization: number;
  assignedLoaderId?: string;
  assignedLoaderName?: string;
  status: 'AVAILABLE' | 'LOADING' | 'IN_TRANSIT' | 'MAINTENANCE';
  currentShipmentId?: string;
  model: string;
}

export interface MockPackage {
  id: string;
  digitalId: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  fragilityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'FRAGILE';
  destination: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  deliverySequence: number;
  status: 'PENDING' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'DAMAGED';
  shipmentId?: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export interface MockShipment {
  id: string;
  truckId: string;
  truckRegistration: string;
  loaderId: string;
  loaderName: string;
  status: 'PENDING' | 'LOADING' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED';
  departureTime?: string;
  arrivalTime?: string;
  origin: string;
  destination: string;
  totalWeight: number;
  totalVolume: number;
  packageCount: number;
  createdAt: string;
}

export interface MockTrackingEvent {
  id: string;
  shipmentId: string;
  packageId?: string;
  eventType: 'CREATED' | 'RECEIVED' | 'LOADING' | 'LOADED' | 'IN_TRANSIT' | 'UNLOADED' | 'DELIVERED' | 'DAMAGED' | 'DELAYED';
  description: string;
  timestamp: string;
  location: string;
  createdBy: string;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: 'OVERWEIGHT' | 'CAPACITY' | 'DELAYED' | 'HIGH_RISK' | 'SESSION_COMPLETE' | 'INFO';
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

export interface MockLoadingPackage extends MockPackage {
  loadingOrder: number;
  isLoaded: boolean;
  stackingNote?: string;
}

// ─── USERS ───────────────────────────────────────────────────────────────────
export const MOCK_USERS: MockUser[] = [
  {
    id: 'user-001',
    name: 'Rajesh Kumar',
    email: 'admin@cargowala.com',
    password: 'Admin@123',
    role: 'ADMIN',
    isActive: true,
  },
  {
    id: 'user-002',
    name: 'Arjun Singh',
    email: 'loader1@cargowala.com',
    password: 'Loader@123',
    role: 'LOADER',
    isActive: true,
    assignedTruckId: 'truck-001',
  },
  {
    id: 'user-003',
    name: 'Priya Sharma',
    email: 'loader2@cargowala.com',
    password: 'Loader@123',
    role: 'LOADER',
    isActive: true,
    assignedTruckId: 'truck-003',
  },
];

// ─── TRUCKS ──────────────────────────────────────────────────────────────────
export const MOCK_TRUCKS: MockTruck[] = [
  {
    id: 'truck-001',
    registrationNumber: 'MH-12-AB-4521',
    model: 'Tata Prima 4928.S',
    length: 720,
    width: 240,
    height: 260,
    maxWeight: 28000,
    currentUtilization: 74,
    weightUtilization: 68,
    assignedLoaderId: 'user-002',
    assignedLoaderName: 'Arjun Singh',
    status: 'LOADING',
    currentShipmentId: 'shipment-001',
  },
  {
    id: 'truck-002',
    registrationNumber: 'DL-01-CG-7834',
    model: 'Ashok Leyland 3518',
    length: 600,
    width: 230,
    height: 250,
    maxWeight: 18000,
    currentUtilization: 91,
    weightUtilization: 88,
    assignedLoaderId: 'user-003',
    assignedLoaderName: 'Priya Sharma',
    status: 'IN_TRANSIT',
    currentShipmentId: 'shipment-002',
  },
  {
    id: 'truck-003',
    registrationNumber: 'GJ-05-DE-2290',
    model: 'Eicher Pro 6031',
    length: 540,
    width: 220,
    height: 240,
    maxWeight: 14000,
    currentUtilization: 55,
    weightUtilization: 51,
    assignedLoaderId: 'user-002',
    assignedLoaderName: 'Arjun Singh',
    status: 'AVAILABLE',
  },
  {
    id: 'truck-004',
    registrationNumber: 'KA-09-FG-5512',
    model: 'BharatBenz 3523R',
    length: 660,
    width: 235,
    height: 255,
    maxWeight: 22000,
    currentUtilization: 0,
    weightUtilization: 0,
    status: 'MAINTENANCE',
  },
  {
    id: 'truck-005',
    registrationNumber: 'TN-22-HJ-8801',
    model: 'Volvo FM 420',
    length: 780,
    width: 245,
    height: 270,
    maxWeight: 32000,
    currentUtilization: 82,
    weightUtilization: 79,
    assignedLoaderId: 'user-003',
    assignedLoaderName: 'Priya Sharma',
    status: 'IN_TRANSIT',
    currentShipmentId: 'shipment-003',
  },
  {
    id: 'truck-006',
    registrationNumber: 'RJ-14-KL-3340',
    model: 'Tata LPT 3118',
    length: 480,
    width: 210,
    height: 230,
    maxWeight: 12000,
    currentUtilization: 0,
    weightUtilization: 0,
    status: 'AVAILABLE',
  },
  {
    id: 'truck-007',
    registrationNumber: 'UP-80-MN-6673',
    model: 'Mahindra Blazo X 35',
    length: 630,
    width: 232,
    height: 252,
    maxWeight: 20000,
    currentUtilization: 63,
    weightUtilization: 59,
    status: 'IN_TRANSIT',
    currentShipmentId: 'shipment-004',
  },
  {
    id: 'truck-008',
    registrationNumber: 'WB-06-PQ-9921',
    model: 'Eicher Pro 8031',
    length: 700,
    width: 238,
    height: 258,
    maxWeight: 25000,
    currentUtilization: 0,
    weightUtilization: 0,
    status: 'AVAILABLE',
  },
];

// ─── PACKAGES ─────────────────────────────────────────────────────────────────
export const MOCK_PACKAGES: MockPackage[] = [
  {
    id: 'pkg-001', digitalId: 'CW-2026-PKG-001',
    name: 'Industrial Motor Unit', length: 80, width: 60, height: 70,
    weight: 145, fragilityLevel: 'MEDIUM', destination: 'Pune', priority: 'HIGH',
    deliverySequence: 1, status: 'LOADED', shipmentId: 'shipment-001',
    riskScore: 42, riskLevel: 'MEDIUM', createdAt: '2026-08-10T08:00:00Z',
  },
  {
    id: 'pkg-002', digitalId: 'CW-2026-PKG-002',
    name: 'Medical Supplies Crate', length: 60, width: 50, height: 45,
    weight: 38, fragilityLevel: 'FRAGILE', destination: 'Nashik', priority: 'URGENT',
    deliverySequence: 2, status: 'LOADED', shipmentId: 'shipment-001',
    riskScore: 78, riskLevel: 'HIGH', createdAt: '2026-08-10T08:15:00Z',
  },
  {
    id: 'pkg-003', digitalId: 'CW-2026-PKG-003',
    name: 'Auto Parts Bundle', length: 120, width: 80, height: 50,
    weight: 210, fragilityLevel: 'LOW', destination: 'Aurangabad', priority: 'NORMAL',
    deliverySequence: 3, status: 'PENDING', shipmentId: 'shipment-001',
    riskScore: 18, riskLevel: 'LOW', createdAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'pkg-004', digitalId: 'CW-2026-PKG-004',
    name: 'Electronic Components Box', length: 55, width: 45, height: 35,
    weight: 22, fragilityLevel: 'HIGH', destination: 'Nagpur', priority: 'HIGH',
    deliverySequence: 4, status: 'PENDING', shipmentId: 'shipment-001',
    riskScore: 65, riskLevel: 'HIGH', createdAt: '2026-08-10T09:30:00Z',
  },
  {
    id: 'pkg-005', digitalId: 'CW-2026-PKG-005',
    name: 'Textile Rolls Pallet', length: 200, width: 100, height: 80,
    weight: 320, fragilityLevel: 'LOW', destination: 'Surat', priority: 'NORMAL',
    deliverySequence: 1, status: 'IN_TRANSIT', shipmentId: 'shipment-002',
    riskScore: 12, riskLevel: 'LOW', createdAt: '2026-08-09T10:00:00Z',
  },
  {
    id: 'pkg-006', digitalId: 'CW-2026-PKG-006',
    name: 'Pharmaceutical Cold Pack', length: 40, width: 35, height: 30,
    weight: 15, fragilityLevel: 'FRAGILE', destination: 'Ahmedabad', priority: 'URGENT',
    deliverySequence: 2, status: 'IN_TRANSIT', shipmentId: 'shipment-002',
    riskScore: 82, riskLevel: 'HIGH', createdAt: '2026-08-09T10:30:00Z',
  },
  {
    id: 'pkg-007', digitalId: 'CW-2026-PKG-007',
    name: 'Construction Steel Rods', length: 300, width: 30, height: 30,
    weight: 480, fragilityLevel: 'LOW', destination: 'Vadodara', priority: 'LOW',
    deliverySequence: 3, status: 'IN_TRANSIT', shipmentId: 'shipment-002',
    riskScore: 8, riskLevel: 'LOW', createdAt: '2026-08-09T11:00:00Z',
  },
  {
    id: 'pkg-008', digitalId: 'CW-2026-PKG-008',
    name: 'Precision Instruments Set', length: 70, width: 55, height: 50,
    weight: 68, fragilityLevel: 'FRAGILE', destination: 'Mumbai', priority: 'URGENT',
    deliverySequence: 1, status: 'IN_TRANSIT', shipmentId: 'shipment-003',
    riskScore: 74, riskLevel: 'HIGH', createdAt: '2026-08-08T07:00:00Z',
  },
  {
    id: 'pkg-009', digitalId: 'CW-2026-PKG-009',
    name: 'FMCG Goods Carton Stack', length: 150, width: 100, height: 120,
    weight: 280, fragilityLevel: 'MEDIUM', destination: 'Chennai', priority: 'NORMAL',
    deliverySequence: 2, status: 'IN_TRANSIT', shipmentId: 'shipment-003',
    riskScore: 31, riskLevel: 'MEDIUM', createdAt: '2026-08-08T07:30:00Z',
  },
  {
    id: 'pkg-010', digitalId: 'CW-2026-PKG-010',
    name: 'Chemical Drums (Sealed)', length: 90, width: 90, height: 110,
    weight: 390, fragilityLevel: 'HIGH', destination: 'Hyderabad', priority: 'HIGH',
    deliverySequence: 3, status: 'IN_TRANSIT', shipmentId: 'shipment-003',
    riskScore: 57, riskLevel: 'MEDIUM', createdAt: '2026-08-08T08:00:00Z',
  },
  {
    id: 'pkg-011', digitalId: 'CW-2026-PKG-011',
    name: 'Furniture Flat Pack x6', length: 180, width: 80, height: 15,
    weight: 95, fragilityLevel: 'MEDIUM', destination: 'Bengaluru', priority: 'NORMAL',
    deliverySequence: 1, status: 'IN_TRANSIT', shipmentId: 'shipment-004',
    riskScore: 29, riskLevel: 'LOW', createdAt: '2026-08-11T06:00:00Z',
  },
  {
    id: 'pkg-012', digitalId: 'CW-2026-PKG-012',
    name: 'Server Rack Unit', length: 100, width: 60, height: 180,
    weight: 125, fragilityLevel: 'FRAGILE', destination: 'Bengaluru', priority: 'URGENT',
    deliverySequence: 2, status: 'IN_TRANSIT', shipmentId: 'shipment-004',
    riskScore: 71, riskLevel: 'HIGH', createdAt: '2026-08-11T06:30:00Z',
  },
  {
    id: 'pkg-013', digitalId: 'CW-2026-PKG-013',
    name: 'Agri Equipment Parts', length: 140, width: 90, height: 60,
    weight: 260, fragilityLevel: 'LOW', destination: 'Mysuru', priority: 'LOW',
    deliverySequence: 3, status: 'IN_TRANSIT', shipmentId: 'shipment-004',
    riskScore: 15, riskLevel: 'LOW', createdAt: '2026-08-11T07:00:00Z',
  },
  {
    id: 'pkg-014', digitalId: 'CW-2026-PKG-014',
    name: 'Ceramic Tiles Pallet', length: 120, width: 80, height: 60,
    weight: 540, fragilityLevel: 'HIGH', destination: 'Coimbatore', priority: 'NORMAL',
    deliverySequence: 4, status: 'DAMAGED', shipmentId: 'shipment-004',
    riskScore: 88, riskLevel: 'HIGH', createdAt: '2026-08-11T07:30:00Z',
  },
  {
    id: 'pkg-015', digitalId: 'CW-2026-PKG-015',
    name: 'Frozen Food Container', length: 80, width: 70, height: 65,
    weight: 190, fragilityLevel: 'MEDIUM', destination: 'Delhi', priority: 'URGENT',
    deliverySequence: 1, status: 'DELIVERED', shipmentId: 'shipment-005',
    riskScore: 35, riskLevel: 'MEDIUM', createdAt: '2026-08-06T09:00:00Z',
  },
  {
    id: 'pkg-016', digitalId: 'CW-2026-PKG-016',
    name: 'Optical Fiber Spools', length: 110, width: 110, height: 90,
    weight: 155, fragilityLevel: 'HIGH', destination: 'Jaipur', priority: 'HIGH',
    deliverySequence: 2, status: 'DELIVERED', shipmentId: 'shipment-005',
    riskScore: 48, riskLevel: 'MEDIUM', createdAt: '2026-08-06T09:30:00Z',
  },
  {
    id: 'pkg-017', digitalId: 'CW-2026-PKG-017',
    name: 'Bagged Cement x20', length: 200, width: 100, height: 100,
    weight: 1000, fragilityLevel: 'LOW', destination: 'Lucknow', priority: 'NORMAL',
    deliverySequence: 3, status: 'DELIVERED', shipmentId: 'shipment-005',
    riskScore: 10, riskLevel: 'LOW', createdAt: '2026-08-06T10:00:00Z',
  },
  {
    id: 'pkg-018', digitalId: 'CW-2026-PKG-018',
    name: 'Solar Panel Array', length: 165, width: 100, height: 8,
    weight: 42, fragilityLevel: 'FRAGILE', destination: 'Chandigarh', priority: 'HIGH',
    deliverySequence: 4, status: 'DELIVERED', shipmentId: 'shipment-005',
    riskScore: 69, riskLevel: 'HIGH', createdAt: '2026-08-06T10:30:00Z',
  },
  {
    id: 'pkg-019', digitalId: 'CW-2026-PKG-019',
    name: 'Hydraulic Press Components', length: 95, width: 75, height: 85,
    weight: 310, fragilityLevel: 'MEDIUM', destination: 'Kolkata', priority: 'NORMAL',
    deliverySequence: 1, status: 'DELIVERED', shipmentId: 'shipment-006',
    riskScore: 22, riskLevel: 'LOW', createdAt: '2026-08-05T08:00:00Z',
  },
  {
    id: 'pkg-020', digitalId: 'CW-2026-PKG-020',
    name: 'Glassware Export Carton', length: 65, width: 55, height: 60,
    weight: 48, fragilityLevel: 'FRAGILE', destination: 'Kolkata', priority: 'HIGH',
    deliverySequence: 2, status: 'DELIVERED', shipmentId: 'shipment-006',
    riskScore: 76, riskLevel: 'HIGH', createdAt: '2026-08-05T08:30:00Z',
  },
  {
    id: 'pkg-021', digitalId: 'CW-2026-PKG-021',
    name: 'Tyre Batch x12', length: 140, width: 140, height: 60,
    weight: 420, fragilityLevel: 'LOW', destination: 'Bhubaneswar', priority: 'LOW',
    deliverySequence: 3, status: 'DELIVERED', shipmentId: 'shipment-006',
    riskScore: 9, riskLevel: 'LOW', createdAt: '2026-08-05T09:00:00Z',
  },
  {
    id: 'pkg-022', digitalId: 'CW-2026-PKG-022',
    name: 'Paint Drums x8', length: 100, width: 80, height: 90,
    weight: 280, fragilityLevel: 'MEDIUM', destination: 'Bhubaneswar', priority: 'NORMAL',
    deliverySequence: 4, status: 'DELIVERED', shipmentId: 'shipment-006',
    riskScore: 33, riskLevel: 'MEDIUM', createdAt: '2026-08-05T09:30:00Z',
  },
  {
    id: 'pkg-023', digitalId: 'CW-2026-PKG-023',
    name: 'Network Switch Stack', length: 50, width: 45, height: 40,
    weight: 18, fragilityLevel: 'HIGH', destination: 'Pune', priority: 'URGENT',
    deliverySequence: 5, status: 'PENDING', shipmentId: 'shipment-001',
    riskScore: 61, riskLevel: 'HIGH', createdAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'pkg-024', digitalId: 'CW-2026-PKG-024',
    name: 'Bulk Grain Bags x30', length: 250, width: 120, height: 100,
    weight: 1500, fragilityLevel: 'LOW', destination: 'Nagpur', priority: 'LOW',
    deliverySequence: 6, status: 'PENDING', shipmentId: 'shipment-001',
    riskScore: 5, riskLevel: 'LOW', createdAt: '2026-08-12T10:30:00Z',
  },
  {
    id: 'pkg-025', digitalId: 'CW-2026-PKG-025',
    name: 'Refrigeration Unit', length: 85, width: 70, height: 80,
    weight: 130, fragilityLevel: 'HIGH', destination: 'Pune', priority: 'HIGH',
    deliverySequence: 7, status: 'PENDING', shipmentId: 'shipment-001',
    riskScore: 67, riskLevel: 'HIGH', createdAt: '2026-08-12T11:00:00Z',
  },
];

// ─── SHIPMENTS ────────────────────────────────────────────────────────────────
export const MOCK_SHIPMENTS: MockShipment[] = [
  {
    id: 'shipment-001', truckId: 'truck-001', truckRegistration: 'MH-12-AB-4521',
    loaderId: 'user-002', loaderName: 'Arjun Singh',
    status: 'LOADING', origin: 'Mumbai Warehouse A', destination: 'Pune Distribution Hub',
    departureTime: '2026-08-13T14:00:00Z', arrivalTime: '2026-08-13T17:00:00Z',
    totalWeight: 8450, totalVolume: 12.4, packageCount: 7, createdAt: '2026-08-13T07:00:00Z',
  },
  {
    id: 'shipment-002', truckId: 'truck-002', truckRegistration: 'DL-01-CG-7834',
    loaderId: 'user-003', loaderName: 'Priya Sharma',
    status: 'IN_TRANSIT', origin: 'Delhi NCR Depot', destination: 'Ahmedabad Logistics Park',
    departureTime: '2026-08-12T06:00:00Z', arrivalTime: '2026-08-13T18:00:00Z',
    totalWeight: 15800, totalVolume: 28.7, packageCount: 3, createdAt: '2026-08-11T20:00:00Z',
  },
  {
    id: 'shipment-003', truckId: 'truck-005', truckRegistration: 'TN-22-HJ-8801',
    loaderId: 'user-003', loaderName: 'Priya Sharma',
    status: 'IN_TRANSIT', origin: 'Chennai Port Yard', destination: 'Hyderabad Central',
    departureTime: '2026-08-11T08:00:00Z', arrivalTime: '2026-08-13T20:00:00Z',
    totalWeight: 25300, totalVolume: 42.1, packageCount: 3, createdAt: '2026-08-10T22:00:00Z',
  },
  {
    id: 'shipment-004', truckId: 'truck-007', truckRegistration: 'UP-80-MN-6673',
    loaderId: 'user-002', loaderName: 'Arjun Singh',
    status: 'DELAYED', origin: 'Bengaluru Tech Park', destination: 'Coimbatore Hub',
    departureTime: '2026-08-10T10:00:00Z', arrivalTime: '2026-08-12T10:00:00Z',
    totalWeight: 12500, totalVolume: 18.9, packageCount: 4, createdAt: '2026-08-09T18:00:00Z',
  },
  {
    id: 'shipment-005', truckId: 'truck-003', truckRegistration: 'GJ-05-DE-2290',
    loaderId: 'user-002', loaderName: 'Arjun Singh',
    status: 'DELIVERED', origin: 'Jaipur Depot', destination: 'Lucknow Warehouse',
    departureTime: '2026-08-07T06:00:00Z', arrivalTime: '2026-08-08T18:00:00Z',
    totalWeight: 11200, totalVolume: 22.8, packageCount: 4, createdAt: '2026-08-06T20:00:00Z',
  },
  {
    id: 'shipment-006', truckId: 'truck-002', truckRegistration: 'DL-01-CG-7834',
    loaderId: 'user-003', loaderName: 'Priya Sharma',
    status: 'DELIVERED', origin: 'Kolkata Dockyard', destination: 'Bhubaneswar Depot',
    departureTime: '2026-08-05T07:00:00Z', arrivalTime: '2026-08-06T15:00:00Z',
    totalWeight: 10800, totalVolume: 19.3, packageCount: 4, createdAt: '2026-08-04T21:00:00Z',
  },
];

// ─── TRACKING EVENTS ──────────────────────────────────────────────────────────
export const MOCK_TRACKING_EVENTS: MockTrackingEvent[] = [
  {
    id: 'evt-001', shipmentId: 'shipment-001', eventType: 'CREATED',
    description: 'Shipment SHP-001 created and packages assigned.',
    timestamp: '2026-08-13T07:00:00Z', location: 'Mumbai Warehouse A', createdBy: 'Rajesh Kumar',
  },
  {
    id: 'evt-002', shipmentId: 'shipment-001', eventType: 'RECEIVED',
    description: 'Truck MH-12-AB-4521 arrived at loading bay 3.',
    timestamp: '2026-08-13T08:30:00Z', location: 'Mumbai Warehouse A — Bay 3', createdBy: 'Arjun Singh',
  },
  {
    id: 'evt-003', shipmentId: 'shipment-001', eventType: 'LOADING',
    description: 'Loading session started. 7 packages queued.',
    timestamp: '2026-08-13T09:15:00Z', location: 'Mumbai Warehouse A — Bay 3', createdBy: 'Arjun Singh',
  },
  {
    id: 'evt-004', shipmentId: 'shipment-001', packageId: 'pkg-001', eventType: 'LOADED',
    description: 'Industrial Motor Unit loaded at position 1. Weight OK.',
    timestamp: '2026-08-13T09:40:00Z', location: 'Truck MH-12-AB-4521', createdBy: 'Arjun Singh',
  },
  {
    id: 'evt-005', shipmentId: 'shipment-001', packageId: 'pkg-002', eventType: 'LOADED',
    description: 'Medical Supplies Crate loaded — FRAGILE, top-shelf position confirmed.',
    timestamp: '2026-08-13T10:05:00Z', location: 'Truck MH-12-AB-4521', createdBy: 'Arjun Singh',
  },
  {
    id: 'evt-006', shipmentId: 'shipment-002', eventType: 'IN_TRANSIT',
    description: 'Truck DL-01-CG-7834 departed Delhi NCR Depot. ETA Ahmedabad 18:00.',
    timestamp: '2026-08-12T06:10:00Z', location: 'NH-48, Gurgaon Bypass', createdBy: 'System',
  },
  {
    id: 'evt-007', shipmentId: 'shipment-003', eventType: 'IN_TRANSIT',
    description: 'Truck TN-22-HJ-8801 en route. Crossed Krishnagiri checkpoint.',
    timestamp: '2026-08-12T14:00:00Z', location: 'NH-44, Krishnagiri', createdBy: 'System',
  },
  {
    id: 'evt-008', shipmentId: 'shipment-004', eventType: 'DELAYED',
    description: 'Shipment delayed — road closure on NH-275. New ETA 2026-08-14 10:00.',
    timestamp: '2026-08-12T08:00:00Z', location: 'NH-275, Mysuru Bypass', createdBy: 'System',
  },
  {
    id: 'evt-009', shipmentId: 'shipment-004', packageId: 'pkg-014', eventType: 'DAMAGED',
    description: 'Ceramic Tiles Pallet reported damaged during transit. Assessment initiated.',
    timestamp: '2026-08-12T09:00:00Z', location: 'Truck UP-80-MN-6673', createdBy: 'Arjun Singh',
  },
  {
    id: 'evt-010', shipmentId: 'shipment-005', eventType: 'DELIVERED',
    description: 'All 4 packages delivered to Lucknow Warehouse. POD signed.',
    timestamp: '2026-08-08T18:30:00Z', location: 'Lucknow Warehouse', createdBy: 'Rajesh Kumar',
  },
  {
    id: 'evt-011', shipmentId: 'shipment-006', eventType: 'DELIVERED',
    description: 'Shipment delivered. 4/4 packages intact.',
    timestamp: '2026-08-06T15:00:00Z', location: 'Bhubaneswar Depot', createdBy: 'Rajesh Kumar',
  },
];

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: 'notif-001', userId: 'user-001', type: 'DELAYED',
    title: 'Shipment Delayed — SHP-004',
    message: 'Truck UP-80-MN-6673 is delayed due to road closure on NH-275. New ETA: Aug 14, 10:00.',
    isRead: false, relatedEntityId: 'shipment-004', createdAt: '2026-08-12T08:05:00Z',
  },
  {
    id: 'notif-002', userId: 'user-001', type: 'HIGH_RISK',
    title: 'High-Risk Package — Medical Supplies Crate',
    message: 'CW-2026-PKG-002 has a damage risk score of 78/100. Verify stacking position.',
    isRead: false, relatedEntityId: 'pkg-002', createdAt: '2026-08-13T09:15:00Z',
  },
  {
    id: 'notif-003', userId: 'user-001', type: 'HIGH_RISK',
    title: 'High-Risk Package — Pharmaceutical Cold Pack',
    message: 'CW-2026-PKG-006 has a damage risk score of 82/100. Fragile + high priority.',
    isRead: false, relatedEntityId: 'pkg-006', createdAt: '2026-08-12T11:00:00Z',
  },
  {
    id: 'notif-004', userId: 'user-001', type: 'CAPACITY',
    title: 'Truck Near Capacity — DL-01-CG-7834',
    message: 'Truck DL-01-CG-7834 is at 91% space utilization. No additional packages recommended.',
    isRead: true, relatedEntityId: 'truck-002', createdAt: '2026-08-11T20:30:00Z',
  },
  {
    id: 'notif-005', userId: 'user-001', type: 'INFO',
    title: 'Shipment Delivered — SHP-005',
    message: 'All 4 packages in shipment to Lucknow Warehouse delivered successfully.',
    isRead: true, relatedEntityId: 'shipment-005', createdAt: '2026-08-08T18:35:00Z',
  },
  {
    id: 'notif-006', userId: 'user-002', type: 'SESSION_COMPLETE',
    title: 'Loading Session Pending',
    message: 'Shipment SHP-001 loading session is in progress. 2/7 packages loaded.',
    isRead: false, relatedEntityId: 'shipment-001', createdAt: '2026-08-13T10:10:00Z',
  },
  {
    id: 'notif-007', userId: 'user-002', type: 'HIGH_RISK',
    title: 'Handle with Care — Medical Supplies Crate',
    message: 'CW-2026-PKG-002 is FRAGILE with risk score 78. Place on top shelf only.',
    isRead: false, relatedEntityId: 'pkg-002', createdAt: '2026-08-13T09:20:00Z',
  },
];

// ─── LOADER DASHBOARD DATA ─────────────────────────────────────────────────────
export const LOADER_ASSIGNED_TRUCK = MOCK_TRUCKS[0];
export const LOADER_CURRENT_SHIPMENT = MOCK_SHIPMENTS[0];

export const LOADER_PACKAGE_QUEUE: MockLoadingPackage[] = [
  { ...MOCK_PACKAGES[0], loadingOrder: 1, isLoaded: true, stackingNote: 'Bottom layer, secure with straps' },
  { ...MOCK_PACKAGES[1], loadingOrder: 2, isLoaded: true, stackingNote: 'TOP SHELF ONLY — FRAGILE' },
  { ...MOCK_PACKAGES[2], loadingOrder: 3, isLoaded: false, stackingNote: 'Heavy base layer' },
  { ...MOCK_PACKAGES[3], loadingOrder: 4, isLoaded: false, stackingNote: 'Do not stack above 2 layers' },
  { ...MOCK_PACKAGES[22], loadingOrder: 5, isLoaded: false, stackingNote: 'Bubble wrap confirmed' },
  { ...MOCK_PACKAGES[23], loadingOrder: 6, isLoaded: false, stackingNote: 'Floor position only' },
  { ...MOCK_PACKAGES[24], loadingOrder: 7, isLoaded: false, stackingNote: 'Secure refrigeration unit upright' },
];

// ─── ANALYTICS DATA ───────────────────────────────────────────────────────────
export const TRUCK_UTILIZATION_DATA = [
  { name: 'MH-12-AB', space: 74, weight: 68 },
  { name: 'DL-01-CG', space: 91, weight: 88 },
  { name: 'GJ-05-DE', space: 55, weight: 51 },
  { name: 'KA-09-FG', space: 0, weight: 0 },
  { name: 'TN-22-HJ', space: 82, weight: 79 },
  { name: 'RJ-14-KL', space: 0, weight: 0 },
  { name: 'UP-80-MN', space: 63, weight: 59 },
  { name: 'WB-06-PQ', space: 0, weight: 0 },
];

export const SHIPMENT_STATUS_DATA = [
  { name: 'In Transit', value: 3, color: '#A78BFA' },
  { name: 'Loading', value: 1, color: '#0EA5E9' },
  { name: 'Delivered', value: 2, color: '#22C55E' },
  { name: 'Delayed', value: 1, color: '#EF4444' },
  { name: 'Pending', value: 0, color: '#64748B' },
];

export const DAMAGE_RISK_DATA = [
  { level: 'LOW (0–30)', count: 11, color: '#22C55E' },
  { level: 'MEDIUM (31–60)', count: 7, color: '#F59E0B' },
  { level: 'HIGH (61–100)', count: 7, color: '#EF4444' },
];

export const CARBON_EMISSION_DATA = [
  { date: 'Aug 07', emissions: 142, fuel: 58 },
  { date: 'Aug 08', emissions: 198, fuel: 81 },
  { date: 'Aug 09', emissions: 87, fuel: 36 },
  { date: 'Aug 10', emissions: 231, fuel: 94 },
  { date: 'Aug 11', emissions: 176, fuel: 72 },
  { date: 'Aug 12', emissions: 314, fuel: 128 },
  { date: 'Aug 13', emissions: 89, fuel: 36 },
];