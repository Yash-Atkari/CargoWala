// ─── 3D CARGO LOADING OPTIMIZER ──────────────────────────────────────────────
// Deterministic, explainable heuristic bin-packing for CargoWala

import { MockPackage, MockTruck } from './mockData';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PackagePosition {
  x: number; // cm from rear-left-bottom
  y: number; // cm from floor
  z: number; // cm from left wall
  rotationY: number; // 0 or 90 degrees
}

export interface PlacedPackage {
  package: MockPackage;
  position: PackagePosition;
  isSelected: boolean;
  isHighlighted: boolean;
  damageRisk: number;
  damageReasons: string[];
}

export interface WeightDistribution {
  front: number;   // % of total weight in front third
  center: number;  // % in center third
  rear: number;    // % in rear third
  left: number;    // % on left half
  right: number;   // % on right half
  isBalanced: boolean;
  warnings: string[];
}

export interface SpaceMetrics {
  totalVolume: number;       // cm³
  usedVolume: number;        // cm³
  spaceUtilization: number;  // 0–100
  totalWeight: number;       // kg
  maxWeight: number;         // kg
  weightUtilization: number; // 0–100
  remainingVolume: number;   // cm³
  remainingWeight: number;   // kg
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

export interface LoadingReport {
  totalPackages: number;
  loadedPackages: number;
  spaceUtilization: number;
  weightUtilization: number;
  balanceScore: number;       // 0–100
  damageRiskScore: number;    // 0–100 (lower = better)
  loadingEfficiency: number;  // 0–100
  recommendations: string[];
  weightDistribution: WeightDistribution;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getEffectiveDimensions(pkg: MockPackage, rotationY: number): { l: number; w: number; h: number } {
  if (rotationY === 90) {
    return { l: pkg.width, w: pkg.length, h: pkg.height };
  }
  return { l: pkg.length, w: pkg.width, h: pkg.height };
}

function boxesOverlap(
  ax: number, ay: number, az: number, al: number, ah: number, aw: number,
  bx: number, by: number, bz: number, bl: number, bh: number, bw: number,
  tolerance = 0.5
): boolean {
  return (
    ax < bx + bl - tolerance && ax + al > bx + tolerance &&
    ay < by + bh - tolerance && ay + ah > by + tolerance &&
    az < bz + bw - tolerance && az + aw > bz + tolerance
  );
}

function isInsideTruck(
  pos: PackagePosition, dims: { l: number; w: number; h: number }, truck: MockTruck
): boolean {
  return (
    pos.x >= 0 && pos.x + dims.l <= truck.length &&
    pos.y >= 0 && pos.y + dims.h <= truck.height &&
    pos.z >= 0 && pos.z + dims.w <= truck.width
  );
}

// ─── COLLISION DETECTION ──────────────────────────────────────────────────────

export function checkCollision(
  newPos: PackagePosition,
  newPkg: MockPackage,
  placed: PlacedPackage[],
  truck: MockTruck
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const dims = getEffectiveDimensions(newPkg, newPos.rotationY);

  // Boundary check
  if (!isInsideTruck(newPos, dims, truck)) {
    if (newPos.x < 0 || newPos.x + dims.l > truck.length) reasons.push('Package extends beyond truck length');
    if (newPos.y < 0 || newPos.y + dims.h > truck.height) reasons.push('Package exceeds truck height');
    if (newPos.z < 0 || newPos.z + dims.w > truck.width) reasons.push('Package extends beyond truck width');
  }

  // Overlap check
  for (const p of placed) {
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    if (boxesOverlap(
      newPos.x, newPos.y, newPos.z, dims.l, dims.h, dims.w,
      p.position.x, p.position.y, p.position.z, pd.l, pd.h, pd.w
    )) {
      reasons.push(`Overlaps with ${p.package.name}`);
    }
  }

  return { valid: reasons.length === 0, reasons };
}

// ─── WEIGHT CHECK ─────────────────────────────────────────────────────────────

export function checkWeightLimit(
  newPkg: MockPackage,
  placed: PlacedPackage[],
  truck: MockTruck
): { valid: boolean; reason?: string } {
  const currentWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  if (currentWeight + newPkg.weight > truck.maxWeight) {
    return {
      valid: false,
      reason: `Adding ${newPkg.weight}kg would exceed max weight of ${truck.maxWeight}kg (current: ${currentWeight}kg)`,
    };
  }
  return { valid: true };
}

// ─── DAMAGE RISK CALCULATOR ───────────────────────────────────────────────────

export function calculateDamageRisk(
  pkg: MockPackage,
  pos: PackagePosition,
  allPlaced: PlacedPackage[],
  truck: MockTruck
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const dims = getEffectiveDimensions(pkg, pos.rotationY);

  // Fragility base score
  const fragilityMap = { LOW: 5, MEDIUM: 15, HIGH: 30, FRAGILE: 45 };
  score += fragilityMap[pkg.fragilityLevel];

  // Weight above this package
  let weightAbove = 0;
  for (const p of allPlaced) {
    const pd = getEffectiveDimensions(p.package, p.position.rotationY);
    const horizontalOverlap =
      pos.x < p.position.x + pd.l && pos.x + dims.l > p.position.x &&
      pos.z < p.position.z + pd.w && pos.z + dims.w > p.position.z;
    if (horizontalOverlap && p.position.y >= pos.y + dims.h - 1) {
      weightAbove += p.package.weight;
    }
  }

  if (weightAbove > 200) {
    score += 25;
    reasons.push(`Heavy load above: ${weightAbove}kg stacked on this package`);
  } else if (weightAbove > 80) {
    score += 12;
    reasons.push(`Moderate weight above: ${weightAbove}kg`);
  }

  // Fragile under heavy
  if ((pkg.fragilityLevel === 'FRAGILE' || pkg.fragilityLevel === 'HIGH') && weightAbove > 50) {
    score += 15;
    reasons.push(`Fragile package with ${weightAbove}kg above — high damage risk`);
  }

  // Stacking height risk
  const heightRatio = (pos.y + dims.h) / truck.height;
  if (heightRatio > 0.85) {
    score += 10;
    reasons.push('Package placed near top of truck — risk of shifting');
  }

  // Delivery sequence risk (early delivery = rear = more handling)
  if (pkg.deliverySequence <= 2 && pos.x > truck.length * 0.6) {
    score += 8;
    reasons.push('Early-delivery package placed deep in truck — requires unloading other packages first');
  }

  // Priority risk
  if (pkg.priority === 'URGENT' && pkg.fragilityLevel !== 'LOW') {
    score += 5;
    reasons.push('Urgent fragile package — handle with care');
  }

  if (reasons.length === 0 && score < 20) {
    reasons.push('Low risk — good placement');
  }

  return { score: Math.min(100, score), reasons };
}

// ─── WEIGHT DISTRIBUTION ──────────────────────────────────────────────────────

export function calculateWeightDistribution(
  placed: PlacedPackage[],
  truck: MockTruck
): WeightDistribution {
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);
  if (totalWeight === 0) {
    return { front: 0, center: 0, rear: 0, left: 0, right: 0, isBalanced: true, warnings: [] };
  }

  const frontThird = truck.length / 3;
  const rearThird = (truck.length * 2) / 3;
  const leftHalf = truck.width / 2;

  let frontW = 0, centerW = 0, rearW = 0, leftW = 0, rightW = 0;

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

  if (lrDiff > 30) warnings.push(`Unbalanced left-right distribution (${left}% / ${right}%) — risk of tipping`);
  if (frDiff > 40) warnings.push(`Unbalanced front-rear distribution (${front}% / ${rear}%) — affects handling`);
  if (front > 55) warnings.push('Too much weight at front — may affect steering');
  if (rear > 60) warnings.push('Too much weight at rear — may cause instability');

  const isBalanced = lrDiff <= 30 && frDiff <= 40;

  return { front, center, rear, left, right, isBalanced, warnings };
}

// ─── SPACE METRICS ────────────────────────────────────────────────────────────

export function calculateSpaceMetrics(placed: PlacedPackage[], truck: MockTruck): SpaceMetrics {
  const totalVolume = truck.length * truck.width * truck.height;
  const usedVolume = placed.reduce((s, p) => {
    const d = getEffectiveDimensions(p.package, p.position.rotationY);
    return s + d.l * d.w * d.h;
  }, 0);
  const totalWeight = placed.reduce((s, p) => s + p.package.weight, 0);

  return {
    totalVolume,
    usedVolume,
    spaceUtilization: Math.round((usedVolume / totalVolume) * 100),
    totalWeight,
    maxWeight: truck.maxWeight,
    weightUtilization: Math.round((totalWeight / truck.maxWeight) * 100),
    remainingVolume: totalVolume - usedVolume,
    remainingWeight: truck.maxWeight - totalWeight,
    packageCount: placed.length,
  };
}

// ─── FIND VALID POSITION (3D BIN PACKING) ────────────────────────────────────

export function findBestPosition(
  pkg: MockPackage,
  placed: PlacedPackage[],
  truck: MockTruck
): { position: PackagePosition; found: boolean } {
  const step = 10; // 10cm grid resolution
  const rotations = [0, 90];

  // Sort candidates: prefer floor level, rear of truck (for early delivery = rear)
  // Heavy packages go to floor, fragile go higher
  const preferFloor = pkg.fragilityLevel === 'LOW' || pkg.weight > 100;
  const preferRear = pkg.deliverySequence <= 2; // early delivery = rear for easy access

  let bestPos: PackagePosition | null = null;
  let bestScore = Infinity;

  for (const rot of rotations) {
    const dims = getEffectiveDimensions(pkg, rot);
    if (dims.l > truck.length || dims.w > truck.width || dims.h > truck.height) continue;

    // Try positions on a grid
    const xStart = preferRear ? truck.length - dims.l : 0;
    const xEnd = preferRear ? truck.length - dims.l : truck.length - dims.l;
    const xRange = preferRear
      ? [truck.length - dims.l, truck.length - dims.l - step, truck.length - dims.l - step * 2, 0]
      : Array.from({ length: Math.ceil(truck.length / step) }, (_, i) => i * step);

    for (const xCandidate of xRange) {
      for (let z = 0; z <= truck.width - dims.w; z += step) {
        // Find the lowest valid y at this (x, z)
        let minY = 0;
        for (const p of placed) {
          const pd = getEffectiveDimensions(p.package, p.position.rotationY);
          const horizontalOverlap =
            xCandidate < p.position.x + pd.l && xCandidate + dims.l > p.position.x &&
            z < p.position.z + pd.w && z + dims.w > p.position.z;
          if (horizontalOverlap) {
            minY = Math.max(minY, p.position.y + pd.h);
          }
        }

        const pos: PackagePosition = { x: xCandidate, y: minY, z, rotationY: rot };
        const { valid } = checkCollision(pos, pkg, placed, truck);
        if (!valid) continue;

        // Score this position (lower = better)
        let score = 0;
        score += pos.y * 2; // prefer floor
        score += preferFloor ? pos.y * 3 : 0;
        score += preferRear ? Math.abs(pos.x - (truck.length - dims.l)) * 0.5 : pos.x * 0.5;
        score += z * 0.1; // prefer left side slightly

        if (score < bestScore) {
          bestScore = score;
          bestPos = pos;
        }
      }
    }
  }

  if (bestPos) return { position: bestPos, found: true };

  // Fallback: try any valid position
  for (let x = 0; x <= truck.length - pkg.length; x += step) {
    for (let z = 0; z <= truck.width - pkg.width; z += step) {
      const pos: PackagePosition = { x, y: 0, z, rotationY: 0 };
      const { valid } = checkCollision(pos, pkg, placed, truck);
      if (valid) return { position: pos, found: true };
    }
  }

  return { position: { x: 0, y: 0, z: 0, rotationY: 0 }, found: false };
}

// ─── AUTO-OPTIMIZE (BIN PACKING) ─────────────────────────────────────────────

export function autoOptimize(
  packages: MockPackage[],
  truck: MockTruck
): PlacedPackage[] {
  // Sort packages by optimization priority:
  // 1. Heavy + non-fragile → floor first
  // 2. Large volume → early placement
  // 3. Delivery sequence → later deliveries go deeper (higher x)
  // 4. Fragile → top layers
  const sorted = [...packages].sort((a, b) => {
    const fragScore = (p: MockPackage) =>
      p.fragilityLevel === 'FRAGILE' ? 3 : p.fragilityLevel === 'HIGH' ? 2 : p.fragilityLevel === 'MEDIUM' ? 1 : 0;
    const volA = a.length * a.width * a.height;
    const volB = b.length * b.width * b.height;

    // Non-fragile heavy first
    if (fragScore(a) !== fragScore(b)) return fragScore(a) - fragScore(b);
    // Larger volume first
    if (Math.abs(volA - volB) > 10000) return volB - volA;
    // Later delivery sequence first (they go deeper)
    return b.deliverySequence - a.deliverySequence;
  });

  const placed: PlacedPackage[] = [];

  for (const pkg of sorted) {
    const weightCheck = checkWeightLimit(pkg, placed, truck);
    if (!weightCheck.valid) continue;

    const { position, found } = findBestPosition(pkg, placed, truck);
    if (!found) continue;

    const { score, reasons } = calculateDamageRisk(pkg, position, placed, truck);
    placed.push({
      package: pkg,
      position,
      isSelected: false,
      isHighlighted: false,
      damageRisk: score,
      damageReasons: reasons,
    });
  }

  return placed;
}

// ─── AI RECOMMENDATIONS ───────────────────────────────────────────────────────

export function generateRecommendations(
  unplacedPackages: MockPackage[],
  placed: PlacedPackage[],
  truck: MockTruck
): AIRecommendation[] {
  const metrics = calculateSpaceMetrics(placed, truck);
  const dist = calculateWeightDistribution(placed, truck);
  const recommendations: AIRecommendation[] = [];

  // Sort unplaced by priority
  const sorted = [...unplacedPackages].sort((a, b) => {
    const urgencyScore = (p: MockPackage) =>
      p.priority === 'URGENT' ? 4 : p.priority === 'HIGH' ? 3 : p.priority === 'NORMAL' ? 2 : 1;
    return urgencyScore(b) - urgencyScore(a);
  });

  for (let i = 0; i < Math.min(sorted.length, 5); i++) {
    const pkg = sorted[i];
    const { position, found } = findBestPosition(pkg, placed, truck);
    if (!found) continue;

    const { score: riskScore } = calculateDamageRisk(pkg, position, placed, truck);
    const dims = getEffectiveDimensions(pkg, position.rotationY);
    const pkgVol = dims.l * dims.w * dims.h;
    const utilizationImprovement = Math.round((pkgVol / (truck.length * truck.width * truck.height)) * 100 * 10) / 10;

    // Determine weight balance impact
    const cx = position.x + dims.l / 2;
    const cz = position.z + dims.w / 2;
    const isRear = cx > truck.length * 0.66;
    const isLeft = cz < truck.width / 2;
    let weightBalanceImpact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
    if (dist.rear > 55 && isRear) weightBalanceImpact = 'NEGATIVE';
    else if (dist.left > 60 && isLeft) weightBalanceImpact = 'NEGATIVE';
    else if (dist.isBalanced) weightBalanceImpact = 'NEUTRAL';
    else weightBalanceImpact = 'POSITIVE';

    // Build reason
    let reason = '';
    const posZone = cx < truck.length / 3 ? 'front' : cx < (truck.length * 2) / 3 ? 'center' : 'rear';
    if (pkg.deliverySequence <= 2) {
      reason = `Place near the ${posZone} — delivery sequence #${pkg.deliverySequence} means it will be unloaded early, so rear placement allows easy access without disturbing other packages.`;
    } else if (pkg.fragilityLevel === 'FRAGILE' || pkg.fragilityLevel === 'HIGH') {
      reason = `Fragile package — position at height ${Math.round(position.y)}cm to minimize weight above it. No heavy packages should be stacked on top.`;
    } else if (pkg.weight > 200) {
      reason = `Heavy package (${pkg.weight}kg) — floor placement at position (${Math.round(position.x)}, ${Math.round(position.z)}) provides stable base and improves weight distribution.`;
    } else {
      reason = `Optimal fit at position (${Math.round(position.x)}cm, ${Math.round(position.y)}cm, ${Math.round(position.z)}cm) — maximizes space utilization by +${utilizationImprovement}%.`;
    }

    const orientationLabel = position.rotationY === 90
      ? `Rotated 90° (${dims.l}×${dims.w}×${dims.h}cm)`
      : `Standard orientation (${dims.l}×${dims.w}×${dims.h}cm)`;

    recommendations.push({
      packageId: pkg.id,
      packageName: pkg.name,
      suggestedPosition: position,
      suggestedOrientation: orientationLabel,
      reason,
      utilizationImprovement,
      weightBalanceImpact,
      damageRiskImpact: riskScore < 30 ? 'REDUCES' : riskScore > 60 ? 'INCREASES' : 'NEUTRAL',
      priority: i + 1,
    });
  }

  return recommendations;
}

// ─── LOADING REPORT ───────────────────────────────────────────────────────────

export function generateLoadingReport(
  placed: PlacedPackage[],
  allPackages: MockPackage[],
  truck: MockTruck
): LoadingReport {
  const metrics = calculateSpaceMetrics(placed, truck);
  const dist = calculateWeightDistribution(placed, truck);

  const avgDamageRisk = placed.length > 0
    ? Math.round(placed.reduce((s, p) => s + p.damageRisk, 0) / placed.length)
    : 0;

  // Balance score: 100 = perfect, deduct for imbalance
  const lrDiff = Math.abs(dist.left - dist.right);
  const frDiff = Math.abs(dist.front - dist.rear);
  const balanceScore = Math.max(0, 100 - lrDiff - Math.round(frDiff * 0.5));

  // Loading efficiency: considers space util, weight util, balance, and damage risk
  const loadingEfficiency = Math.round(
    (metrics.spaceUtilization * 0.35 +
      metrics.weightUtilization * 0.25 +
      balanceScore * 0.25 +
      (100 - avgDamageRisk) * 0.15)
  );

  const recommendations: string[] = [];
  if (metrics.spaceUtilization < 60) recommendations.push('Space utilization is below 60% — consider adding more packages or using a smaller truck.');
  if (metrics.weightUtilization < 50) recommendations.push('Weight utilization is low — truck capacity is underused.');
  if (!dist.isBalanced) recommendations.push('Load is unbalanced — redistribute packages for safer transport.');
  if (avgDamageRisk > 50) recommendations.push('Average damage risk is high — review fragile package placements.');
  if (placed.length < allPackages.length) {
    recommendations.push(`${allPackages.length - placed.length} package(s) could not be placed — consider a larger truck.`);
  }
  if (recommendations.length === 0) recommendations.push('Excellent loading configuration — all metrics are within optimal range.');

  return {
    totalPackages: allPackages.length,
    loadedPackages: placed.length,
    spaceUtilization: metrics.spaceUtilization,
    weightUtilization: metrics.weightUtilization,
    balanceScore,
    damageRiskScore: avgDamageRisk,
    loadingEfficiency,
    recommendations,
    weightDistribution: dist,
  };
}
