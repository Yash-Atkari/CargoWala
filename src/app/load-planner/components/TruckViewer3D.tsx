'use client';
import React, { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { PlacedPackage, PackagePosition } from '@/lib/loadingOptimizer';
import { MockTruck } from '@/lib/mockData';

// ─── SCALE FACTOR: cm → scene units (1 unit = 50cm) ─────────────────────────
const SCALE = 1 / 50;

function scaleVal(cm: number) {
  return cm * SCALE;
}

// ─── PACKAGE COLORS ──────────────────────────────────────────────────────────
function getPackageColor(pkg: PlacedPackage, isSelected: boolean, isHighlighted: boolean): string {
  if (isSelected) return '#0EA5E9';
  if (isHighlighted) return '#F97316';
  if (pkg.damageRisk > 60) return '#EF4444';
  if (pkg.damageRisk > 30) return '#F59E0B';
  const fragMap: Record<string, string> = {
    LOW: '#22C55E',
    MEDIUM: '#A78BFA',
    HIGH: '#F97316',
    FRAGILE: '#EF4444',
  };
  return fragMap[pkg.package.fragilityLevel] || '#64748B';
}

// ─── TRUCK CONTAINER ─────────────────────────────────────────────────────────
function TruckContainer({ truck }: { truck: MockTruck }) {
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
        <meshStandardMaterial color="#334155" transparent opacity={0.5} roughness={0.9} />
      </mesh>
      {/* Right wall */}
      <mesh position={[L / 2, H / 2, W + wallThickness / 2]}>
        <boxGeometry args={[L, H, wallThickness]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.5} roughness={0.9} />
      </mesh>
      {/* Front wall (cab side) */}
      <mesh position={[-wallThickness / 2, H / 2, W / 2]}>
        <boxGeometry args={[wallThickness, H, W]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.6} roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[L / 2, H + wallThickness / 2, W / 2]}>
        <boxGeometry args={[L, wallThickness, W]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.3} roughness={0.9} />
      </mesh>
      {/* Rear opening indicator */}
      <mesh position={[L + wallThickness / 2, H / 2, W / 2]}>
        <boxGeometry args={[wallThickness, H, W]} />
        <meshStandardMaterial color="#0EA5E9" transparent opacity={0.15} roughness={0.9} />
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
        fontSize={0.18}
        color="#64748B"
        anchorX="center"
        anchorY="middle"
      >
        {`Length: ${truck.length}cm`}
      </Text>
      <Text
        position={[L + 0.3, H / 2, W / 2]}
        fontSize={0.15}
        color="#0EA5E9"
        anchorX="center"
        anchorY="middle"
        rotation={[0, -Math.PI / 2, 0]}
      >
        REAR (LOADING)
      </Text>
    </group>
  );
}

// ─── SINGLE PACKAGE BOX ──────────────────────────────────────────────────────
interface PackageBoxProps {
  placed: PlacedPackage;
  onClick: (id: string) => void;
  showLabels: boolean;
}

function PackageBox({ placed, onClick, showLabels }: PackageBoxProps) {
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
  const color = getPackageColor(placed, isSelected || hovered, isHighlighted);

  const px = scaleVal(position.x) + L / 2;
  const py = scaleVal(position.y) + H / 2;
  const pz = scaleVal(position.z) + W / 2;

  useFrame(() => {
    if (meshRef.current && (isSelected || isHighlighted)) {
      meshRef.current.rotation.y = rotY;
    }
  });

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
          opacity={isSelected ? 0.95 : 0.82}
          roughness={0.4}
          metalness={0.1}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
      {/* Wireframe outline */}
      <mesh rotation={[0, rotY, 0]}>
        <boxGeometry args={[L + 0.01, H + 0.01, W + 0.01]} />
        <meshBasicMaterial color={isSelected ? '#0EA5E9' : '#334155'} wireframe />
      </mesh>
      {/* Label */}
      {showLabels && (
        <Text
          position={[0, H / 2 + 0.12, 0]}
          fontSize={0.1}
          color="#F1F5F9"
          anchorX="center"
          anchorY="bottom"
          maxWidth={0.8}
        >
          {pkg.digitalId.replace('CW-2026-', '')}
        </Text>
      )}
    </group>
  );
}

// ─── GHOST PACKAGE (placement preview) ───────────────────────────────────────
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
        wireframe={false}
      />
    </mesh>
  );
}

// ─── MAIN 3D VIEWER ──────────────────────────────────────────────────────────
interface TruckViewerProps {
  truck: MockTruck;
  placedPackages: PlacedPackage[];
  onSelectPackage: (id: string | null) => void;
  selectedPackageId: string | null;
  highlightedPackageId: string | null;
  showLabels: boolean;
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
  ghostPosition,
  ghostPackage,
  ghostValid,
}: TruckViewerProps) {
  const L = scaleVal(truck.length);
  const W = scaleVal(truck.width);
  const H = scaleVal(truck.height);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[L * 2, H * 3, W * 2]} intensity={1.2} castShadow />
      <directionalLight position={[-L, H * 2, -W]} intensity={0.4} />
      <pointLight position={[L / 2, H * 2, W / 2]} intensity={0.5} color="#0EA5E9" />

      <TruckContainer truck={truck} />

      {placedPackages.map((p) => (
        <PackageBox
          key={p.package.id}
          placed={{
            ...p,
            isSelected: p.package.id === selectedPackageId,
            isHighlighted: p.package.id === highlightedPackageId,
          }}
          onClick={onSelectPackage}
          showLabels={showLabels}
        />
      ))}

      {ghostPosition && ghostPackage && (
        <GhostPackage position={ghostPosition} pkg={ghostPackage} isValid={ghostValid ?? true} />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={30}
        target={[L / 2, H / 2, W / 2]}
      />
    </>
  );
}

export default function TruckViewer3D({
  truck,
  placedPackages,
  onSelectPackage,
  selectedPackageId,
  highlightedPackageId,
  showLabels,
  ghostPosition,
  ghostPackage,
  ghostValid,
}: TruckViewerProps) {
  const L = scaleVal(truck.length);
  const W = scaleVal(truck.width);
  const H = scaleVal(truck.height);

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [L * 1.8, H * 2.5, W * 2.5],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        style={{ background: '#0F172A' }}
        onClick={(e) => {
          // Deselect on background click
          if ((e.target as HTMLElement).tagName === 'CANVAS') {
            onSelectPackage(null);
          }
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            truck={truck}
            placedPackages={placedPackages}
            onSelectPackage={onSelectPackage}
            selectedPackageId={selectedPackageId}
            highlightedPackageId={highlightedPackageId}
            showLabels={showLabels}
            ghostPosition={ghostPosition}
            ghostPackage={ghostPackage}
            ghostValid={ghostValid}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
