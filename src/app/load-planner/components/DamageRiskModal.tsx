'use client';
import React from 'react';
import { ManifestDamageRiskReport, PackageDamageAnalysis } from '@/lib/loadingOptimizer';
import { Truck } from '@/lib/types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  X,
  Layers,
  Activity,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface DamageRiskModalProps {
  damageReport: ManifestDamageRiskReport;
  truck: Truck;
  onClose: () => void;
  onMitigateRisk: () => void;
  onSelectPackage?: (id: string) => void;
}

export default function DamageRiskModal({
  damageReport,
  truck,
  onClose,
  onMitigateRisk,
  onSelectPackage,
}: DamageRiskModalProps) {
  const riskColor =
    damageReport.overallRiskLevel === 'LOW'
      ? 'text-positive'
      : damageReport.overallRiskLevel === 'MODERATE'
        ? 'text-warning'
        : 'text-negative';

  const riskBg =
    damageReport.overallRiskLevel === 'LOW'
      ? 'bg-positive/10 border-positive/30'
      : damageReport.overallRiskLevel === 'MODERATE'
        ? 'bg-warning/10 border-warning/30'
        : 'bg-negative/10 border-negative/30';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Damage Risk Prediction & Analytics
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBg} ${riskColor}`}>
                  {damageReport.overallRiskLevel} RISK PROFILE
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicle: <strong className="text-foreground">{truck.registrationNumber}</strong> · Multi-Factor Physics Engine
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
          {/* Top Hero: Average Risk Gauge & Risk Distribution Breakdown */}
          <div className="card-elevated p-5 rounded-2xl border border-border bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-primary" />
                  Manifest Damage Probability
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-extrabold font-mono ${riskColor}`}>
                    {damageReport.averageRiskScore}%
                  </span>
                  <span className="text-xs text-slate-400">
                    average damage probability (Peak: {damageReport.maxRiskScore}%)
                  </span>
                </div>
              </div>

              {/* Counts Badge */}
              <div className="flex gap-2">
                <div className="text-center bg-positive/10 border border-positive/20 px-2.5 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-positive block">{damageReport.lowRiskCount}</span>
                  <span className="text-[9px] text-slate-400">Safe</span>
                </div>
                <div className="text-center bg-warning/10 border border-warning/20 px-2.5 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-warning block">{damageReport.moderateRiskCount}</span>
                  <span className="text-[9px] text-slate-400">Moderate</span>
                </div>
                <div className="text-center bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-orange-400 block">{damageReport.highRiskCount}</span>
                  <span className="text-[9px] text-slate-400">High</span>
                </div>
                <div className="text-center bg-negative/10 border border-negative/20 px-2.5 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-negative block">{damageReport.criticalRiskCount}</span>
                  <span className="text-[9px] text-slate-400">Critical</span>
                </div>
              </div>
            </div>

            {/* Risk Spectrum Meter */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(damageReport.lowRiskCount / (damageReport.totalPackages || 1)) * 100}%` }}
                  title="Safe / Low Risk"
                />
                <div
                  className="bg-yellow-500 h-full transition-all"
                  style={{ width: `${(damageReport.moderateRiskCount / (damageReport.totalPackages || 1)) * 100}%` }}
                  title="Moderate Risk"
                />
                <div
                  className="bg-orange-500 h-full transition-all"
                  style={{ width: `${(damageReport.highRiskCount / (damageReport.totalPackages || 1)) * 100}%` }}
                  title="High Risk"
                />
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{ width: `${(damageReport.criticalRiskCount / (damageReport.totalPackages || 1)) * 100}%` }}
                  title="Critical Risk"
                />
              </div>
            </div>
          </div>

          {/* 4-Factor Risk Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card-elevated p-3 rounded-xl border border-border bg-slate-950/30">
              <span className="text-[10px] text-slate-400 block font-semibold">Crush & Stacking</span>
              <div className="text-base font-bold text-white font-mono mt-1">
                {damageReport.averageCrushRisk}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${damageReport.averageCrushRisk}%` }}
                />
              </div>
            </div>

            <div className="card-elevated p-3 rounded-xl border border-border bg-slate-950/30">
              <span className="text-[10px] text-slate-400 block font-semibold">Vibration & Pitch</span>
              <div className="text-base font-bold text-white font-mono mt-1">
                {damageReport.averageVibrationRisk}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-orange-400 h-full"
                  style={{ width: `${damageReport.averageVibrationRisk}%` }}
                />
              </div>
            </div>

            <div className="card-elevated p-3 rounded-xl border border-border bg-slate-950/30">
              <span className="text-[10px] text-slate-400 block font-semibold">Lateral Shift & Tilt</span>
              <div className="text-base font-bold text-white font-mono mt-1">
                {damageReport.averageLateralShiftRisk}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full"
                  style={{ width: `${damageReport.averageLateralShiftRisk}%` }}
                />
              </div>
            </div>

            <div className="card-elevated p-3 rounded-xl border border-border bg-slate-950/30">
              <span className="text-[10px] text-slate-400 block font-semibold">Contact Incompatibility</span>
              <div className="text-base font-bold text-white font-mono mt-1">
                {damageReport.averageIncompatibilityRisk}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-400 h-full"
                  style={{ width: `${damageReport.averageIncompatibilityRisk}%` }}
                />
              </div>
            </div>
          </div>

          {/* High-Risk Packages Diagnostic Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                High-Risk & Fragile Cargo Analysis ({damageReport.highRiskPackages.length})
              </span>
              <span className="text-[10px] text-slate-400">Click parcel to highlight in 3D</span>
            </div>

            {damageReport.highRiskPackages.length === 0 ? (
              <div className="p-4 rounded-xl bg-positive/10 border border-positive/20 text-xs text-positive flex items-center gap-2">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>Zero high-risk items detected — all fragile packages are securely cushioned on safe tiers.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {damageReport.highRiskPackages.map((p) => (
                  <div
                    key={`high-risk-${p.packageId}`}
                    onClick={() => onSelectPackage && onSelectPackage(p.packageId)}
                    className="p-3 rounded-xl border border-border bg-slate-950/40 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{p.packageName}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{p.digitalId}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.riskLevel === 'CRITICAL'
                            ? 'bg-negative/20 text-negative'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {p.riskScore}% {p.riskLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 my-1 bg-slate-900/60 p-1.5 rounded-lg">
                      <span>Fragility: <strong className="text-white">{p.fragilityLevel}</strong></span>
                      <span>Weight Above: <strong className="text-white">{p.weightAboveKg}kg</strong></span>
                      <span>Pressure: <strong className="text-white">{p.compressionPressure} kg/cm²</strong></span>
                    </div>

                    <p className="text-[10px] text-orange-400 leading-normal mt-1 flex items-start gap-1">
                      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                      <span>{p.contributingFactors[0]}</span>
                    </p>
                  </div>
                ))}
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
                onMitigateRisk();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl gradient-primary text-sm font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Zap size={16} />
              Apply Fragility-First Auto-Mitigation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
