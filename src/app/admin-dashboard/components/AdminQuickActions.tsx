'use client';
import React, { useState } from 'react';
import { Truck, Package, Ship, Users, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';

const ACTIONS = [
  {
    icon: Truck,
    label: 'Add Truck',
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20',
  },
  {
    icon: Package,
    label: 'Add Package',
    color: 'text-accent',
    bg: 'bg-accent/10 hover:bg-accent/20',
  },
  { icon: Ship, label: 'Create Shipment', color: 'text-info', bg: 'bg-info/10 hover:bg-info/20' },
  {
    icon: Users,
    label: 'Add Loader',
    color: 'text-positive',
    bg: 'bg-positive/10 hover:bg-positive/20',
  },
  {
    icon: Download,
    label: 'Export Report',
    color: 'text-muted-foreground',
    bg: 'bg-muted hover:bg-muted/80',
  },
  {
    icon: RefreshCw,
    label: 'Sync Fleet Data',
    color: 'text-muted-foreground',
    bg: 'bg-muted hover:bg-muted/80',
  },
];

export default function AdminQuickActions() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = (label: string) => {
    setLoading(label);
    // Backend integration point: POST /api/trucks, /api/packages, /api/shipments, /api/loaders
    setTimeout(() => {
      setLoading(null);
      toast.success(`${label} — feature coming soon in full implementation`);
    }, 800);
  };

  return (
    <div className="card-elevated p-4">
      <div className="mb-4">
        <h3 className="text-sm font-600 text-foreground">Quick Actions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Common fleet management tasks</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const isLoading = loading === action.label;
          return (
            <button
              key={`qa-${action.label}`}
              onClick={() => handleAction(action.label)}
              disabled={!!loading}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border border-border ${action.bg} transition-all duration-150 active:scale-95 disabled:opacity-60 group`}
            >
              {isLoading ? (
                <svg
                  className="animate-spin w-4 h-4 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <Icon size={16} className={action.color} />
              )}
              <span className="text-[11px] font-500 text-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications panel */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <p className="text-xs font-600 text-foreground mb-2">Recent Alerts</p>
        {[
          { type: 'error', text: 'SHP-004 delayed — NH-275 closure', time: '20h ago' },
          { type: 'warning', text: 'DL-01-CG at 91% capacity', time: '2d ago' },
          { type: 'error', text: 'PKG-006 risk score: 82/100', time: '2d ago' },
        ].map((alert, i) => (
          <div
            key={`alert-${i}`}
            className={`flex items-start gap-2 p-2 rounded-lg ${alert.type === 'error' ? 'bg-negative/5 border border-negative/10' : 'bg-warning/5 border border-warning/10'}`}
          >
            <span
              className={`text-[10px] font-700 ${alert.type === 'error' ? 'text-negative' : 'text-warning'} mt-0.5 flex-shrink-0`}
            >
              !
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-tight">{alert.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
