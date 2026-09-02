'use client';
import React from 'react';
import { LoadingReport } from '@/lib/loadingOptimizer';
import { CheckCircle2, Package, Shield, ChevronRight, BarChart3, X } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-700 text-foreground">Loading Report</h2>
              <p className="text-xs text-muted-foreground">
                {shipmentId} · {truckRegistration}
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
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <Package size={20} className="text-primary" />
            <div>
              <p className="text-sm font-600 text-foreground">
                {report.loadedPackages} / {report.totalPackages} packages loaded
              </p>
              {report.loadedPackages < report.totalPackages && (
                <p className="text-xs text-warning">
                  {report.totalPackages - report.loadedPackages} package(s) could not be placed
                </p>
              )}
            </div>
          </div>

          {/* Score rings */}
          <div>
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-3">
              Performance Scores
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <ScoreRing value={report.spaceUtilization} label="Space Util." color="#0EA5E9" />
              <ScoreRing value={report.weightUtilization} label="Weight Util." color="#F97316" />
              <ScoreRing value={report.balanceScore} label="Balance" color={balColor} />
              <ScoreRing value={report.loadingEfficiency} label="Efficiency" color={effColor} />
            </div>
          </div>

          {/* Damage risk */}
          <div className="card-elevated p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <span className="text-xs font-600 text-foreground">Avg. Damage Risk Score</span>
              </div>
              <span
                className={`text-sm font-700 ${
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
            <p className="text-[10px] text-muted-foreground mt-1">
              {report.damageRiskScore <= 30
                ? 'Excellent — low risk configuration'
                : report.damageRiskScore <= 60
                  ? 'Moderate risk — review fragile package placements'
                  : 'High risk — consider rearranging fragile packages'}
            </p>
          </div>

          {/* Weight distribution */}
          <div className="card-elevated p-3 rounded-xl">
            <h3 className="text-xs font-600 text-foreground mb-2">Weight Distribution</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: 'Front', val: report.weightDistribution.front },
                { label: 'Center', val: report.weightDistribution.center },
                { label: 'Rear', val: report.weightDistribution.rear },
              ].map((z) => (
                <div key={z.label} className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="text-[10px] text-muted-foreground">{z.label}</div>
                  <div className="text-sm font-700 text-foreground">{z.val}%</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Left / Right:</span>
              <span className="font-600 text-foreground">
                {report.weightDistribution.left}% / {report.weightDistribution.right}%
              </span>
              <span
                className={`ml-auto status-badge text-[9px] ${report.weightDistribution.isBalanced ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}
              >
                {report.weightDistribution.isBalanced ? 'Balanced' : 'Unbalanced'}
              </span>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">
              Recommendations
            </h3>
            <div className="space-y-1.5">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-lg">
                  <ChevronRight size={12} className="text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-600 text-muted-foreground hover:bg-muted transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl gradient-primary text-sm font-600 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={15} />
                Confirm Loading
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
