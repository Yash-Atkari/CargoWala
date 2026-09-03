'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  RefreshCw,
  QrCode,
  Sliders,
  Package,
} from 'lucide-react';
import { Shipment } from '@/lib/types';

interface LoaderActivityDrawerProps {
  currentShipment: Shipment;
  onClose: () => void;
}

interface ActivityEvent {
  id: string;
  shipmentId: string;
  packageId?: string | null;
  eventType: string;
  description: string;
  timestamp: string;
  location?: string;
  createdBy?: string;
}

export default function LoaderActivityDrawer({
  currentShipment,
  onClose,
}: LoaderActivityDrawerProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tracking-events?shipmentId=${currentShipment.id}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Error fetching activity events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentShipment.id]);

  const getEventBadge = (type: string, desc: string) => {
    if (type === 'DAMAGED' || desc.includes('[EXCEPTION')) {
      return { icon: ShieldAlert, color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Exception' };
    }
    if (desc.includes('[DEVIATION')) {
      return { icon: Sliders, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Deviation' };
    }
    if (type === 'LOADED') {
      return { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Loaded' };
    }
    return { icon: QrCode, color: 'text-primary bg-primary/10 border-primary/20', label: 'Scan / Action' };
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0B132B] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="text-primary w-5 h-5" />
          <div>
            <h3 className="text-sm font-bold text-white">Bay Activity History</h3>
            <p className="text-[11px] text-slate-400">
              Audit log for dispatch <span className="font-mono text-primary font-bold">{currentShipment.id}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            title="Refresh history"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading live audit trail...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <Clock size={28} className="mx-auto text-slate-600" />
            <p>No activity recorded yet for this loading session.</p>
            <p className="text-[10px] text-slate-600">
              Scans, confirmations, and exceptions will appear here in real time.
            </p>
          </div>
        ) : (
          events.map((evt) => {
            const badge = getEventBadge(evt.eventType, evt.description);
            const Icon = badge.icon;
            const timeStr = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Recent';

            return (
              <div
                key={evt.id}
                className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5 text-xs transition-colors hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}
                  >
                    <Icon size={11} />
                    <span>{badge.label}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                </div>

                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {evt.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>{evt.createdBy || 'Loading Operator'}</span>
                  <span>{evt.location || currentShipment.origin}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#0F172A] text-[11px] text-slate-500 text-center">
        {events.length} timestamped audit actions recorded
      </div>
    </div>
  );
}
