'use client';
import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import {
  PlacedPackage,
  PackagePosition,
  calculateCenterOfGravity,
  CenterOfGravity,
  ColorMode,
  getStopColor,
} from '@/lib/loadingOptimizer';
import { Truck } from '@/lib/types';

// ─── SCALE FACTOR: cm → scene units (1 unit = 50cm) ─────────────────────────
const SCALE = 1 / 50;

function scaleVal(cm: number) {
  return cm * SCALE;
}

// ─── PACKAGE COLORS ──────────────────────────────────────────────────────────
function getPackageColor(
  pkg: PlacedPackage,
  isSelected: boolean,
  isHighlighted: boolean,
  colorMode: ColorMode = 'STOP',
  isCurrentUnloadingStop = false
): string {
  if (isSelected) return '#0EA5E9';
  if (isHighlighted || isCurrentUnloadingStop) return '#F97316';

  if (colorMode === 'STOP') {
    return getStopColor(pkg.package.deliverySequence || 1);
  }

  if (colorMode === 'RISK_HEATMAP') {
    const risk = pkg.damageRisk || 0;
    if (risk > 75) return '#EF4444'; // Critical Red
    if (risk > 50) return '#F97316'; // High Orange
    if (risk > 25) return '#EAB308'; // Moderate Yellow
    return '#22C55E'; // Low/Safe Green
  }

  // Fallback: FRAGILITY
  const fragMap: Record<string, string> = {
    LOW: '#22C55E',
    MEDIUM: '#A78BFA',
    HIGH: '#F97316',
    FRAGILE: '#EF4444',
  };
  return fragMap[pkg.package.fragilityLevel] || '#64748B';
}

// ─── TRUCK CONTAINER ─────────────────────────────────────────────────────────
function TruckContainer({ truck }: { truck: Truck }) {
  const L = scaleVal(truck.length);
  const W = scaleVal(truck.width);
  const H = scaleVal(truck.height);
  const wallThickness = 0.04;

  return (
    <group>
      {/* Floor */}
      <mesh position={[L / 2, -wallThickness / 2, W / 2]} receiveShadow>
        <boxGeometry args={[L, wallThickness, W]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      {/* Left wall */}
      <mesh position={[L / 2, H / 2, -wallThickness / 2]}>
        <boxGeometry args={[L, H, wallThickness]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.4} roughness={0.9} />
      </mesh>
      {/* Right wall */}
      <mesh position={[L / 2, H / 2, W + wallThickness / 2]}>
        <boxGeometry args={[L, H, wallThickness]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.4} roughness={0.9} />
      </mesh>
      {/* Front wall (Cab side / X = 0) */}
      <mesh position={[-wallThickness / 2, H / 2, W / 2]}>
        <boxGeometry args={[wallThickness, H, W]} />
        <meshStandardMaterial color="#475569" transparent opacity={0.7} roughness={0.8} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[L / 2, H + wallThickness / 2, W / 2]}>
        <boxGeometry args={[L, wallThickness, W]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.25} roughness={0.9} />
      </mesh>
      {/* Rear opening indicator (X = L) */}
      <mesh position={[L + wallThickness / 2, H / 2, W / 2]}>
        <boxGeometry args={[wallThickness, H, W]} />
        <meshStandardMaterial color="#0EA5E9" transparent opacity={0.12} roughness={0.9} />
      </mesh>

      {/* Grid lines on floor */}
      {Array.from({ length: Math.floor(truck.length / 100) + 1 }, (_, i) => (
        <Line
          key={`grid-x-${i}`}
          points={[
            [scaleVal(i * 100), 0.01, 0],
            [scaleVal(i * 100), 0.01, W],
          ]}
          color="#334155"
          lineWidth={0.5}
        />
      ))}
      {Array.from({ length: Math.floor(truck.width / 100) + 1 }, (_, i) => (
        <Line
          key={`grid-z-${i}`}
          points={[
            [0, 0.01, scaleVal(i * 100)],
            [L, 0.01, scaleVal(i * 100)],
          ]}
          color="#334155"
          lineWidth={0.5}
        />
      ))}

      {/* Dimension labels */}
      <Text
        position={[L / 2, -0.3, W / 2]}
        fontSize={0.16}
        color="#64748B"
        anchorX="center"
        anchorY="middle"
      >
        {`Length: ${truck.length}cm · Width: ${truck.width}cm · Height: ${truck.height}cm`}
      </Text>

      {/* Cab / Front Label */}
      <Text
        position={[-0.3, H / 2, W / 2]}
        fontSize={0.14}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
      >
        FRONT (CAB)
      </Text>

      {/* Rear / Doors Label */}
      <Text
        position={[L + 0.3, H / 2, W / 2]}
        fontSize={0.14}
        color="#0EA5E9"
        anchorX="center"
        anchorY="middle"
        rotation={[0, -Math.PI / 2, 0]}
      >
        REAR (LOADING DOORS)
      </Text>
    </group>
  );
}

// ─── 3D SAFE STABILITY ENVELOPE (SWEET SPOT TARGET) ───────────────────────────
function StabilityEnvelope({ truck }: { truck: Truck }) {
  const minX = scaleVal(truck.length * 0.35);
  const maxX = scaleVal(truck.length * 0.65);
  const minY = 0;
  const maxY = scaleVal(truck.height * 0.4);
  const minZ = scaleVal(truck.width * 0.4);
  const maxZ = scaleVal(truck.width * 0.6);

  const envL = maxX - minX;
  const envH = maxY - minY;
  const envW = maxZ - minZ;

  return (
    <group position={[minX + envL / 2, minY + envH / 2, minZ + envW / 2]}>
      <mesh>
        <boxGeometry args={[envL, envH, envW]} />
        <meshStandardMaterial color="#22C55E" transparent opacity={0.12} roughness={0.9} />
      </mesh>
      <mesh>
        <boxGeometry args={[envL, envH, envW]} />
        <meshBasicMaterial color="#22C55E" wireframe transparent opacity={0.4} />
      </mesh>
      <Text
        position={[0, envH / 2 + 0.1, 0]}
        fontSize={0.08}
        color="#22C55E"
        anchorX="center"
        anchorY="bottom"
      >
        Safe CoG Target Zone
      </Text>
    </group>
  );
}

// ─── CENTER OF GRAVITY (CoG) 3D MARKER ────────────────────────────────────────
function CenterOfGravityMarker({
  cog,
  truck,
}: {
  cog: CenterOfGravity;
  truck: Truck;
}) {
  const markerRef = useRef<THREE.Group>(null);
  const posX = scaleVal(cog.x);
  const posY = Math.max(0.2, scaleVal(cog.y));
  const posZ = scaleVal(cog.z);

  const color =
    cog.status === 'OPTIMAL' ? '#22C55E' : cog.status === 'ACCEPTABLE' ? '#F59E0B' : '#EF4444';

  useFrame(({ clock }) => {
    if (markerRef.current) {
      const t = clock.getElapsedTime();
      markerRef.current.position.y = posY + Math.sin(t * 3) * 0.04;
    }
  });

  return (
    <group>
      <Line
        points={[
          [posX, 0, posZ],
          [posX, posY, posZ],
        ]}
        color={color}
        lineWidth={1.5}
        dashed
        dashScale={20}
      />
      <Line
        points={[
          [posX - 0.2, 0.02, posZ],
          [posX + 0.2, 0.02, posZ],
        ]}
        color={color}
        lineWidth={2}
      />
      <Line
        points={[
          [posX, 0.02, posZ - 0.2],
          [posX, 0.02, posZ + 0.2],
        ]}
        color={color}
        lineWidth={2}
      />

      <group ref={markerRef} position={[posX, posY, posZ]}>
        <Sphere args={[0.13, 16, 16]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.65}
            roughness={0.2}
          />
        </Sphere>
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.09}
          color="#FFFFFF"
          anchorX="center"
          anchorY="bottom"
        >
          CoG ({cog.normX}%, {cog.normZ}%)
        </Text>
      </group>
    </group>
  );
}

// ─── SINGLE PACKAGE BOX ──────────────────────────────────────────────────────
interface PackageBoxProps {
  placed: PlacedPackage;
  onClick: (id: string) => void;
  showLabels: boolean;
  colorMode: ColorMode;
  isLatestStep?: boolean;
  isCurrentUnloadingStop?: boolean;
}

function PackageBox({
  placed,
  onClick,
  showLabels,
  colorMode,
  isLatestStep,
  isCurrentUnloadingStop,
}: PackageBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { package: pkg, position, isSelected, isHighlighted } = placed;
  const rotY = position.rotationY === 90 ? Math.PI / 2 : 0;
  const dims =
    position.rotationY === 90
      ? { l: pkg.width, w: pkg.length, h: pkg.height }
      : { l: pkg.length, w: pkg.width, h: pkg.height };

  const L = scaleVal(dims.l);
  const W = scaleVal(dims.w);
  const H = scaleVal(dims.h);
  const color = getPackageColor(
    placed,
    isSelected || hovered || !!isLatestStep,
    isHighlighted,
    colorMode,
    isCurrentUnloadingStop
  );

  const px = scaleVal(position.x) + L / 2;
  const py = scaleVal(position.y) + H / 2;
  const pz = scaleVal(position.z) + W / 2;

  const isBlocked = placed.isBlockedForUnloading;
  const isHighDamageRisk = placed.damageRisk > 60;

  return (
    <group position={[px, py, pz]}>
      <mesh
        ref={meshRef}
        rotation={[0, rotY, 0]}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          onClick(pkg.id);
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        castShadow
      >
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.95 : isCurrentUnloadingStop ? 0.95 : isLatestStep ? 0.92 : 0.84}
          roughness={0.4}
          metalness={0.1}
          emissive={
            isSelected
              ? color
              : isHighDamageRisk && colorMode === 'RISK_HEATMAP'
                ? '#EF4444'
                : isCurrentUnloadingStop
                  ? '#F97316'
                  : isLatestStep
                    ? '#0EA5E9'
                    : '#000000'
          }
          emissiveIntensity={
            isSelected
              ? 0.2
              : isHighDamageRisk && colorMode === 'RISK_HEATMAP'
                ? 0.35
                : isCurrentUnloadingStop
                  ? 0.3
                  : isLatestStep
                    ? 0.15
                    : 0
          }
        />
      </mesh>
      <mesh rotation={[0, rotY, 0]}>
        <boxGeometry args={[L + 0.01, H + 0.01, W + 0.01]} />
        <meshBasicMaterial
          color={
            placed.isLocked
              ? '#F59E0B'
              : isBlocked
                ? '#EF4444'
                : isSelected
                  ? '#0EA5E9'
                  : isHighDamageRisk && colorMode === 'RISK_HEATMAP'
                    ? '#EF4444'
                    : isCurrentUnloadingStop
                      ? '#FB923C'
                      : isLatestStep
                        ? '#38BDF8'
                        : '#334155'
          }
          wireframe
        />
      </mesh>
      {showLabels && (
        <Text
          position={[0, H / 2 + 0.12, 0]}
          fontSize={0.09}
          color={placed.isLocked ? '#F59E0B' : '#F1F5F9'}
          anchorX="center"
          anchorY="bottom"
          maxWidth={0.85}
        >
          {placed.isLocked ? '🔒 ' : ''}
          {colorMode === 'RISK_HEATMAP'
            ? `Risk: ${placed.damageRisk}% · ${(pkg.digitalId || pkg.id).replace('CW-2026-', '')}`
            : colorMode === 'STOP'
              ? `Stop #${pkg.deliverySequence || 1} · ${(pkg.digitalId || pkg.id).replace('CW-2026-', '')}`
              : `${placed.loadingOrder ? `#${placed.loadingOrder} ` : ''}${(pkg.digitalId || pkg.id).replace('CW-2026-', '')}`}
        </Text>
      )}
    </group>
  );
}

// ─── GHOST PACKAGE ────────────────────────────────────────────────────────────
interface GhostPackageProps {
  position: PackagePosition;
  pkg: { length: number; width: number; height: number };
  isValid: boolean;
}

function GhostPackage({ position, pkg, isValid }: GhostPackageProps) {
  const dims =
    position.rotationY === 90
      ? { l: pkg.width, w: pkg.length, h: pkg.height }
      : { l: pkg.length, w: pkg.width, h: pkg.height };

  const L = scaleVal(dims.l);
  const W = scaleVal(dims.w);
  const H = scaleVal(dims.h);

  return (
    <mesh
      position={[
        scaleVal(position.x) + L / 2,
        scaleVal(position.y) + H / 2,
        scaleVal(position.z) + W / 2,
      ]}
    >
      <boxGeometry args={[L, H, W]} />
      <meshStandardMaterial
        color={isValid ? '#22C55E' : '#EF4444'}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

// ─── MAIN 3D VIEWER ──────────────────────────────────────────────────────────
export interface TruckViewerProps {
  truck: Truck;
  placedPackages: PlacedPackage[];
  onSelectPackage: (id: string | null) => void;
  selectedPackageId: string | null;
  highlightedPackageId: string | null;
  showLabels: boolean;
  showCoG?: boolean;
  showStabilityEnvelope?: boolean;
  colorMode?: ColorMode;
  playbackStep?: number | null;
  unloadingSimStop?: number | null;
  ghostPosition?: PackagePosition | null;
  ghostPackage?: { length: number; width: number; height: number } | null;
  ghostValid?: boolean;
}

function SceneContent({
  truck,
  placedPackages,
  onSelectPackage,
  selectedPackageId,
  highlightedPackageId,
  showLabels,
  showCoG = true,
  showStabilityEnvelope = false,
  colorMode = 'STOP',
  playbackStep = null,
  unloadingSimStop = null,
  ghostPosition,
  ghostPackage,
  ghostValid,
}: TruckViewerProps) {
  const L = scaleVal(truck.length);
  const W = scaleVal(truck.width);
  const H = scaleVal(truck.height);

  const visiblePackages = useMemo(() => {
    if (unloadingSimStop !== null && unloadingSimStop !== undefined) {
      return placedPackages.filter((p) => (p.package.deliverySequence || 1) >= unloadingSimStop);
    }
    if (playbackStep !== null && playbackStep !== undefined) {
      return placedPackages.filter((p) => (p.loadingOrder || 0) <= playbackStep);
    }
    return placedPackages;
  }, [placedPackages, playbackStep, unloadingSimStop]);

  const cog = useMemo(() => {
    return calculateCenterOfGravity(visiblePackages, truck);
  }, [visiblePackages, truck]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[L * 2, H * 3, W * 2]} intensity={1.2} castShadow />
      <directionalLight position={[-L, H * 2, -W]} intensity={0.45} />
      <pointLight position={[L / 2, H * 2, W / 2]} intensity={0.5} color="#0EA5E9" />

      <TruckContainer truck={truck} />

      {showStabilityEnvelope && <StabilityEnvelope truck={truck} />}

      {visiblePackages.map((p) => {
        const isCurrentUnloadingStop =
          unloadingSimStop !== null && (p.package.deliverySequence || 1) === unloadingSimStop;

        return (
          <PackageBox
            key={p.package.id}
            placed={{
              ...p,
              isSelected: p.package.id === selectedPackageId,
              isHighlighted: p.package.id === highlightedPackageId,
            }}
            onClick={onSelectPackage}
            showLabels={showLabels}
            colorMode={colorMode}
            isLatestStep={playbackStep !== null && p.loadingOrder === playbackStep}
            isCurrentUnloadingStop={isCurrentUnloadingStop}
          />
        );
      })}

      {showCoG && visiblePackages.length > 0 && (
        <CenterOfGravityMarker cog={cog} truck={truck} />
      )}

      {ghostPosition && ghostPackage && (
        <GhostPackage position={ghostPosition} pkg={ghostPackage} isValid={ghostValid ?? true} />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={35}
        target={[L / 2, H / 2, W / 2]}
      />
    </>
  );
}

export default function TruckViewer3D(props: TruckViewerProps) {
  const { truck, onSelectPackage } = props;
  const L = scaleVal(truck.length);
  const W = scaleVal(truck.width);
  const H = scaleVal(truck.height);

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{
          position: [L * 1.8, H * 2.4, W * 2.4],
          fov: 48,
          near: 0.1,
          far: 200,
        }}
        style={{ background: '#0F172A' }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName === 'CANVAS') {
            onSelectPackage(null);
          }
        }}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
