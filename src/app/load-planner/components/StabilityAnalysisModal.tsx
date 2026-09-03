'use client';
import React from 'react';
import { VehicleStabilityAnalysis } from '@/lib/loadingOptimizer';
import { Truck } from '@/lib/types';
import {
  Scale,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Zap,
  X,
  Gauge,
  Activity,
  ArrowRight,
  TrendingDown,
  Anchor,
} from 'lucide-react';

interface StabilityAnalysisModalProps {
  stability: VehicleStabilityAnalysis;
  truck: Truck;
  onClose: () => void;
  onAutoBalance: () => void;
}

export default function StabilityAnalysisModal({
  stability,
  truck,
  onClose,
  onAutoBalance,
}: StabilityAnalysisModalProps) {
  const riskColor =
    stability.rolloverRiskLevel === 'OPTIMAL'
      ? 'text-positive'
      : stability.rolloverRiskLevel === 'MODERATE'
        ? 'text-warning'
        : 'text-negative';

  const riskBg =
    stability.rolloverRiskLevel === 'OPTIMAL'
      ? 'bg-positive/10 border-positive/30'
      : stability.rolloverRiskLevel === 'MODERATE'
        ? 'bg-warning/10 border-warning/30'
        : 'bg-negative/10 border-negative/30';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Scale size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Center of Gravity & Stability Analysis
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBg} ${riskColor}`}>
                  {stability.rolloverRiskLevel} STABILITY
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicle: <strong className="text-foreground">{truck.registrationNumber}</strong> · Safety Standard ISO 16333
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Hero: Static Rollover Threshold (SRT) Gauge */}
          <div className="card-elevated p-5 rounded-2xl border border-border bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge size={14} className="text-primary" />
                  Static Rollover Threshold (SRT)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-extrabold font-mono ${riskColor}`}>
                    {stability.staticRolloverThreshold}g
                  </span>
                  <span className="text-xs text-slate-400">lateral acceleration resistance</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Overall Stability Rating</span>
                <span className="text-2xl font-extrabold text-white font-tabular">
                  {stability.stabilityScore}/100
                </span>
              </div>
            </div>

            {/* SRT Spectrum Meter */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div className="bg-red-500 h-full w-[28%]" title="Critical Risk (<0.28g)" />
                <div className="bg-orange-500 h-full w-[22%]" title="High Risk (0.28 - 0.35g)" />
                <div className="bg-yellow-500 h-full w-[20%]" title="Moderate Risk (0.35 - 0.42g)" />
                <div className="bg-green-500 h-full w-[30%]" title="Optimal Stability (>=0.42g)" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                <span>0.20g (Danger)</span>
                <span>0.30g</span>
                <span>0.40g (Safe Target)</span>
                <span>0.60g+</span>
              </div>
            </div>
          </div>

          {/* 2-Column: Axle Load & Center of Mass Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front vs Rear Axle Balance */}
            <div className="card-elevated p-4 rounded-xl border border-border bg-slate-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Activity size={14} className="text-primary" />
                  Axle Weight Distribution
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    stability.steerAxleSafe && stability.driveAxleSafe
                      ? 'bg-positive/10 text-positive'
                      : 'bg-negative/10 text-negative'
                  }`}
                >
                  {stability.steerAxleSafe && stability.driveAxleSafe ? 'Within Limits' : 'Imbalanced'}
                </span>
              </div>

              {/* Steer Axle */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Front Steer Axle:</span>
                  <span className="font-bold text-white font-mono">
                    {stability.steerAxleKg.toLocaleString()}kg ({stability.steerAxlePct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, stability.steerAxlePct)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block">Target: 25% – 50% for steering control</span>
              </div>

              {/* Drive Axle */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Rear Drive Axle:</span>
                  <span className="font-bold text-white font-mono">
                    {stability.driveAxleKg.toLocaleString()}kg ({stability.driveAxlePct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, stability.driveAxlePct)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block">Target: 50% – 75% max load</span>
              </div>
            </div>

            {/* Lateral & Vertical Center of Mass */}
            <div className="card-elevated p-4 rounded-xl border border-border bg-slate-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Anchor size={14} className="text-accent" />
                  Center of Mass Coordinates
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  X:{stability.longitudinalCoGPct}% Y:{stability.verticalCoGPct}% Z:{stability.lateralCoGPct}%
                </span>
              </div>

              {/* Lateral Tilt */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Lateral Roll Angle:</span>
                <span className={`font-bold ${stability.lateralTiltAngle > 3 ? 'text-negative' : 'text-positive'}`}>
                  {stability.lateralTiltAngle}° tilt
                </span>
              </div>

              {/* Vertical Height */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Vertical CoG Elevation:</span>
                  <span className={`font-bold ${stability.verticalCoGPct > 45 ? 'text-warning' : 'text-positive'}`}>
                    {stability.verticalCoGPct}% height
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full"
                    style={{ width: `${stability.verticalCoGPct}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block">Lower is safer (sweet spot &lt; 40%)</span>
              </div>

              {/* Top Tiers Heavy */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-850">
                <span className="text-slate-400">Heavy Boxes on Top Tiers:</span>
                <span className={`font-bold ${stability.topTiersHeavyCount > 0 ? 'text-warning' : 'text-positive'}`}>
                  {stability.topTiersHeavyCount} parcel(s)
                </span>
              </div>
            </div>
          </div>

          {/* Critical Warnings / Recommendations */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">
              Safety Analysis & Dynamics Feedback
            </span>
            {stability.criticalWarnings.length > 0 ? (
              <div className="space-y-1.5">
                {stability.criticalWarnings.map((w, i) => (
                  <div
                    key={`warn-${i}`}
                    className="p-3 rounded-xl bg-negative/10 border border-negative/20 text-xs text-negative flex items-start gap-2"
                  >
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-positive/10 border border-positive/20 text-xs text-positive flex items-center gap-2">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>All vehicle dynamics, axle weight limits, and rollover thresholds are fully compliant.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Close Inspector
            </button>
            <button
              onClick={() => {
                onAutoBalance();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl gradient-primary text-sm font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Zap size={16} />
              Apply AI Auto-Balance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
