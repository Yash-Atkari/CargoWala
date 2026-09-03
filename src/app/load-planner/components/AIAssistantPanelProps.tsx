'use client';
import React, { useState } from 'react';
import {
  AIRecommendation,
  SpaceMetrics,
  WeightDistribution,
  LoadingStep,
  ConstraintStatus,
  OptimizationStrategy,
  RouteAccessibilityReport,
  VehicleStabilityAnalysis,
  ManifestDamageRiskReport,
  getStopColor,
} from '@/lib/loadingOptimizer';
import {
  Lightbulb,
  TrendingUp,
  Scale,
  ShieldAlert,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ListOrdered,
  Sparkles,
  MapPin,
  Route,
  Gauge,
  Activity,
  Shield,
  Info,
} from 'lucide-react';

interface AIAssistantPanelProps {
  recommendations: AIRecommendation[];
  metrics: SpaceMetrics;
  distribution: WeightDistribution;
  steps?: LoadingStep[];
  constraints?: ConstraintStatus;
  strategy?: OptimizationStrategy;
  unloadingReport?: RouteAccessibilityReport;
  stabilityAnalysis?: VehicleStabilityAnalysis;
  damageRiskReport?: ManifestDamageRiskReport;
  onApplyRecommendation: (rec: AIRecommendation) => void;
  onHighlightPackage: (id: string | null) => void;
  onSelectStep?: (stepNumber: number) => void;
  onSelectStop?: (stopNumber: number) => void;
  onOpenStabilityModal?: () => void;
  onOpenDamageModal?: () => void;
  currentPlaybackStep?: number | null;
  currentUnloadingStop?: number | null;
}

function ImpactBadge({ impact, type }: { impact: string; type: 'weight' | 'damage' }) {
  const colorMap: Record<string, string> = {
    POSITIVE: 'text-positive bg-positive/10 border-positive/20',
    NEUTRAL: 'text-muted-foreground bg-muted border-border',
    NEGATIVE: 'text-negative bg-negative/10 border-negative/20',
    REDUCES: 'text-positive bg-positive/10 border-positive/20',
    INCREASES: 'text-negative bg-negative/10 border-negative/20',
  };
  const labelMap: Record<string, string> = {
    POSITIVE: '↑ Axle Balance',
    NEUTRAL: '→ Neutral Balance',
    NEGATIVE: '↓ Axle Imbalance',
    REDUCES: '↓ Crushing Risk',
    INCREASES: '↑ Damage Risk',
  };
  return (
    <span
      className={`text-[10px] font-600 px-2 py-0.5 rounded-md border ${colorMap[impact] || 'text-muted-foreground bg-muted border-border'}`}
    >
      {labelMap[impact] || impact}
    </span>
  );
}

export default function AIAssistantPanel({
  recommendations,
  metrics,
  distribution,
  steps = [],
  constraints,
  strategy = 'BALANCED',
  unloadingReport,
  stabilityAnalysis,
  damageRiskReport,
  onApplyRecommendation,
  onHighlightPackage,
  onSelectStep,
  onSelectStop,
  onOpenStabilityModal,
  onOpenDamageModal,
  currentPlaybackStep,
  currentUnloadingStop,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'route' | 'steps' | 'constraints'>('route');

  const strategyLabels: Record<OptimizationStrategy, string> = {
    BALANCED: 'Balanced Logistics & Safety',
    SPACE_MAX: 'Maximum Space Density',
    FRAGILITY_FIRST: 'Zero Fragility Damage',
    LIFO_PRIORITY: 'Strict LIFO Delivery Sequence',
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/20">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-700 text-foreground flex items-center gap-1.5">
                AI Optimization Engine
                <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Live
                </span>
              </h3>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles size={11} className="text-primary flex-shrink-0" />
          Active Policy: <span className="text-foreground font-semibold">{strategyLabels[strategy]}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/30 p-1 gap-1">
        <button
          onClick={() => setActiveTab('route')}
          className={`flex-1 py-1.5 px-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'route'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Route size={12} />
          Route ({unloadingReport?.stops.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex-1 py-1.5 px-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'recommendations'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lightbulb size={12} />
          AI Tips ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={`flex-1 py-1.5 px-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'steps'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListOrdered size={12} />
          Steps ({steps.length})
        </button>
        <button
          onClick={() => setActiveTab('constraints')}
          className={`flex-1 py-1.5 px-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'constraints'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale size={12} />
          Checks
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {/* Quick metrics summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="card-elevated p-2.5 rounded-lg bg-card/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                Space Volume
              </span>
              <TrendingUp size={12} className="text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground font-tabular">
              {metrics.spaceUtilization}%
            </div>
            <div className="utilization-bar mt-1">
              <div
                className="utilization-fill"
                style={{
                  width: `${metrics.spaceUtilization}%`,
                  background:
                    metrics.spaceUtilization > 80
                      ? '#22C55E'
                      : metrics.spaceUtilization > 50
                        ? '#0EA5E9'
                        : '#F59E0B',
                }}
              />
            </div>
          </div>

          <div className="card-elevated p-2.5 rounded-lg bg-card/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                Payload Weight
              </span>
              <Scale size={12} className="text-accent" />
            </div>
            <div className="text-lg font-bold text-foreground font-tabular">
              {metrics.weightUtilization}%
            </div>
            <div className="utilization-bar mt-1">
              <div
                className="utilization-fill"
                style={{
                  width: `${metrics.weightUtilization}%`,
                  background:
                    metrics.weightUtilization > 90
                      ? '#EF4444'
                      : metrics.weightUtilization > 60
                        ? '#22C55E'
                        : '#0EA5E9',
                }}
              />
            </div>
          </div>
        </div>

        {/* Live Stability & Damage Risk Quick Badges */}
        <div className="grid grid-cols-2 gap-2">
          {stabilityAnalysis && (
            <div
              onClick={onOpenStabilityModal}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                stabilityAnalysis.isStable
                  ? 'bg-positive/5 border-positive/20 hover:bg-positive/10'
                  : 'bg-warning/5 border-warning/20 hover:bg-warning/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Gauge size={12} className="text-primary" />
                <span className="text-[9px] font-bold px-1 rounded bg-black/30 text-white">
                  {stabilityAnalysis.rolloverRiskLevel}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block">Rollover SRT</span>
              <span className="text-xs font-bold text-white font-mono">
                {stabilityAnalysis.staticRolloverThreshold}g
              </span>
            </div>
          )}

          {damageRiskReport && (
            <div
              onClick={onOpenDamageModal}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                damageRiskReport.overallRiskLevel === 'LOW'
                  ? 'bg-positive/5 border-positive/20 hover:bg-positive/10'
                  : 'bg-warning/5 border-warning/20 hover:bg-warning/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <ShieldAlert size={12} className="text-orange-400" />
                <span className="text-[9px] font-bold px-1 rounded bg-black/30 text-white">
                  {damageRiskReport.overallRiskLevel}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block">Damage Risk</span>
              <span className="text-xs font-bold text-white font-mono">
                {damageRiskReport.averageRiskScore}% avg
              </span>
            </div>
          )}
        </div>

        {/* TAB: ROUTE-AWARE MULTI-STOP PLAN */}
        {activeTab === 'route' && unloadingReport && (
          <div className="space-y-3">
            {/* Accessibility Score Card */}
            <div className="card-elevated p-3 rounded-xl border border-border bg-slate-950/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Route size={14} className="text-primary" />
                  LIFO Extraction Accessibility
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    unloadingReport.accessibilityScore === 100
                      ? 'bg-positive/10 text-positive'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {unloadingReport.accessibilityScore}% Direct
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal mb-2">
                {unloadingReport.totalBlockedParcels === 0
                  ? 'All packages for early stops are placed near the rear doors for immediate unloading.'
                  : `${unloadingReport.totalBlockedParcels} parcel(s) require shifting during route delivery.`}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
                <span>Total Delivery Stops: <strong className="text-white">{unloadingReport.totalStops}</strong></span>
                <span>Displacement Shifts: <strong className="text-white">{unloadingReport.totalShiftingMoves}</strong></span>
              </div>
            </div>

            {/* Multi-Stop Itinerary List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground block">
                Delivery Route Itinerary
              </span>
              {unloadingReport.stops.map((stop) => {
                const stopColor = getStopColor(stop.stopNumber);
                const isSelected = currentUnloadingStop === stop.stopNumber;

                return (
                  <div
                    key={`stop-${stop.stopNumber}`}
                    onClick={() => onSelectStop && onSelectStop(stop.stopNumber)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                        : 'border-border bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-sm"
                          style={{ background: stopColor }}
                        >
                          Stop #{stop.stopNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">
                          {stop.destination}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {stop.packageCount} pkgs ({stop.totalWeight}kg)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        Extraction Order: <strong>#{stop.extractionOrder}</strong>
                      </span>
                      {stop.isDirectlyAccessible ? (
                        <span className="text-positive font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> 100% Accessible
                        </span>
                      ) : (
                        <span className="text-warning font-semibold flex items-center gap-1">
                          <AlertTriangle size={11} /> {stop.blockedCount} Blocked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Diagnostics Warnings */}
            {unloadingReport.diagnostics.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-warning uppercase tracking-wider block">
                  Route Obstruction Diagnostics
                </span>
                {unloadingReport.diagnostics.map((d, i) => (
                  <div
                    key={`diag-${i}`}
                    className="p-2 rounded bg-warning/10 border border-warning/20 text-[10px] text-warning"
                  >
                    {d.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="card-elevated p-6 rounded-lg text-center border border-border">
                <CheckCircle2 size={24} className="text-positive mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-foreground">All Packages Optimized</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  All manifest items placed in accordance with route policy.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lightbulb size={13} className="text-warning" />
                  Recommended Staging
                </p>
                {recommendations.map((rec, idx) => (
                  <div
                    key={rec.packageId}
                    className="card-elevated rounded-xl p-3 border border-border hover:border-primary/50 transition-all cursor-pointer group bg-slate-950/30"
                    onMouseEnter={() => onHighlightPackage(rec.packageId)}
                    onMouseLeave={() => onHighlightPackage(null)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {rec.packageName}
                        </span>
                      </div>
                      <span className="text-[10px] text-positive font-bold px-1.5 py-0.5 rounded bg-positive/10 flex-shrink-0">
                        +{rec.utilizationImprovement}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                      {rec.reason}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                      <ImpactBadge impact={rec.weightBalanceImpact} type="weight" />
                      <ImpactBadge impact={rec.damageRiskImpact} type="damage" />
                    </div>

                    <button
                      onClick={() => onApplyRecommendation(rec)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm shadow-primary/20"
                    >
                      <ChevronRight size={14} />
                      Apply AI Recommendation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: STEP SEQUENCE */}
        {activeTab === 'steps' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground">
                Loading Sequence ({steps.length} steps)
              </span>
              <span className="text-[10px] text-muted-foreground">Order: Cab → Rear Doors</span>
            </div>

            {steps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No placed packages in loading sequence yet.
              </p>
            ) : (
              steps.map((step) => {
                const isActive = currentPlaybackStep === step.stepNumber;
                const stopColor = getStopColor(step.deliverySequence);

                return (
                  <div
                    key={`step-${step.stepNumber}`}
                    onClick={() => onSelectStep && onSelectStep(step.stepNumber)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                        : 'border-border bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {step.stepNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">
                          {step.packageName}
                        </span>
                      </div>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ background: stopColor }}
                      >
                        Stop #{step.deliverySequence}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-300 leading-normal mb-1.5">
                      {step.rationale}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-800/80 pt-1">
                      <span>Dest: {step.destination}</span>
                      <span>Vol: {step.cumulativeVolumePct}%</span>
                      <span className="text-primary font-mono">{step.dimensions}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: CONSTRAINTS */}
        {activeTab === 'constraints' && constraints && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-foreground block">
              Multi-Constraint Validation Checks
            </span>

            <div className="space-y-2">
              {[
                {
                  label: 'Volumetric Space Limit',
                  pass: constraints.volumeFit,
                  detail: `${metrics.spaceUtilization}% volume capacity utilized`,
                },
                {
                  label: 'Max Gross Payload Weight',
                  pass: constraints.weightLimit,
                  detail: `${metrics.totalWeight}kg of ${metrics.maxWeight}kg max load`,
                },
                {
                  label: 'Fragility & Anti-Crush Safety',
                  pass: constraints.fragilityStacking,
                  detail: 'Heavy items anchored below fragile parcels',
                },
                {
                  label: 'Damage Safety Compliance',
                  pass: constraints.damageSafetyCompliance,
                  detail: damageRiskReport
                    ? `${damageRiskReport.averageRiskScore}% avg damage risk · ${damageRiskReport.criticalRiskCount} critical`
                    : 'Zero crushing overload on fragile cargo',
                },
                {
                  label: 'LIFO Delivery Unloading Order',
                  pass: constraints.lifoSequence,
                  detail: 'Early stops positioned near rear loading doors',
                },
                {
                  label: 'Vehicle Stability & Rollover Compliance',
                  pass: constraints.stabilityCompliance,
                  detail: stabilityAnalysis
                    ? `SRT: ${stabilityAnalysis.staticRolloverThreshold}g (${stabilityAnalysis.rolloverRiskLevel})`
                    : 'Center of Gravity within safe envelope',
                },
                {
                  label: 'Physical 3D Support Stability',
                  pass: constraints.physicalSupport,
                  detail: 'Minimum 60% contact surface on floor or under-boxes',
                },
              ].map((c, i) => (
                <div
                  key={`constraint-${i}`}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    c.pass
                      ? 'bg-positive/5 border-positive/20 text-foreground'
                      : 'bg-negative/5 border-negative/20 text-foreground'
                  }`}
                >
                  {c.pass ? (
                    <CheckCircle2 size={15} className="text-positive flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={15} className="text-negative flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
