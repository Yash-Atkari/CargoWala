'use client';
import React from 'react';
import { AIRecommendation, SpaceMetrics, WeightDistribution } from '@/lib/loadingOptimizer';
import { Lightbulb, TrendingUp, Scale, ShieldAlert, ChevronRight, Zap } from 'lucide-react';

interface AIAssistantPanelProps {
  recommendations: AIRecommendation[];
  metrics: SpaceMetrics;
  distribution: WeightDistribution;
  onApplyRecommendation: (rec: AIRecommendation) => void;
  onHighlightPackage: (id: string | null) => void;
}

function ImpactBadge({ impact, type }: { impact: string; type: 'weight' | 'damage' }) {
  const colorMap: Record<string, string> = {
    POSITIVE: 'text-positive bg-positive/10',
    NEUTRAL: 'text-muted-foreground bg-muted',
    NEGATIVE: 'text-negative bg-negative/10',
    REDUCES: 'text-positive bg-positive/10',
    INCREASES: 'text-negative bg-negative/10',
  };
  const labelMap: Record<string, string> = {
    POSITIVE: '↑ Balance',
    NEUTRAL: '→ Neutral',
    NEGATIVE: '↓ Balance',
    REDUCES: '↓ Risk',
    INCREASES: '↑ Risk',
  };
  return (
    <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${colorMap[impact] || 'text-muted-foreground bg-muted'}`}>
      {labelMap[impact] || impact}
    </span>
  );
}

export default function AIAssistantPanel({
  recommendations, metrics, distribution, onApplyRecommendation, onHighlightPackage,
}: AIAssistantPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-600 text-foreground">AI Loading Assistant</h3>
          <p className="text-[10px] text-muted-foreground">Explainable optimization recommendations</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {/* Quick metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="card-elevated p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Space Used</span>
            </div>
            <div className="text-lg font-700 text-foreground font-tabular">{metrics.spaceUtilization}%</div>
            <div className="utilization-bar mt-1">
              <div
                className="utilization-fill"
                style={{
                  width: `${metrics.spaceUtilization}%`,
                  background: metrics.spaceUtilization > 80 ? '#22C55E' : metrics.spaceUtilization > 50 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
          </div>
          <div className="card-elevated p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Scale size={12} className="text-accent" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Weight Used</span>
            </div>
            <div className="text-lg font-700 text-foreground font-tabular">{metrics.weightUtilization}%</div>
            <div className="utilization-bar mt-1">
              <div
                className="utilization-fill"
                style={{
                  width: `${metrics.weightUtilization}%`,
                  background: metrics.weightUtilization > 90 ? '#EF4444' : metrics.weightUtilization > 60 ? '#22C55E' : '#F59E0B',
                }}
              />
            </div>
          </div>
        </div>

        {/* Weight distribution */}
        <div className="card-elevated p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-600 text-foreground">Weight Distribution</span>
            <span className={`status-badge text-[10px] ${distribution.isBalanced ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
              {distribution.isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
          {/* Front/Center/Rear */}
          <div className="flex gap-1 mb-2">
            {[
              { label: 'Front', val: distribution.front },
              { label: 'Center', val: distribution.center },
              { label: 'Rear', val: distribution.rear },
            ].map((z) => (
              <div key={z.label} className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">{z.label}</div>
                <div
                  className="h-1.5 rounded-full mx-auto"
                  style={{
                    width: '100%',
                    background: `linear-gradient(90deg, #0EA5E9 ${z.val}%, #1E293B ${z.val}%)`,
                  }}
                />
                <div className="text-[10px] font-600 text-foreground mt-0.5">{z.val}%</div>
              </div>
            ))}
          </div>
          {/* Left/Right */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">L/R:</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${distribution.left}%` }}
              />
            </div>
            <span className="text-foreground font-600">{distribution.left}% / {distribution.right}%</span>
          </div>
          {distribution.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 mt-2 p-2 bg-warning/10 rounded-lg border border-warning/20">
              <ShieldAlert size={11} className="text-warning flex-shrink-0 mt-0.5" />
              <span className="text-[10px] text-warning">{w}</span>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={13} className="text-warning" />
            <span className="text-xs font-600 text-foreground">Next Best Packages to Load</span>
          </div>

          {recommendations.length === 0 ? (
            <div className="card-elevated p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">All packages placed or no packages available.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.packageId}
                  className="card-elevated rounded-lg p-3 border border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onMouseEnter={() => onHighlightPackage(rec.packageId)}
                  onMouseLeave={() => onHighlightPackage(null)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[10px] font-700 text-white flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-600 text-foreground truncate">{rec.packageName}</span>
                    </div>
                    <span className="text-[10px] text-positive font-600 flex-shrink-0">+{rec.utilizationImprovement}%</span>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{rec.reason}</p>

                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Orient:</span>
                    <span className="text-[10px] text-foreground">{rec.suggestedOrientation}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <ImpactBadge impact={rec.weightBalanceImpact} type="weight" />
                    <ImpactBadge impact={rec.damageRiskImpact} type="damage" />
                  </div>

                  <button
                    onClick={() => onApplyRecommendation(rec)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-600 transition-colors"
                  >
                    <ChevronRight size={12} />
                    Apply Recommendation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
