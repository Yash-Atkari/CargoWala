// ─── 3D CARGO LOADING, ROUTE, STABILITY, DAMAGE & DYNAMIC RE-OPTIMIZATION ENGINE ─
// Multi-constraint spatial bin-packing, Static Rollover Threshold, void compaction, and dynamic mutations

import { Package, Truck, MockPackage, MockTruck } from './types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type OptimizationStrategy = 'BALANCED' | 'SPACE_MAX' | 'FRAGILITY_FIRST' | 'LIFO_PRIORITY';

export type ColorMode = 'FRAGILITY' | 'STOP' | 'RISK_HEATMAP';

export type ReoptimizationEventType =
  | 'PACKAGE_ADDED'
  | 'PACKAGE_REMOVED'
  | 'PACKAGE_CANCELLED'
  | 'TRUCK_CAPACITY_CHANGED'
  | 'ITEMS_LOCKED'
  | 'AUTO_COMPACT';

export interface PackagePosition {
  x: number; // cm from front-cab (0) to rear doors (truck.length)
  y: number; // cm from floor (0) to roof (truck.height)
  z: number; // cm from left wall (0) to right wall (truck.width)
  rotationY: number; // 0 or 90 degrees
}

export interface PackageDamageAnalysis {
  packageId: string;
  packageName: string;
  digitalId: string;
  fragilityLevel: string;
  weight: number;
  riskScore: number; // 0–100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  weightAboveKg: number;
  compressionPressure: number; // kg/cm²
  crushRisk: number; // 0–100
  vibrationRisk: number; // 0–100
  lateralShiftRisk: number; // 0–100
  surroundingIncompatibilityRisk: number; // 0–100
  contributingFactors: string[];
  mitigationAdvice: string;
}

export interface PlacedPackage {
  package: Package;
  position: PackagePosition;
  isSelected: boolean;
  isHighlighted: boolean;
  isLocked?: boolean; // Pinned in place (e.g. already physically loaded)
  damageRisk: number;
  damageReasons: string[];
  damageAnalysis?: PackageDamageAnalysis;
  loadingOrder?: number;
  rationale?: string;
  supportRatio?: number; // 0.0 to 1.0 (1.0 = full base support)
  unloadingOrder?: number; // 1 = first unloaded at Stop 1
  isBlockedForUnloading?: boolean;
}

export interface ReoptimizationDiff {
  eventType: ReoptimizationEventType;
  eventDescription: string;
  timestamp: string;
  previousPackageCount: number;
  newPackageCount: number;
  movedPackagesCount: number;
  spaceUtilizationDelta: number; // e.g. +4%
  weightUtilizationDelta: number; // e.g. +8%
  cogShiftDistanceCm: number; // e.g. 3.2cm
  overflowPackages: Package[];
  recalculatedSteps: number;
  summaryMessage: string;
}

export interface CenterOfGravity {
  x: number; // cm
  y: number; // cm
  z: number; // cm
  normX: number; // % of truck length
  normY: number; // % of truck height
  normZ: number; // % of truck width
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING';
}

export interface AxleLoad {
  frontAxleKg: number;
  rearAxleKg: number;
  frontAxlePct: number;
  rearAxlePct: number;
  isWithinLimits: boolean;
}

export interface WeightDistribution {
  front: number; // % of total weight in front third
  center: number; // % in center third
  rear: number; // % in rear third
  left: number; // % on left half
  right: number; // % on right half
  isBalanced: boolean;
  warnings: string[];
  cog?: CenterOfGravity;
  axleLoad?: AxleLoad;
}

export interface VehicleStabilityAnalysis {
  staticRolloverThreshold: number; // In g-forces (e.g. 0.44g)
  rolloverRiskLevel: 'OPTIMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  steerAxleKg: number;
  steerAxlePct: number;
  steerAxleSafe: boolean; // steer >= 25%
  driveAxleKg: number;
  driveAxlePct: number;
  driveAxleSafe: boolean; // drive <= 70%
  lateralTiltAngle: number; // In degrees
  verticalCoGPct: number; // % of truck height (ideal < 40%)
  longitudinalCoGPct: number; // % of truck length (ideal 40% - 60%)
  lateralCoGPct: number; // % of truck width (ideal 45% - 55%)
  safeZoneBoundary: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  stabilityScore: number; // 0–100
  isStable: boolean;
  criticalWarnings: string[];
  recommendations: string[];
  topTiersHeavyCount: number;
}

export interface ManifestDamageRiskReport {
  averageRiskScore: number; // 0–100
  maxRiskScore: number;
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  totalPackages: number;
  lowRiskCount: number;
  moderateRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  averageCrushRisk: number;
  averageVibrationRisk: number;
  averageLateralShiftRisk: number;
  averageIncompatibilityRisk: number;
  highRiskPackages: PackageDamageAnalysis[];
  allPackagesAnalysis: PackageDamageAnalysis[];
  recommendations: string[];
}

export interface SpaceMetrics {
  totalVolume: number; // cm³
  usedVolume: number; // cm³
  spaceUtilization: number; // 0–100%
  totalWeight: number; // kg
  maxWeight: number; // kg
  weightUtilization: number; // 0–100%
  remainingVolume: number; // cm³
  remainingWeight: number; // kg
  packageCount: number;
}

export interface AIRecommendation {
  packageId: string;
  packageName: string;
  suggestedPosition: PackagePosition;
  suggestedOrientation: string;
  reason: string;
  utilizationImprovement: number;
  weightBalanceImpact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  damageRiskImpact: 'REDUCES' | 'NEUTRAL' | 'INCREASES';
  priority: number; // 1 = highest
}

export interface LoadingStep {
  stepNumber: number;
  packageId: string;
  packageName: string;
  digitalId: string;
  weight: number;
  dimensions: string;
  position: PackagePosition;
  orientation: string;
  rationale: string;
  cumulativeWeight: number;
  cumulativeVolumePct: number;
  damageRisk: number;
  deliverySequence: number;
  destination: string;
}

export interface BlockedPackageDiagnostic {
  blockedPackageId: string;
  blockedPackageName: string;
  blockedStopSequence: number;
  blockingPackageId: string;
  blockingPackageName: string;
  blockingStopSequence: number;
  reason: string;
}

export interface UnloadingStopPlan {
  stopNumber: number;
  destination: string;
  packageCount: number;
  totalWeight: number;
  packageIds: string[];
  packageNames: string[];
  isDirectlyAccessible: boolean;
  blockedCount: number;
  blockingPackages: string[];
  extractionOrder: number;
}

export interface RouteAccessibilityReport {
  accessibilityScore: number;
  totalStops: number;
  totalPackages: number;
  totalBlockedParcels: number;
  totalShiftingMoves: number;
  stops: UnloadingStopPlan[];
  diagnostics: BlockedPackageDiagnostic[];
  warnings: string[];
}

export interface ConstraintStatus {
  volumeFit: boolean;
  weightLimit: boolean;
  fragilityStacking: boolean;
  lifoSequence: boolean;
  physicalSupport: boolean;
  stabilityCompliance: boolean;
  damageSafetyCompliance: boolean;
  warnings: string[];
}

export interface LoadingReport {
  totalPackages: number;
  loadedPackages: number;
  spaceUtilization: number;
  weightUtilization: number;
  balanceScore: number; // 0–100
  damageRiskScore: number; // 0–100 (lower = better)
  loadingEfficiency: number; // 0–100
  strategy: OptimizationStrategy;
  recommendations: string[];
  weightDistribution: WeightDistribution;
  stabilityAnalysis: VehicleStabilityAnalysis;
  damageRiskReport: ManifestDamageRiskReport;
  steps: LoadingStep[];
  constraints: ConstraintStatus;
  unloadingReport?: RouteAccessibilityReport;
}

// ─── STOP COLOR PALETTE ───────────────────────────────────────────────────────

export const STOP_COLORS: Record<number, string> = {
  1: '#3B82F6', // Stop 1: Vivid Blue
  2: '#10B981', // Stop 2: Emerald Green
  3: '#8B5CF6', // Stop 3: Violet
  4: '#F59E0B', // Stop 4: Amber Orange
  5: '#EC4899', // Stop 5: Rose Pink
  6: '#06B6D4', // Stop 6: Cyan
};

export function getStopColor(sequence: number): string {
  return STOP_COLORS[sequence] || '#64748B';
}

// ─── DIMENSION & GEOMETRY HELPERS ─────────────────────────────────────────────

export function getEffectiveDimensions(
  pkg: Package | MockPackage,
  rotationY: number
): { l: number; w: number; h: number } {
  if (rotationY === 90) {
    return { l: pkg.width, w: pkg.length, h: pkg.height };
  }
  return { l: pkg.length, w: pkg.width, h: pkg.height };
}

export function boxesOverlap(
  ax: number,
  ay: number,
  az: number,
  al: number,
  ah: number,
  aw: number,
  bx: number,
  by: number,
  bz: number,
  bl: number,
  bh: number,
  bw: number,
  tolerance = 0.5
): boolean {
  return (
    ax < bx + bl - tolerance &&
    ax + al > bx + tolerance &&
    ay < by + bh - tolerance &&
    ay + ah > by + tolerance &&
    az < bz + bw - tolerance &&
    az + aw > bz + tolerance
  );
}

export function isInsideTruck(
  pos: PackagePosition,
  dims: { l: number; w: number; h: number },
  truck: Truck | MockTruck
): boolean {
  return (
    pos.x >= 0 &&
    pos.x + dims.l <= truck.length + 0.1 &&
    pos.y >= 0 &&
    pos.y + dims.h <= truck.height + 0.1 &&
    pos.z >= 0 &&
    pos.z + dims.w <= truck.width + 0.1
  );
}

// ─── PHYSICAL SUPPORT SURFACE VALIDATION ──────────────────────────────────────

export function checkSupportSurface(
  pos: PackagePosition,
  dims: { l: number; w: number; h: number },
  placed: PlacedPackage[]
): { supported: boolean; supportRatio: number } {
  if (pos.y <= 0.5) {
    return { supported: true, supportRatio: 1.0 };
  }

  const baseArea = dims.l * dims.w;
  let supportedArea = 0;

  for (const p of placed) {
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    const topOfUnderPackage = p.position.y + pd.h;

    if (Math.abs(topOfUnderPackage - pos.y) <= 1.0) {
      const overlapX = Math.max(
        0,
        Math.min(pos.x + dims.l, p.position.x + pd.l) - Math.max(pos.x, p.position.x)
      );
      const overlapZ = Math.max(
        0,
        Math.min(pos.z + dims.w, p.position.z + pd.w) - Math.max(pos.z, p.position.z)
      );
      supportedArea += overlapX * overlapZ;
    }
  }

  const supportRatio = Math.min(1.0, supportedArea / baseArea);
  return {
    supported: supportRatio >= 0.6,
    supportRatio: Math.round(supportRatio * 100) / 100,
  };
}

// ─── COLLISION DETECTION ──────────────────────────────────────────────────────

export function checkCollision(
  newPos: PackagePosition,
  newPkg: Package | MockPackage,
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const dims = getEffectiveDimensions(newPkg, newPos.rotationY);

  if (!isInsideTruck(newPos, dims, truck)) {
    if (newPos.x < 0 || newPos.x + dims.l > truck.length)
      reasons.push('Package extends beyond truck length');
    if (newPos.y < 0 || newPos.y + dims.h > truck.height)
      reasons.push('Package exceeds truck roof height');
    if (newPos.z < 0 || newPos.z + dims.w > truck.width)
      reasons.push('Package extends beyond truck width');
  }

  const support = checkSupportSurface(newPos, dims, placed);
  if (!support.supported) {
    reasons.push(
      `Inadequate base support (${Math.round(support.supportRatio * 100)}% / min 60%) — cannot hover in mid-air`
    );
  }

  for (const p of placed) {
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    if (
      Math.abs(p.position.y + pd.h - newPos.y) <= 1.0 &&
      newPos.x < p.position.x + pd.l &&
      newPos.x + dims.l > p.position.x &&
      newPos.z < p.position.z + pd.w &&
      newPos.z + dims.w > p.position.z
    ) {
      if (p.package.fragilityLevel === 'FRAGILE' && newPkg.weight > 25) {
        reasons.push(
          `Cannot stack heavy package (${newPkg.weight}kg) on fragile box "${p.package.name}"`
        );
      }
    }
  }

  for (const p of placed) {
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    if (
      boxesOverlap(
        newPos.x,
        newPos.y,
        newPos.z,
        dims.l,
        dims.h,
        dims.w,
        p.position.x,
        p.position.y,
        p.position.z,
        pd.l,
        pd.h,
        pd.w
      )
    ) {
      reasons.push(`Overlaps with package "${p.package.name}"`);
    }
  }

  return { valid: reasons.length === 0, reasons };
}

// ─── WEIGHT LIMIT CHECK ───────────────────────────────────────────────────────

export function checkWeightLimit(
  newPkg: Package | MockPackage,
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): { valid: boolean; reason?: string } {
  const currentWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  if (currentWeight + newPkg.weight > truck.maxWeight) {
    return {
      valid: false,
      reason: `Adding ${newPkg.weight}kg exceeds max payload of ${truck.maxWeight}kg (current: ${currentWeight}kg)`,
    };
  }
  return { valid: true };
}

// ─── MULTI-FACTOR DAMAGE RISK PREDICTION ENGINE ────────────────────────────────

export function calculateDetailedDamageRisk(
  pkg: Package | MockPackage,
  pos: PackagePosition,
  allPlaced: PlacedPackage[],
  truck: Truck | MockTruck
): PackageDamageAnalysis {
  const dims = getEffectiveDimensions(pkg, pos.rotationY);
  const baseAreaCm2 = dims.l * dims.w;
  const contributingFactors: string[] = [];

  let weightAboveKg = 0;
  for (const p of allPlaced) {
    if (p.package.id === pkg.id) continue;
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    const overlapX = Math.max(
      0,
      Math.min(pos.x + dims.l, p.position.x + pd.l) - Math.max(pos.x, p.position.x)
    );
    const overlapZ = Math.max(
      0,
      Math.min(pos.z + dims.w, p.position.z + pd.w) - Math.max(pos.z, p.position.z)
    );

    if (overlapX > 0 && overlapZ > 0 && p.position.y >= pos.y + dims.h - 1) {
      const areaRatio = (overlapX * overlapZ) / (pd.l * pd.w);
      weightAboveKg += Math.round(p.package.weight * areaRatio);
    }
  }

  const compressionPressure = Math.round((weightAboveKg / baseAreaCm2) * 1000) / 1000;

  let crushRisk = 0;
  const isFragile = pkg.fragilityLevel === 'FRAGILE';
  const isHighFragility = pkg.fragilityLevel === 'HIGH';
  const isMediumFragility = pkg.fragilityLevel === 'MEDIUM';

  if (isFragile) {
    if (weightAboveKg > 40) {
      crushRisk = 95;
      contributingFactors.push(`Critical crushing force: ${weightAboveKg}kg directly stacked on Fragile cargo`);
    } else if (weightAboveKg > 15) {
      crushRisk = 65;
      contributingFactors.push(`High stacking load: ${weightAboveKg}kg over fragile parcel`);
    } else if (weightAboveKg > 0) {
      crushRisk = 30;
      contributingFactors.push(`Minor top load: ${weightAboveKg}kg on fragile item`);
    } else {
      crushRisk = 5;
    }
  } else if (isHighFragility) {
    if (weightAboveKg > 100) {
      crushRisk = 80;
      contributingFactors.push(`Severe compressive stress: ${weightAboveKg}kg on high-fragility cargo`);
    } else if (weightAboveKg > 40) {
      crushRisk = 45;
      contributingFactors.push(`Moderate load above: ${weightAboveKg}kg`);
    } else {
      crushRisk = 10;
    }
  } else if (isMediumFragility) {
    if (weightAboveKg > 200) {
      crushRisk = 65;
      contributingFactors.push(`Heavy tier load: ${weightAboveKg}kg stacked above`);
    } else if (weightAboveKg > 80) {
      crushRisk = 30;
    } else {
      crushRisk = 10;
    }
  } else {
    if (weightAboveKg > 350) {
      crushRisk = 50;
      contributingFactors.push(`Excessive gross weight: ${weightAboveKg}kg top tier`);
    } else {
      crushRisk = 5;
    }
  }

  let vibrationRisk = 10;
  const heightRatio = (pos.y + dims.h / 2) / truck.height;
  const lengthRatio = (pos.x + dims.l / 2) / truck.length;

  if (heightRatio > 0.75) {
    vibrationRisk += 35;
    contributingFactors.push('Elevated tier position (top 25% height) — amplified vehicle bounce');
  } else if (heightRatio > 0.45) {
    vibrationRisk += 15;
  }

  if (lengthRatio > 0.8) {
    vibrationRisk += 25;
    contributingFactors.push('Rear axle overhang location — subjected to dynamic bump acceleration');
  } else if (lengthRatio < 0.2) {
    vibrationRisk += 10;
  }

  if (isFragile && heightRatio > 0.6) {
    vibrationRisk += 20;
  }
  vibrationRisk = Math.min(100, vibrationRisk);

  let lateralShiftRisk = 5;
  const leftClearance = pos.z;
  const rightClearance = truck.width - (pos.z + dims.w);
  const aspectRatio = dims.h / Math.min(dims.l, dims.w);

  let hasLeftBrace = leftClearance < 5;
  let hasRightBrace = rightClearance < 5;

  for (const p of allPlaced) {
    if (p.package.id === pkg.id) continue;
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    const overlapX = Math.max(0, Math.min(pos.x + dims.l, p.position.x + pd.l) - Math.max(pos.x, p.position.x));
    const overlapY = Math.max(0, Math.min(pos.y + dims.h, p.position.y + pd.h) - Math.max(pos.y, p.position.y));

    if (overlapX > 0 && overlapY > 0) {
      if (Math.abs(p.position.z + pd.w - pos.z) <= 5) hasLeftBrace = true;
      if (Math.abs(p.position.z - (pos.z + dims.w)) <= 5) hasRightBrace = true;
    }
  }

  if (!hasLeftBrace && !hasRightBrace && pos.y > 0) {
    lateralShiftRisk += 40;
    contributingFactors.push('Unbraced lateral side faces — risk of shifting on turns');
  } else if (!hasLeftBrace || !hasRightBrace) {
    lateralShiftRisk += 15;
  }

  if (aspectRatio > 1.6 && pos.y > 0) {
    lateralShiftRisk += 25;
    contributingFactors.push(`High aspect ratio (${Math.round(aspectRatio * 10) / 10}) — elevated toppling risk`);
  }
  lateralShiftRisk = Math.min(100, lateralShiftRisk);

  let surroundingIncompatibilityRisk = 5;
  for (const p of allPlaced) {
    if (p.package.id === pkg.id) continue;
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    const isAdjacent =
      boxesOverlap(
        pos.x - 5, pos.y - 5, pos.z - 5, dims.l + 10, dims.h + 10, dims.w + 10,
        p.position.x, p.position.y, p.position.z, pd.l, pd.h, pd.w
      );

    if (isAdjacent) {
      if (isFragile && p.package.weight > 60) {
        surroundingIncompatibilityRisk += 45;
        contributingFactors.push(`Direct contact with dense heavy cargo (${p.package.weight}kg "${p.package.name}")`);
      } else if (isHighFragility && p.package.weight > 90) {
        surroundingIncompatibilityRisk += 25;
      }
    }
  }
  surroundingIncompatibilityRisk = Math.min(100, surroundingIncompatibilityRisk);

  const rawScore =
    crushRisk * 0.45 +
    vibrationRisk * 0.25 +
    lateralShiftRisk * 0.18 +
    surroundingIncompatibilityRisk * 0.12;

  const riskScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (riskScore >= 75) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 25) riskLevel = 'MODERATE';
  else riskLevel = 'LOW';

  let mitigationAdvice = 'Placement is secure with balanced support and minimal vibration exposure.';
  if (riskLevel === 'CRITICAL') {
    mitigationAdvice = 'Relocate immediately to floor layer (Y=0), anchor against sidewall, and remove heavy top loads.';
  } else if (riskLevel === 'HIGH') {
    mitigationAdvice = 'Shift to lower tier and brace laterally against standard rigid boxes.';
  } else if (riskLevel === 'MODERATE') {
    mitigationAdvice = 'Verify edge padding and ensure cargo straps prevent dynamic movement.';
  }

  if (contributingFactors.length === 0) {
    contributingFactors.push('Optimal safe placement — zero crushing load and balanced lateral bracing.');
  }

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    digitalId: pkg.digitalId || pkg.id,
    fragilityLevel: pkg.fragilityLevel,
    weight: pkg.weight,
    riskScore,
    riskLevel,
    weightAboveKg,
    compressionPressure,
    crushRisk,
    vibrationRisk,
    lateralShiftRisk,
    surroundingIncompatibilityRisk,
    contributingFactors,
    mitigationAdvice,
  };
}

export function calculateDamageRisk(
  pkg: Package | MockPackage,
  pos: PackagePosition,
  allPlaced: PlacedPackage[],
  truck: Truck | MockTruck
): { score: number; reasons: string[] } {
  const analysis = calculateDetailedDamageRisk(pkg, pos, allPlaced, truck);
  return { score: analysis.riskScore, reasons: analysis.contributingFactors };
}

export function analyzeManifestDamageRisk(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): ManifestDamageRiskReport {
  if (placed.length === 0) {
    return {
      averageRiskScore: 0,
      maxRiskScore: 0,
      overallRiskLevel: 'LOW',
      totalPackages: 0,
      lowRiskCount: 0,
      moderateRiskCount: 0,
      highRiskCount: 0,
      criticalRiskCount: 0,
      averageCrushRisk: 0,
      averageVibrationRisk: 0,
      averageLateralShiftRisk: 0,
      averageIncompatibilityRisk: 0,
      highRiskPackages: [],
      allPackagesAnalysis: [],
      recommendations: ['Vehicle is currently empty.'],
    };
  }

  const allAnalyses: PackageDamageAnalysis[] = placed.map((p) => {
    const a = calculateDetailedDamageRisk(p.package, p.position, placed, truck);
    p.damageAnalysis = a;
    p.damageRisk = a.riskScore;
    p.damageReasons = a.contributingFactors;
    return a;
  });

  const total = allAnalyses.length;
  const avgScore = Math.round(allAnalyses.reduce((s, a) => s + a.riskScore, 0) / total);
  const maxScore = Math.max(...allAnalyses.map((a) => a.riskScore));

  const lowCount = allAnalyses.filter((a) => a.riskLevel === 'LOW').length;
  const modCount = allAnalyses.filter((a) => a.riskLevel === 'MODERATE').length;
  const highCount = allAnalyses.filter((a) => a.riskLevel === 'HIGH').length;
  const critCount = allAnalyses.filter((a) => a.riskLevel === 'CRITICAL').length;

  const avgCrush = Math.round(allAnalyses.reduce((s, a) => s + a.crushRisk, 0) / total);
  const avgVib = Math.round(allAnalyses.reduce((s, a) => s + a.vibrationRisk, 0) / total);
  const avgShift = Math.round(allAnalyses.reduce((s, a) => s + a.lateralShiftRisk, 0) / total);
  const avgIncompat = Math.round(allAnalyses.reduce((s, a) => s + a.surroundingIncompatibilityRisk, 0) / total);

  const highRiskPackages = allAnalyses.filter((a) => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL');

  let overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (critCount > 0 || avgScore >= 60) overallRiskLevel = 'CRITICAL';
  else if (highCount > 0 || avgScore >= 40) overallRiskLevel = 'HIGH';
  else if (modCount > 0 || avgScore >= 20) overallRiskLevel = 'MODERATE';
  else overallRiskLevel = 'LOW';

  const recommendations: string[] = [];
  if (critCount > 0) {
    recommendations.push(`${critCount} package(s) are at CRITICAL risk of crushing — apply Fragility-First Policy.`);
  }
  if (highCount > 0) {
    recommendations.push(`${highCount} package(s) experience high stacking pressure or excessive vibration.`);
  }
  if (avgCrush > 30) {
    recommendations.push('Reorder loading hierarchy: anchor heavy boxes to floor level (Y=0).');
  }
  if (recommendations.length === 0) {
    recommendations.push('Zero high-risk configurations detected — all fragile cargo is cushioned and braced.');
  }

  return {
    averageRiskScore: avgScore,
    maxRiskScore: maxScore,
    overallRiskLevel,
    totalPackages: total,
    lowRiskCount: lowCount,
    moderateRiskCount: modCount,
    highRiskCount: highCount,
    criticalRiskCount: critCount,
    averageCrushRisk: avgCrush,
    averageVibrationRisk: avgVib,
    averageLateralShiftRisk: avgShift,
    averageIncompatibilityRisk: avgIncompat,
    highRiskPackages,
    allPackagesAnalysis: allAnalyses,
    recommendations,
  };
}

// ─── CENTER OF GRAVITY & AXLE WEIGHT DISTRIBUTION ─────────────────────────────

export function calculateCenterOfGravity(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): CenterOfGravity {
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  if (totalWeight === 0) {
    return {
      x: truck.length / 2,
      y: 0,
      z: truck.width / 2,
      normX: 50,
      normY: 0,
      normZ: 50,
      status: 'OPTIMAL',
    };
  }

  let weightedX = 0;
  let weightedY = 0;
  let weightedZ = 0;

  for (const p of placed) {
    const dims = getEffectiveDimensions(p.package, p.position.rotationY);
    const cx = p.position.x + dims.l / 2;
    const cy = p.position.y + dims.h / 2;
    const cz = p.position.z + dims.w / 2;
    const w = p.package.weight;

    weightedX += cx * w;
    weightedY += cy * w;
    weightedZ += cz * w;
  }

  const cogX = weightedX / totalWeight;
  const cogY = weightedY / totalWeight;
  const cogZ = weightedZ / totalWeight;

  const normX = Math.round((cogX / truck.length) * 100);
  const normY = Math.round((cogY / truck.height) * 100);
  const normZ = Math.round((cogZ / truck.width) * 100);

  const isXBad = normX < 35 || normX > 65;
  const isZBad = normZ < 38 || normZ > 62;
  const isYBad = normY > 50;

  let status: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING' = 'OPTIMAL';
  if (isXBad || isZBad || isYBad) {
    status = normX < 25 || normX > 75 || normZ < 30 || normZ > 70 || normY > 60 ? 'WARNING' : 'ACCEPTABLE';
  }

  return {
    x: Math.round(cogX),
    y: Math.round(cogY),
    z: Math.round(cogZ),
    normX,
    normY,
    normZ,
    status,
  };
}

export function calculateAxleLoad(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): AxleLoad {
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  if (totalWeight === 0) {
    return {
      frontAxleKg: 0,
      rearAxleKg: 0,
      frontAxlePct: 50,
      rearAxlePct: 50,
      isWithinLimits: true,
    };
  }

  const axleBase = truck.length * 0.7;
  const cog = calculateCenterOfGravity(placed, truck);

  const distFromRear = Math.max(0, truck.length * 0.85 - cog.x);
  const frontRatio = Math.min(1.0, Math.max(0.0, distFromRear / axleBase));
  const rearRatio = 1.0 - frontRatio;

  const frontAxleKg = Math.round(totalWeight * frontRatio);
  const rearAxleKg = Math.round(totalWeight * rearRatio);
  const frontAxlePct = Math.round(frontRatio * 100);
  const rearAxlePct = Math.round(rearRatio * 100);

  const isWithinLimits = frontAxlePct >= 25 && frontAxlePct <= 65;

  return {
    frontAxleKg,
    rearAxleKg,
    frontAxlePct,
    rearAxlePct,
    isWithinLimits,
  };
}

// ─── COMPREHENSIVE VEHICLE STABILITY & ROLLOVER ANALYSIS ──────────────────────

export function analyzeVehicleStability(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): VehicleStabilityAnalysis {
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  const cog = calculateCenterOfGravity(placed, truck);
  const axleLoad = calculateAxleLoad(placed, truck);

  const criticalWarnings: string[] = [];
  const recommendations: string[] = [];

  const chassisBaselineHeight = 100;
  const effectiveCoGHeight = chassisBaselineHeight + cog.y;
  const halfTrackWidth = truck.width / 2;

  const rawSRT = halfTrackWidth / Math.max(1, effectiveCoGHeight);
  const srt = Math.round(rawSRT * 100) / 100;

  let rolloverRiskLevel: 'OPTIMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'OPTIMAL';
  if (srt >= 0.42) rolloverRiskLevel = 'OPTIMAL';
  else if (srt >= 0.35) rolloverRiskLevel = 'MODERATE';
  else if (srt >= 0.28) rolloverRiskLevel = 'HIGH';
  else rolloverRiskLevel = 'CRITICAL';

  let leftW = 0;
  let rightW = 0;
  for (const p of placed) {
    const dims = getEffectiveDimensions(p.package, p.position.rotationY);
    const cz = p.position.z + dims.w / 2;
    if (cz < truck.width / 2) leftW += p.package.weight;
    else rightW += p.package.weight;
  }
  const lateralDisparity = totalWeight > 0 ? Math.abs(leftW - rightW) / totalWeight : 0;
  const lateralTiltAngle = Math.round(lateralDisparity * 7.5 * 10) / 10;

  const topTierHeavy = placed.filter((p) => {
    return p.position.y > truck.height * 0.45 && p.package.weight > 40;
  });

  const steerAxleSafe = axleLoad.frontAxlePct >= 25;
  const driveAxleSafe = axleLoad.rearAxlePct <= 75;

  if (!steerAxleSafe) {
    criticalWarnings.push(
      `Front steer axle has only ${axleLoad.frontAxlePct}% load (min 25% required) — risk of steering loss.`
    );
    recommendations.push('Move heavy cargo forward toward the front cab to restore steer axle weight.');
  }

  if (!driveAxleSafe) {
    criticalWarnings.push(
      `Rear drive axle carries ${axleLoad.rearAxlePct}% load (max 75% permitted) — risk of vehicle fishtailing.`
    );
    recommendations.push('Redistribute rear cargo toward center floor.');
  }

  if (lateralDisparity > 0.25) {
    criticalWarnings.push(
      `Lateral weight disparity (${Math.round((leftW / (totalWeight || 1)) * 100)}% L / ${Math.round((rightW / (totalWeight || 1)) * 100)}% R) — rollover hazard on highway turns.`
    );
    recommendations.push('Balance cargo symmetrically along the center axis.');
  }

  if (topTierHeavy.length > 0) {
    criticalWarnings.push(
      `${topTierHeavy.length} heavy box(es) placed on elevated tiers above 50% vehicle height.`
    );
    recommendations.push('Restructure load: anchor heavy boxes to floor level (Y=0).');
  }

  const safeZoneBoundary = {
    minX: Math.round(truck.length * 0.35),
    maxX: Math.round(truck.length * 0.65),
    minY: 0,
    maxY: Math.round(truck.height * 0.4),
    minZ: Math.round(truck.width * 0.4),
    maxZ: Math.round(truck.width * 0.6),
  };

  let stabilityScore = 100;
  if (rolloverRiskLevel === 'MODERATE') stabilityScore -= 15;
  if (rolloverRiskLevel === 'HIGH') stabilityScore -= 35;
  if (rolloverRiskLevel === 'CRITICAL') stabilityScore -= 60;
  if (!steerAxleSafe) stabilityScore -= 20;
  if (!driveAxleSafe) stabilityScore -= 15;
  if (lateralDisparity > 0.2) stabilityScore -= Math.round(lateralDisparity * 40);
  stabilityScore = Math.max(0, Math.min(100, stabilityScore));

  const isStable = stabilityScore >= 70 && steerAxleSafe && driveAxleSafe && lateralDisparity <= 0.25;

  return {
    staticRolloverThreshold: srt,
    rolloverRiskLevel,
    steerAxleKg: axleLoad.frontAxleKg,
    steerAxlePct: axleLoad.frontAxlePct,
    steerAxleSafe,
    driveAxleKg: axleLoad.rearAxleKg,
    driveAxlePct: axleLoad.rearAxlePct,
    driveAxleSafe,
    lateralTiltAngle,
    verticalCoGPct: cog.normY,
    longitudinalCoGPct: cog.normX,
    lateralCoGPct: cog.normZ,
    safeZoneBoundary,
    stabilityScore,
    isStable,
    criticalWarnings,
    recommendations,
    topTiersHeavyCount: topTierHeavy.length,
  };
}

export function calculateWeightDistribution(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): WeightDistribution {
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  if (totalWeight === 0) {
    return {
      front: 0,
      center: 0,
      rear: 0,
      left: 0,
      right: 0,
      isBalanced: true,
      warnings: [],
      cog: calculateCenterOfGravity(placed, truck),
      axleLoad: calculateAxleLoad(placed, truck),
    };
  }

  const frontThird = truck.length / 3;
  const rearThird = (truck.length * 2) / 3;
  const leftHalf = truck.width / 2;

  let frontW = 0,
    centerW = 0,
    rearW = 0,
    leftW = 0,
    rightW = 0;

  for (const p of placed) {
    const dims = getEffectiveDimensions(p.package, p.position.rotationY);
    const cx = p.position.x + dims.l / 2;
    const cz = p.position.z + dims.w / 2;
    const w = p.package.weight;

    if (cx < frontThird) frontW += w;
    else if (cx < rearThird) centerW += w;
    else rearW += w;

    if (cz < leftHalf) leftW += w;
    else rightW += w;
  }

  const front = Math.round((frontW / totalWeight) * 100);
  const center = Math.round((centerW / totalWeight) * 100);
  const rear = Math.round((rearW / totalWeight) * 100);
  const left = Math.round((leftW / totalWeight) * 100);
  const right = Math.round((rightW / totalWeight) * 100);

  const warnings: string[] = [];
  const lrDiff = Math.abs(left - right);
  const frDiff = Math.abs(front - rear);

  if (lrDiff > 25)
    warnings.push(`Lateral imbalance (${left}% Left / ${right}% Right) — risk of rollover on turns`);
  if (frDiff > 35)
    warnings.push(`Axial imbalance (${front}% Front / ${rear}% Rear) — vehicle handling affected`);

  const cog = calculateCenterOfGravity(placed, truck);
  const axleLoad = calculateAxleLoad(placed, truck);

  if (cog.status === 'WARNING') {
    warnings.push('Center of Gravity is off-center — balance heavy cargo along center floor');
  }

  const isBalanced = lrDiff <= 25 && frDiff <= 35 && axleLoad.isWithinLimits;

  return { front, center, rear, left, right, isBalanced, warnings, cog, axleLoad };
}

// ─── SPACE METRICS ────────────────────────────────────────────────────────────

export function calculateSpaceMetrics(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): SpaceMetrics {
  const totalVolume = truck.length * truck.width * truck.height;
  const usedVolume = placed.reduce((s, p) => {
    const d = getEffectiveDimensions(p.package, p.position.rotationY);
    return s + d.l * d.w * d.h;
  }, 0);
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);

  return {
    totalVolume,
    usedVolume,
    spaceUtilization: Math.min(100, Math.round((usedVolume / totalVolume) * 100)),
    totalWeight,
    maxWeight: truck.maxWeight,
    weightUtilization: Math.min(100, Math.round((totalWeight / truck.maxWeight) * 100)),
    remainingVolume: Math.max(0, totalVolume - usedVolume),
    remainingWeight: Math.max(0, truck.maxWeight - totalWeight),
    packageCount: placed.length,
  };
}

// ─── EXTREME-POINT 3D BIN PACKING ────────────────────────────────────────────

function generateCandidatePoints(
  placed: PlacedPackage[],
  truck: Truck | MockTruck,
  preferRear = false
): { x: number; y: number; z: number }[] {
  const points: { x: number; y: number; z: number }[] = [];

  points.push({ x: 0, y: 0, z: 0 });
  if (preferRear) {
    points.push({ x: truck.length * 0.6, y: 0, z: 0 });
    points.push({ x: truck.length * 0.75, y: 0, z: 0 });
  }

  for (const p of placed) {
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);

    points.push({ x: p.position.x + pd.l, y: p.position.y, z: p.position.z });
    points.push({ x: p.position.x, y: p.position.y + pd.h, z: p.position.z });
    points.push({ x: p.position.x, y: p.position.y, z: p.position.z + pd.w });

    points.push({ x: p.position.x + pd.l, y: p.position.y + pd.h, z: p.position.z });
    points.push({ x: p.position.x + pd.l, y: p.position.y, z: p.position.z + pd.w });
    points.push({ x: p.position.x, y: p.position.y + pd.h, z: p.position.z + pd.w });
  }

  const unique = new Map<string, { x: number; y: number; z: number }>();
  for (const pt of points) {
    const rx = Math.max(0, Math.round(pt.x));
    const ry = Math.max(0, Math.round(pt.y));
    const rz = Math.max(0, Math.round(pt.z));
    if (rx < truck.length && ry < truck.height && rz < truck.width) {
      const key = `${rx},${ry},${rz}`;
      if (!unique.has(key)) {
        unique.set(key, { x: rx, y: ry, z: rz });
      }
    }
  }

  return Array.from(unique.values());
}

// ─── FIND BEST POSITION ───────────────────────────────────────────────────────

export function findBestPosition(
  pkg: Package | MockPackage,
  placed: PlacedPackage[],
  truck: Truck | MockTruck,
  strategy: OptimizationStrategy = 'BALANCED',
  maxStopSequence = 5
): { position: PackagePosition; found: boolean; rationale?: string } {
  const isEarlyDelivery = (pkg.deliverySequence || 1) <= 2;
  const candidatePoints = generateCandidatePoints(
    placed,
    truck,
    strategy === 'LIFO_PRIORITY' || isEarlyDelivery
  );

  const rotations = [0, 90];
  let bestPos: PackagePosition | null = null;
  let bestScore = Infinity;
  let bestRationale = '';

  const isHeavy = pkg.weight >= 80;
  const isFragile = pkg.fragilityLevel === 'FRAGILE' || pkg.fragilityLevel === 'HIGH';
  const stopSeq = pkg.deliverySequence || 1;

  const normStop = Math.max(0, Math.min(1, (maxStopSequence - stopSeq) / Math.max(1, maxStopSequence - 1)));
  const idealTargetX = normStop * (truck.length * 0.75);

  for (const rot of rotations) {
    const dims = getEffectiveDimensions(pkg, rot);
    if (dims.l > truck.length || dims.w > truck.width || dims.h > truck.height) continue;

    for (const pt of candidatePoints) {
      const pos: PackagePosition = { x: pt.x, y: pt.y, z: pt.z, rotationY: rot };
      const { valid } = checkCollision(pos, pkg, placed, truck);
      if (!valid) continue;

      let score = 0;
      const centerDistZ = Math.abs(pos.z + dims.w / 2 - truck.width / 2);

      for (const p of placed) {
        const otherStop = p.package.deliverySequence || 1;
        if (stopSeq > otherStop && pos.x > p.position.x) {
          score += (pos.x - p.position.x) * 3.0;
        }
      }

      switch (strategy) {
        case 'LIFO_PRIORITY':
          score += Math.abs(pos.x - idealTargetX) * 5.0;
          score += pos.y * (isHeavy ? 15.0 : 3.0);
          score += centerDistZ * 1.5;
          break;

        case 'SPACE_MAX':
          score += pos.y * 5.0;
          score += pos.x * 1.5;
          score += centerDistZ * 0.8;
          break;

        case 'FRAGILITY_FIRST':
          if (isFragile) {
            score += Math.abs(pos.y - truck.height * 0.45) * 3.0;
            score += Math.abs(pos.x - truck.length * 0.5) * 2.0;
          } else if (isHeavy) {
            score += pos.y * 30.0;
          }
          score += centerDistZ * 1.0;
          break;

        case 'BALANCED':
        default:
          score += isHeavy ? pos.y * 20.0 : pos.y * 3.0;
          score += Math.abs(pos.x - idealTargetX) * 2.5;
          score += centerDistZ * 1.2;
          break;
      }

      if (score < bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }
  }

  // Fallback grid scan
  if (!bestPos) {
    const step = 10;
    for (let rot of rotations) {
      const dims = getEffectiveDimensions(pkg, rot);
      for (let y = 0; y <= truck.height - dims.h; y += step) {
        for (let x = 0; x <= truck.length - dims.l; x += step) {
          for (let z = 0; z <= truck.width - dims.w; z += step) {
            const pos: PackagePosition = { x, y, z, rotationY: rot };
            const { valid } = checkCollision(pos, pkg, placed, truck);
            if (valid) {
              bestPos = pos;
              break;
            }
          }
          if (bestPos) break;
        }
        if (bestPos) break;
      }
      if (bestPos) break;
    }
  }

  if (bestPos) {
    const dims = getEffectiveDimensions(pkg, bestPos.rotationY);
    const posDesc = `(${Math.round(bestPos.x)}cm L, ${Math.round(bestPos.y)}cm H, ${Math.round(bestPos.z)}cm W)`;
    const zone = bestPos.x > truck.length * 0.6 ? 'Rear Door Zone' : bestPos.x > truck.length * 0.3 ? 'Center Zone' : 'Cab Zone';

    bestRationale = `Stop #${stopSeq} cargo ${pkg.name} staged in ${zone} ${posDesc}.`;

    return { position: bestPos, found: true, rationale: bestRationale };
  }

  return {
    position: { x: 0, y: 0, z: 0, rotationY: 0 },
    found: false,
    rationale: 'No collision-free location found with adequate support.',
  };
}

// ─── GRAVITY SETTLING & VOID COMPACTION ───────────────────────────────────────

/**
 * When a package is removed or cancelled, drops any unsupported floating boxes down
 * along the Y-axis until they rest securely on the floor or on another supporting box.
 */
export function gravitySettle(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): PlacedPackage[] {
  // Sort from bottom floor upwards
  const sorted = [...placed].sort((a, b) => a.position.y - b.position.y);
  const settled: PlacedPackage[] = [];

  for (const item of sorted) {
    if (item.isLocked) {
      settled.push(item);
      continue;
    }

    const dims = getEffectiveDimensions(item.package, item.position.rotationY);
    let currentY = item.position.y;
    let bestY = currentY;

    // Test dropping Y down in 5cm increments
    for (let testY = currentY - 5; testY >= 0; testY -= 5) {
      const testPos: PackagePosition = { ...item.position, y: testY };
      const { valid } = checkCollision(testPos, item.package, settled, truck);
      if (valid) {
        bestY = testY;
      } else {
        break;
      }
    }

    const newPos: PackagePosition = { ...item.position, y: bestY };
    settled.push({
      ...item,
      position: newPos,
    });
  }

  return settled;
}

// ─── DYNAMIC LOAD RE-OPTIMIZATION ENGINE ──────────────────────────────────────

/**
 * Recalculates the loading arrangement in response to operational disruptions
 * (packages added, removed, cancelled, locked in place, or vehicle capacity changes).
 */
export function dynamicReoptimize(
  currentPlaced: PlacedPackage[],
  allPackages: (Package | MockPackage)[],
  targetTruck: Truck | MockTruck,
  strategy: OptimizationStrategy = 'BALANCED',
  lockedPackageIds: string[] = [],
  eventType: ReoptimizationEventType = 'PACKAGE_ADDED',
  eventDescription?: string
): {
  placedPackages: PlacedPackage[];
  diff: ReoptimizationDiff;
  report: LoadingReport;
} {
  const previousPlacedCount = currentPlaced.length;
  const prevMetrics = calculateSpaceMetrics(currentPlaced, targetTruck);
  const prevCoG = calculateCenterOfGravity(currentPlaced, targetTruck);

  // 1. Separate locked vs unlocked packages
  const lockedItems: PlacedPackage[] = currentPlaced
    .filter((p) => lockedPackageIds.includes(p.package.id) || p.isLocked)
    .map((p) => ({ ...p, isLocked: true }));

  const lockedIdsSet = new Set(lockedItems.map((p) => p.package.id));

  // 2. Identify remaining packages that must be placed (excluding locked items)
  const remainingPackagesToPlace = allPackages.filter((p) => !lockedIdsSet.has(p.id));

  // 3. Gravity-settle locked items inside the target container
  const basePlaced = gravitySettle(lockedItems, targetTruck);

  // 4. Sort and place remaining unlocked packages around locked ones
  const sorted = [...remainingPackagesToPlace].sort((a, b) => {
    const seqA = a.deliverySequence || 1;
    const seqB = b.deliverySequence || 1;
    const fragA = a.fragilityLevel === 'FRAGILE' ? 3 : a.fragilityLevel === 'HIGH' ? 2 : 0;
    const fragB = b.fragilityLevel === 'FRAGILE' ? 3 : b.fragilityLevel === 'HIGH' ? 2 : 0;

    if (strategy === 'FRAGILITY_FIRST') {
      if (fragA !== fragB) return fragA - fragB;
      return b.weight - a.weight;
    }
    if (seqA !== seqB) return seqB - seqA;
    return b.weight - a.weight;
  });

  const finalPlaced: PlacedPackage[] = [...basePlaced];
  const overflowPackages: Package[] = [];
  const maxStop = Math.max(1, ...allPackages.map((p) => p.deliverySequence || 1));

  let orderIndex = basePlaced.length + 1;

  for (const pkg of sorted) {
    const weightCheck = checkWeightLimit(pkg, finalPlaced, targetTruck);
    if (!weightCheck.valid) {
      overflowPackages.push(pkg);
      continue;
    }

    const { position, found, rationale } = findBestPosition(
      pkg,
      finalPlaced,
      targetTruck,
      strategy,
      maxStop
    );

    if (!found) {
      overflowPackages.push(pkg);
      continue;
    }

    const dims = getEffectiveDimensions(pkg, position.rotationY);
    const support = checkSupportSurface(position, dims, finalPlaced);
    const damageAnalysis = calculateDetailedDamageRisk(pkg, position, finalPlaced, targetTruck);

    finalPlaced.push({
      package: pkg,
      position,
      isSelected: false,
      isHighlighted: false,
      isLocked: false,
      damageRisk: damageAnalysis.riskScore,
      damageReasons: damageAnalysis.contributingFactors,
      damageAnalysis,
      loadingOrder: orderIndex++,
      rationale: rationale || `Re-optimized staging.`,
      supportRatio: support.supportRatio,
    });
  }

  // 5. Calculate Re-Optimization Diff metrics
  let movedCount = 0;
  for (const p of finalPlaced) {
    const orig = currentPlaced.find((cp) => cp.package.id === p.package.id);
    if (!orig) {
      movedCount++; // Newly added
    } else {
      const dist = Math.sqrt(
        Math.pow(p.position.x - orig.position.x, 2) +
          Math.pow(p.position.y - orig.position.y, 2) +
          Math.pow(p.position.z - orig.position.z, 2)
      );
      if (dist > 5) movedCount++;
    }
  }

  const newMetrics = calculateSpaceMetrics(finalPlaced, targetTruck);
  const newCoG = calculateCenterOfGravity(finalPlaced, targetTruck);

  const cogShift = Math.round(
    Math.sqrt(
      Math.pow(newCoG.x - prevCoG.x, 2) +
        Math.pow(newCoG.y - prevCoG.y, 2) +
        Math.pow(newCoG.z - prevCoG.z, 2)
    ) * 10
  ) / 10;

  const spaceDelta = newMetrics.spaceUtilization - prevMetrics.spaceUtilization;
  const weightDelta = newMetrics.weightUtilization - prevMetrics.weightUtilization;

  const report = generateLoadingReport(finalPlaced, allPackages, targetTruck, strategy);

  const diff: ReoptimizationDiff = {
    eventType,
    eventDescription:
      eventDescription ||
      `Re-optimized cargo arrangement: ${finalPlaced.length} items loaded in ${targetTruck.registrationNumber}.`,
    timestamp: new Date().toLocaleTimeString(),
    previousPackageCount: previousPlacedCount,
    newPackageCount: finalPlaced.length,
    movedPackagesCount: movedCount,
    spaceUtilizationDelta: spaceDelta,
    weightUtilizationDelta: weightDelta,
    cogShiftDistanceCm: cogShift,
    overflowPackages,
    recalculatedSteps: finalPlaced.length,
    summaryMessage: `Re-calculated layout: ${movedCount} box positions adjusted, space util ${spaceDelta >= 0 ? '+' : ''}${spaceDelta}%, CoG shifted ${cogShift}cm.`,
  };

  return { placedPackages: finalPlaced, diff, report };
}

// ─── AUTO-OPTIMIZER ───────────────────────────────────────────────────────────

export function autoOptimize(
  packages: (Package | MockPackage)[],
  truck: Truck | MockTruck,
  strategy: OptimizationStrategy = 'BALANCED'
): PlacedPackage[] {
  const res = dynamicReoptimize([], packages, truck, strategy, [], 'PACKAGE_ADDED', 'Initial load calculation');
  return res.placedPackages;
}

// ─── ROUTE-AWARE UNLOADING ACCESSIBILITY ANALYZER ──────────────────────────────

export function calculateUnloadingAccessibility(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): RouteAccessibilityReport {
  if (placed.length === 0) {
    return {
      accessibilityScore: 100,
      totalStops: 0,
      totalPackages: 0,
      totalBlockedParcels: 0,
      totalShiftingMoves: 0,
      stops: [],
      diagnostics: [],
      warnings: [],
    };
  }

  const diagnostics: BlockedPackageDiagnostic[] = [];
  const warnings: string[] = [];

  const stopMap = new Map<number, { destination: string; packages: PlacedPackage[] }>();
  for (const p of placed) {
    const seq = p.package.deliverySequence || 1;
    if (!stopMap.has(seq)) {
      stopMap.set(seq, { destination: p.package.destination || `Stop #${seq}`, packages: [] });
    }
    stopMap.get(seq)!.packages.push(p);
  }

  const sortedStopSequences = Array.from(stopMap.keys()).sort((a, b) => a - b);
  let totalBlocked = 0;
  let totalShifts = 0;

  for (const p1 of placed) {
    const s1 = p1.package.deliverySequence || 1;
    const d1 = getEffectiveDimensions(p1.package, p1.position.rotationY);
    const blockers: PlacedPackage[] = [];

    for (const p2 of placed) {
      if (p1.package.id === p2.package.id) continue;
      const s2 = p2.package.deliverySequence || 1;

      if (s2 > s1) {
        const d2 = getEffectiveDimensions(p2.package, p2.position.rotationY);
        const isCloserToDoor = p2.position.x > p1.position.x + 5;

        const overlapY =
          p1.position.y < p2.position.y + d2.h && p1.position.y + d1.h > p2.position.y;
        const overlapZ =
          p1.position.z < p2.position.z + d2.w && p1.position.z + d1.w > p2.position.z;

        if (isCloserToDoor && overlapY && overlapZ) {
          blockers.push(p2);
          diagnostics.push({
            blockedPackageId: p1.package.id,
            blockedPackageName: p1.package.name,
            blockedStopSequence: s1,
            blockingPackageId: p2.package.id,
            blockingPackageName: p2.package.name,
            blockingStopSequence: s2,
            reason: `Stop #${s1} cargo "${p1.package.name}" is blocked by Stop #${s2} cargo "${p2.package.name}" along extraction path to rear door.`,
          });
        }
      }
    }

    if (blockers.length > 0) {
      p1.isBlockedForUnloading = true;
      totalBlocked++;
      totalShifts += blockers.length;
    } else {
      p1.isBlockedForUnloading = false;
    }
  }

  const stops: UnloadingStopPlan[] = sortedStopSequences.map((seq, idx) => {
    const data = stopMap.get(seq)!;
    const pkgs = data.packages;
    const blockedCount = pkgs.filter((p) => p.isBlockedForUnloading).length;
    const isDirectlyAccessible = blockedCount === 0;

    const blockingNames = new Set<string>();
    diagnostics
      .filter((d) => d.blockedStopSequence === seq)
      .forEach((d) => blockingNames.add(d.blockingPackageName));

    return {
      stopNumber: seq,
      destination: data.destination,
      packageCount: pkgs.length,
      totalWeight: pkgs.reduce((s, p) => s + p.package.weight, 0),
      packageIds: pkgs.map((p) => p.package.id),
      packageNames: pkgs.map((p) => p.package.name),
      isDirectlyAccessible,
      blockedCount,
      blockingPackages: Array.from(blockingNames),
      extractionOrder: idx + 1,
    };
  });

  if (totalBlocked > 0) {
    warnings.push(
      `${totalBlocked} package(s) across delivery stops are blocked — requires ~${totalShifts} intermediate box shifts during unloading.`
    );
  } else {
    warnings.push('100% Direct LIFO Unloading — all earlier stops are immediately accessible at rear doors.');
  }

  const accessibilityScore = Math.max(
    0,
    Math.round(((placed.length - totalBlocked) / placed.length) * 100)
  );

  return {
    accessibilityScore,
    totalStops: stops.length,
    totalPackages: placed.length,
    totalBlockedParcels: totalBlocked,
    totalShiftingMoves: totalShifts,
    stops,
    diagnostics,
    warnings,
  };
}

// ─── STEP-BY-STEP LOADING SEQUENCE GENERATOR ──────────────────────────────────

export function generateLoadingSteps(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): LoadingStep[] {
  const ordered = [...placed].sort((a, b) => (a.loadingOrder || 0) - (b.loadingOrder || 0));

  const totalVol = truck.length * truck.width * truck.height;
  let cumWeight = 0;
  let cumVol = 0;

  return ordered.map((p, idx) => {
    const dims = getEffectiveDimensions(p.package, p.position.rotationY);
    const vol = dims.l * dims.w * dims.h;
    cumWeight += p.package.weight;
    cumVol += vol;

    const orientation =
      p.position.rotationY === 90
        ? `Rotated 90° (${dims.l}×${dims.w}×${dims.h}cm)`
        : `Standard (${dims.l}×${dims.w}×${dims.h}cm)`;

    return {
      stepNumber: idx + 1,
      packageId: p.package.id,
      packageName: p.package.name,
      digitalId: p.package.digitalId || p.package.id,
      weight: p.package.weight,
      dimensions: `${dims.l} × ${dims.w} × ${dims.h} cm`,
      position: p.position,
      orientation,
      rationale:
        p.rationale ||
        `Load box ${idx + 1} for Stop #${p.package.deliverySequence} (${p.package.destination}) at (${Math.round(p.position.x)}, ${Math.round(p.position.y)}, ${Math.round(p.position.z)}) cm`,
      cumulativeWeight: cumWeight,
      cumulativeVolumePct: Math.min(100, Math.round((cumVol / totalVol) * 100)),
      damageRisk: p.damageRisk,
      deliverySequence: p.package.deliverySequence || 1,
      destination: p.package.destination || 'Hub Depot',
    };
  });
}

// ─── CONSTRAINT VALIDATION BREAKDOWN ──────────────────────────────────────────

export function validateConstraints(
  placed: PlacedPackage[],
  truck: Truck | MockTruck
): ConstraintStatus {
  const metrics = calculateSpaceMetrics(placed, truck);
  const accessibility = calculateUnloadingAccessibility(placed, truck);
  const stability = analyzeVehicleStability(placed, truck);
  const damageReport = analyzeManifestDamageRisk(placed, truck);
  const warnings: string[] = [];

  const volumeFit = metrics.spaceUtilization <= 100;
  const weightLimit = metrics.totalWeight <= truck.maxWeight;

  if (!volumeFit) warnings.push('Cargo volume exceeds available vehicle capacity.');
  if (!weightLimit) warnings.push(`Payload exceeds max legal limit by ${metrics.totalWeight - truck.maxWeight}kg.`);

  let physicalSupport = true;
  for (const p of placed) {
    const dims = getEffectiveDimensions(p.package, p.position.rotationY);
    const s = checkSupportSurface(p.position, dims, placed);
    if (!s.supported) {
      physicalSupport = false;
      warnings.push(`Package "${p.package.name}" has inadequate base support (${Math.round(s.supportRatio * 100)}%).`);
    }
  }

  let fragilityStacking = true;
  for (const p of placed) {
    if (p.package.fragilityLevel === 'FRAGILE') {
      const dims = getEffectiveDimensions(p.package, p.position.rotationY);
      for (const above of placed) {
        if (above.package.id === p.package.id) continue;
        const ad = getEffectiveDimensions(above.package, above.position.rotationY);
        if (
          above.position.y >= p.position.y + dims.h - 1 &&
          boxesOverlap(
            p.position.x, p.position.y, p.position.z, dims.l, dims.h, dims.w,
            above.position.x, above.position.y, above.position.z, ad.l, ad.h, ad.w
          ) &&
          above.package.weight > 25
        ) {
          fragilityStacking = false;
          warnings.push(`Heavy package "${above.package.name}" stacked on fragile box "${p.package.name}".`);
        }
      }
    }
  }

  const lifoSequence = accessibility.totalBlockedParcels === 0;
  const stabilityCompliance = stability.isStable;
  const damageSafetyCompliance = damageReport.criticalRiskCount === 0;

  if (!lifoSequence) {
    warnings.push(`${accessibility.totalBlockedParcels} parcel(s) blocked along route extraction path.`);
  }

  if (!stabilityCompliance) {
    warnings.push(...stability.criticalWarnings);
  }

  if (!damageSafetyCompliance) {
    warnings.push(`${damageReport.criticalRiskCount} parcel(s) are at critical damage/crush risk.`);
  }

  return {
    volumeFit,
    weightLimit,
    fragilityStacking,
    lifoSequence,
    physicalSupport,
    stabilityCompliance,
    damageSafetyCompliance,
    warnings,
  };
}

// ─── AI RECOMMENDATIONS GENERATOR ─────────────────────────────────────────────

export function generateRecommendations(
  unplacedPackages: (Package | MockPackage)[],
  placed: PlacedPackage[],
  truck: Truck | MockTruck,
  strategy: OptimizationStrategy = 'BALANCED'
): AIRecommendation[] {
  const dist = calculateWeightDistribution(placed, truck);
  const recommendations: AIRecommendation[] = [];

  const sorted = [...unplacedPackages].sort((a, b) => {
    const seqA = a.deliverySequence || 1;
    const seqB = b.deliverySequence || 1;
    return seqB - seqA || b.weight - a.weight;
  });

  for (let i = 0; i < Math.min(sorted.length, 5); i++) {
    const pkg = sorted[i];
    const { position, found, rationale } = findBestPosition(pkg, placed, truck, strategy);
    if (!found) continue;

    const damageAnalysis = calculateDetailedDamageRisk(pkg, position, placed, truck);
    const dims = getEffectiveDimensions(pkg, position.rotationY);
    const pkgVol = dims.l * dims.w * dims.h;
    const utilizationImprovement =
      Math.round((pkgVol / (truck.length * truck.width * truck.height)) * 100 * 10) / 10;

    const cx = position.x + dims.l / 2;
    const cz = position.z + dims.w / 2;
    const isRear = cx > truck.length * 0.66;
    const isLeft = cz < truck.width / 2;
    let weightBalanceImpact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
    if (dist.rear > 55 && isRear) weightBalanceImpact = 'NEGATIVE';
    else if (dist.left > 60 && isLeft) weightBalanceImpact = 'NEGATIVE';
    else if (dist.isBalanced) weightBalanceImpact = 'NEUTRAL';
    else weightBalanceImpact = 'POSITIVE';

    const orientationLabel =
      position.rotationY === 90
        ? `Rotated 90° (${dims.l}×${dims.w}×${dims.h}cm)`
        : `Standard (${dims.l}×${dims.w}×${dims.h}cm)`;

    recommendations.push({
      packageId: pkg.id,
      packageName: pkg.name,
      suggestedPosition: position,
      suggestedOrientation: orientationLabel,
      reason:
        rationale ||
        `Optimal placement for Stop #${pkg.deliverySequence} at (${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.z)}) cm.`,
      utilizationImprovement,
      weightBalanceImpact,
      damageRiskImpact: damageAnalysis.riskScore < 30 ? 'REDUCES' : damageAnalysis.riskScore > 60 ? 'INCREASES' : 'NEUTRAL',
      priority: i + 1,
    });
  }

  return recommendations;
}

// ─── LOADING REPORT ───────────────────────────────────────────────────────────

export function generateLoadingReport(
  placed: PlacedPackage[],
  allPackages: (Package | MockPackage)[],
  truck: Truck | MockTruck,
  strategy: OptimizationStrategy = 'BALANCED'
): LoadingReport {
  const metrics = calculateSpaceMetrics(placed, truck);
  const dist = calculateWeightDistribution(placed, truck);
  const stabilityAnalysis = analyzeVehicleStability(placed, truck);
  const damageRiskReport = analyzeManifestDamageRisk(placed, truck);
  const constraints = validateConstraints(placed, truck);
  const steps = generateLoadingSteps(placed, truck);
  const unloadingReport = calculateUnloadingAccessibility(placed, truck);

  const avgDamageRisk = damageRiskReport.averageRiskScore;

  const lrDiff = Math.abs(dist.left - dist.right);
  const frDiff = Math.abs(dist.front - dist.rear);
  const balanceScore = Math.max(0, 100 - lrDiff - Math.round(frDiff * 0.5));

  const constraintPenalty = constraints.warnings.length * 10;
  const loadingEfficiency = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        metrics.spaceUtilization * 0.25 +
          metrics.weightUtilization * 0.2 +
          stabilityAnalysis.stabilityScore * 0.2 +
          unloadingReport.accessibilityScore * 0.2 +
          (100 - avgDamageRisk) * 0.15 -
          constraintPenalty
      )
    )
  );

  const recommendations: string[] = [];
  if (damageRiskReport.criticalRiskCount > 0) {
    recommendations.push(
      `${damageRiskReport.criticalRiskCount} parcel(s) are at critical damage risk — apply Fragility-First Policy.`
    );
  }
  if (unloadingReport.accessibilityScore < 100) {
    recommendations.push(
      `${unloadingReport.totalBlockedParcels} parcel(s) are blocked by later stops — consider running with LIFO Delivery Sequence Policy.`
    );
  }
  if (!stabilityAnalysis.isStable) {
    recommendations.push(...stabilityAnalysis.criticalWarnings);
  }
  if (metrics.spaceUtilization < 60)
    recommendations.push('Space utilization is below 60% — additional route freight can be consolidated.');
  if (recommendations.length === 0)
    recommendations.push('Optimal configuration: minimum damage risk, 100% route accessibility, and stable dynamics.');

  return {
    totalPackages: allPackages.length,
    loadedPackages: placed.length,
    spaceUtilization: metrics.spaceUtilization,
    weightUtilization: metrics.weightUtilization,
    balanceScore,
    damageRiskScore: avgDamageRisk,
    loadingEfficiency,
    strategy,
    recommendations,
    weightDistribution: dist,
    stabilityAnalysis,
    damageRiskReport,
    steps,
    constraints,
    unloadingReport,
  };
}
