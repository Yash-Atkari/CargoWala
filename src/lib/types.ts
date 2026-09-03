export type UserRole = 'ADMIN' | 'LOADER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  assignedTruckId?: string;
}

// Backwards compatibility alias
export type MockUser = User;

export type PackageStatus =
  | 'PENDING'
  | 'STAGED'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DAMAGED'
  | 'CANCELLED';

export type ShipmentStatus =
  | 'PLANNED'
  | 'PENDING'
  | 'STAGED'
  | 'LOADING'
  | 'READY'
  | 'LOADED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'DELAYED'
  | 'CANCELLED';

export type TruckStatus = 'AVAILABLE' | 'LOADING' | 'IN_TRANSIT' | 'MAINTENANCE';

export interface Truck {
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
  status: TruckStatus;
  currentShipmentId?: string;
  model: string;
}

// Backwards compatibility alias
export type MockTruck = Truck;

export interface Package {
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
  status: PackageStatus;
  shipmentId?: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  loadingOrder?: number;
  isLoaded?: boolean;
  stackingNote?: string;
  positionX?: number | null;
  positionY?: number | null;
  positionZ?: number | null;
  rotationY?: number | null;
}

// Backwards compatibility alias
export type MockPackage = Package;

export interface Shipment {
  id: string;
  truckId: string;
  truckRegistration: string;
  loaderId: string;
  loaderName: string;
  status: ShipmentStatus;
  departureTime?: string;
  arrivalTime?: string;
  origin: string;
  destination: string;
  totalWeight: number;
  totalVolume: number;
  packageCount: number;
  totalPackages?: number;
  createdAt?: string;
  loadingPlan?: any;
}

// Backwards compatibility alias
export type MockShipment = Shipment;

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  packageId?: string;
  eventType:
    | 'CREATED'
    | 'RECEIVED'
    | 'LOADING'
    | 'LOADED'
    | 'IN_TRANSIT'
    | 'UNLOADED'
    | 'DELIVERED'
    | 'DAMAGED'
    | 'DELAYED';
  description: string;
  timestamp: string;
  location: string;
  createdBy: string;
}

// Backwards compatibility alias
export type MockTrackingEvent = TrackingEvent;

export interface Notification {
  id: string;
  userId: string;
  type: 'OVERWEIGHT' | 'CAPACITY' | 'DELAYED' | 'HIGH_RISK' | 'SESSION_COMPLETE' | 'INFO';
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

// Backwards compatibility alias
export type MockNotification = Notification;

export interface LoadingPackage extends Package {
  loadingOrder: number;
  isLoaded: boolean;
  stackingNote?: string;
}

// Backwards compatibility alias
export type MockLoadingPackage = LoadingPackage;
