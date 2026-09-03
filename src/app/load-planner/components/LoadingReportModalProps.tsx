'use client';
import React from 'react';
import { LoadingReport } from '@/lib/loadingOptimizer';
import { CheckCircle2, Package, Shield, ChevronRight, BarChart3, X, AlertTriangle, Sparkles, Gauge } from 'lucide-react';

interface LoadingReportModalProps {
  report: LoadingReport;
  shipmentId: string;
  truckRegistration: string;
  onClose: () => void;
  onConfirm: () => void;
  isReadOnly?: boolean;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#334155" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-700 text-foreground">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export default function LoadingReportModal({
  report,
  shipmentId,
  truckRegistration,
  onClose,
  onConfirm,
  isReadOnly = false,
}: LoadingReportModalProps) {
  const effColor =
    report.loadingEfficiency >= 75
      ? '#22C55E'
      : report.loadingEfficiency >= 50
        ? '#F59E0B'
        : '#EF4444';
  const balColor =
    report.balanceScore >= 75 ? '#22C55E' : report.balanceScore >= 50 ? '#F59E0B' : '#EF4444';
  const riskColor =
    report.damageRiskScore <= 30 ? '#22C55E' : report.damageRiskScore <= 60 ? '#F59E0B' : '#EF4444';

  const strategyLabels: Record<string, string> = {
    BALANCED: 'Balanced Safety & Stability Policy',
    SPACE_MAX: 'Space Maximizer Policy',
    FRAGILITY_FIRST: 'Fragility & Safety Policy',
    LIFO_PRIORITY: 'LIFO Sequence Policy',
  };

  const stability = report.stabilityAnalysis;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-700 text-foreground">AI Loading & Stability Report</h2>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                  {strategyLabels[report.strategy] || report.strategy}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Shipment {shipmentId} · Vehicle {truckRegistration}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Package summary */}
          <div className="flex items-center justify-between p-3.5 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-700 text-foreground">
                  {report.loadedPackages} / {report.totalPackages} packages optimized
                </p>
                {report.loadedPackages < report.totalPackages ? (
                  <p className="text-xs text-warning">
                    {report.totalPackages - report.loadedPackages} package(s) exceed capacity limits
                  </p>
                ) : (
                  <p className="text-xs text-positive">
                    100% manifest cargo accommodated
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
              {report.steps.length} Steps
            </span>
          </div>

          {/* Performance score rings */}
          <div>
            <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">
              Performance Scores
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <ScoreRing value={report.spaceUtilization} label="Space Util." color="#0EA5E9" />
              <ScoreRing value={report.weightUtilization} label="Weight Util." color="#F97316" />
              <ScoreRing value={report.balanceScore} label="Balance" color={balColor} />
              <ScoreRing value={report.loadingEfficiency} label="Efficiency" color={effColor} />
            </div>
          </div>

          {/* Static Rollover Threshold (SRT) & Stability */}
          {stability && (
            <div className="card-elevated p-3.5 rounded-xl border border-border space-y-2 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={14} className="text-emerald-400" />
                  <h3 className="text-xs font-700 text-foreground">Static Rollover Threshold (SRT)</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    stability.rolloverRiskLevel === 'OPTIMAL'
                      ? 'bg-positive/10 text-positive'
                      : stability.rolloverRiskLevel === 'MODERATE'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-negative/10 text-negative'
                  }`}
                >
                  {stability.staticRolloverThreshold}g ({stability.rolloverRiskLevel})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                <div>
                  Steer Axle: <strong className="text-white">{stability.steerAxlePct}% ({stability.steerAxleKg}kg)</strong>
                </div>
                <div>
                  Drive Axle: <strong className="text-white">{stability.driveAxlePct}% ({stability.driveAxleKg}kg)</strong>
                </div>
              </div>
            </div>
          )}

          {/* Damage risk */}
          <div className="card-elevated p-3.5 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                <span className="text-xs font-700 text-foreground">Average Damage Risk Score</span>
              </div>
              <span
                className={`text-sm font-bold ${
                  report.damageRiskScore <= 30
                    ? 'text-positive'
                    : report.damageRiskScore <= 60
                      ? 'text-warning'
                      : 'text-negative'
                }`}
              >
                {report.damageRiskScore}/100
              </span>
            </div>
            <div className="utilization-bar">
              <div
                className="utilization-fill"
                style={{ width: `${report.damageRiskScore}%`, background: riskColor }}
              />
            </div>
          </div>

          {/* Constraint Health Check */}
          {report.constraints && (
            <div className="card-elevated p-3.5 rounded-xl border border-border space-y-2">
              <h3 className="text-xs font-700 text-foreground">Constraint Compliance Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className={report.constraints.volumeFit ? 'text-positive' : 'text-negative'} />
                  <span>Volumetric Capacity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className={report.constraints.weightLimit ? 'text-positive' : 'text-negative'} />
                  <span>Payload Limit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className={report.constraints.stabilityCompliance ? 'text-positive' : 'text-negative'} />
                  <span>Rollover & CoG Safety</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className={report.constraints.physicalSupport ? 'text-positive' : 'text-negative'} />
                  <span>Base Support Stability</span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">
              Optimization Insights
            </h3>
            <div className="space-y-1.5">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg border border-border text-xs">
                  <ChevronRight size={13} className="text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground leading-normal">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Back to 3D Planner
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <CheckCircle2 size={16} />
                Confirm & Save Manifest
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
