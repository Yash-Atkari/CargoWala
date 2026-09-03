'use client';
import React, { useState } from 'react';
import { LogisticsAlert, AlertSeverity } from '@/lib/alertsEngine';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  X,
  Zap,
  ArrowRight,
  Filter,
  Layers,
  Activity,
  Trash2,
} from 'lucide-react';

interface AlertsNotificationModalProps {
  alerts: LogisticsAlert[];
  onClose: () => void;
  onAction?: (actionType: string) => void;
  onClearAll?: () => void;
}

export default function AlertsNotificationModal({
  alerts,
  onClose,
  onAction,
  onClearAll,
}: AlertsNotificationModalProps) {
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto scrollbar-thin animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Alerts & Exception Management
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Feature 11
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-Time Anomaly Detection across Fleet & Cargo Operations
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

        {/* Severity Badges & Filter Bar */}
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterSeverity === 'ALL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filterSeverity === 'CRITICAL'
                  ? 'bg-negative text-white shadow-sm'
                  : 'text-negative hover:bg-negative/10'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filterSeverity === 'WARNING'
                  ? 'bg-warning text-slate-900 shadow-sm'
                  : 'text-warning hover:bg-warning/10'
              }`}
            >
              Warnings ({warningCount})
            </button>
          </div>

          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Trash2 size={12} />
              Clear Log
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="p-5 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 size={32} className="text-positive mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold text-foreground">Zero Active Exceptions</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                All vehicles, loads, and route deliveries are running smoothly.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all space-y-2 ${
                  alert.severity === 'CRITICAL'
                    ? 'border-negative/30 bg-negative/5'
                    : alert.severity === 'WARNING'
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border bg-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {alert.severity === 'CRITICAL' ? (
                      <ShieldAlert size={16} className="text-negative flex-shrink-0" />
                    ) : alert.severity === 'WARNING' ? (
                      <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                    ) : (
                      <Info size={16} className="text-primary flex-shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white">{alert.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                    {alert.timestamp}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-6">{alert.message}</p>

                {alert.truckReg && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pl-6 pt-1">
                    <span>
                      Target Vehicle: <strong className="text-white">{alert.truckReg}</strong>
                    </span>
                    {alert.actionLabel && onAction && (
                      <button
                        onClick={() => {
                          onAction(alert.actionType || 'REBALANCE');
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg gradient-primary text-white text-[10px] font-bold shadow-sm flex items-center gap-1 hover:opacity-90"
                      >
                        <Zap size={10} />
                        {alert.actionLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
