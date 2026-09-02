import React from 'react';
import { MapPin, AlertTriangle, CheckCircle, Clock, Package, Truck } from 'lucide-react';
import { MOCK_TRACKING_EVENTS } from '@/lib/mockData';
import Icon from '@/components/ui/AppIcon';

const EVENT_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string }> =
  {
    CREATED: { icon: Package, color: 'text-muted-foreground', bg: 'bg-muted' },
    RECEIVED: { icon: Truck, color: 'text-primary', bg: 'bg-primary/10' },
    LOADING: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    LOADED: { icon: CheckCircle, color: 'text-positive', bg: 'bg-positive/10' },
    IN_TRANSIT: { icon: MapPin, color: 'text-info', bg: 'bg-info/10' },
    UNLOADED: { icon: CheckCircle, color: 'text-positive', bg: 'bg-positive/10' },
    DELIVERED: { icon: CheckCircle, color: 'text-positive', bg: 'bg-positive/10' },
    DAMAGED: { icon: AlertTriangle, color: 'text-negative', bg: 'bg-negative/10' },
    DELAYED: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  };

function formatRelativeTime(timestamp: string): string {
  const eventDate = new Date(timestamp);
  const now = new Date('2026-08-13T03:46:41Z');
  const diffMs = now.getTime() - eventDate.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  if (diffHrs > 24) return `${Math.floor(diffHrs / 24)}d ago`;
  if (diffHrs > 0) return `${diffHrs}h ${diffMins}m ago`;
  return `${diffMins}m ago`;
}

export default function AdminActivityFeed() {
  const recentEvents = [...MOCK_TRACKING_EVENTS]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-600 text-foreground">Live Tracking Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time shipment & package events
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-positive font-500">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-0">
        {recentEvents.map((event, idx) => {
          const config = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.CREATED;
          const EventIcon = config.icon;
          const isLast = idx === recentEvents.length - 1;

          return (
            <div key={`evt-feed-${event.id}`} className="flex gap-3 group">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}
                >
                  <EventIcon size={13} className={config.color} />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border my-1" />}
              </div>

              {/* Content */}
              <div className={`flex-1 ${!isLast ? 'pb-4' : 'pb-1'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-600 text-foreground leading-tight">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{event.location}</span>
                      <span className="text-[10px] text-border">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        by {event.createdBy}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 font-tabular">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
