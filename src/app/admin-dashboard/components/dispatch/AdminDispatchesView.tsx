'use client';
import React, { useState, useMemo } from 'react';
import {
  Ship,
  Plus,
  Search,
  Truck as TruckIcon,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  Navigation,
  Eye,
  Box,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Shipment, Truck, Package } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import CreateDispatchModal from './CreateDispatchModal';
import Link from 'next/link';

interface AdminDispatchesViewProps {
  shipments: Shipment[];
  trucks: Truck[];
  packages: Package[];
  onShipmentsUpdate: (shipments: Shipment[]) => void;
  onRefresh?: () => void;
}

export default function AdminDispatchesView({
  shipments,
  trucks,
  packages,
  onShipmentsUpdate,
  onRefresh,
}: AdminDispatchesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter shipments
  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        (s.truckRegistration && s.truckRegistration.toLowerCase().includes(q)) ||
        (s.loaderName && s.loaderName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shipments, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const planned = shipments.filter((s) => s.status === 'PLANNED').length;
    const loading = shipments.filter((s) => s.status === 'LOADING').length;
    const ready = shipments.filter((s) => s.status === 'READY' || s.status === 'LOADED').length;
    const inTransit = shipments.filter((s) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT').length;
    const completed = shipments.filter((s) => s.status === 'COMPLETED' || s.status === 'DELIVERED').length;
    return { planned, loading, ready, inTransit, completed };
  }, [shipments]);

  // Status progression action handler
  const handleAdvanceStatus = async (shipment: Shipment, nextStatus: string, actionLabel: string) => {
    try {
      setUpdatingId(shipment.id);
      const res = await fetch('/api/shipments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shipment.id, status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update shipment status');
      }

      toast.success(`Dispatch ${shipment.id} updated: ${actionLabel}`);
      onShipmentsUpdate(
        shipments.map((s) => (s.id === shipment.id ? { ...s, status: nextStatus as any } : s))
      );
    } catch (err: any) {
      console.error('Error advancing status:', err);
      toast.error(err.message || 'Failed to update dispatch');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDispatchCreated = (newShipment: Shipment) => {
    onShipmentsUpdate([newShipment, ...shipments]);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>Vehicle Dispatches & Route Hub</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {shipments.length} Dispatches
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prepare, monitor, and transition vehicle shipments through the full dispatch status lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Create Dispatch</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
              title="Refresh dispatches"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Planned Dispatches
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-400">{stats.planned}</span>
            <span className="text-[10px] text-muted-foreground">Queued</span>
          </div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Currently Loading
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-primary">{stats.loading}</span>
            <span className="text-[10px] text-muted-foreground">At Bay</span>
          </div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Ready for Highway
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-400">{stats.ready}</span>
            <span className="text-[10px] text-muted-foreground">Inspected</span>
          </div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            In Transit
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-400">{stats.inTransit}</span>
            <span className="text-[10px] text-muted-foreground">On Route</span>
          </div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Completed / Delivered
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-positive">{stats.completed}</span>
            <span className="text-[10px] text-muted-foreground">POD Signed</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-elevated p-3 border border-border rounded-xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by Dispatch ID, vehicle, origin, destination, loader..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">PLANNED</option>
            <option value="LOADING">LOADING</option>
            <option value="READY">READY</option>
            <option value="LOADED">LOADED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DELIVERED">DELIVERED</option>
          </select>

          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Dispatches List */}
      <div className="card-elevated overflow-hidden border border-border rounded-xl">
        <div className="overflow-x-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Ship}
                title="No dispatches found"
                description={
                  search || statusFilter !== 'ALL'
                    ? 'No dispatches match your search filters.'
                    : 'No active dispatches. Click "Create Dispatch" to plan your first vehicle shipment.'
                }
                action={{
                  label: 'Create Dispatch',
                  onClick: () => setShowCreateModal(true),
                }}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Dispatch ID
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Route (Origin → Destination)
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Vehicle & Loader
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Cargo Details
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Status
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">
                    Operational Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => {
                  const isUpdating = updatingId === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                      {/* Dispatch ID */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-foreground text-xs block">
                          {s.id}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Active'}
                        </span>
                      </td>

                      {/* Route */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <span className="truncate max-w-[130px]" title={s.origin}>
                            {s.origin}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="truncate max-w-[130px] font-bold text-primary" title={s.destination}>
                            {s.destination}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle & Loader */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <TruckIcon size={12} className="text-primary" />
                            {s.truckRegistration || s.truckId}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User size={10} />
                            {s.loaderName || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-foreground font-bold">
                          {s.packageCount || 0} pkgs
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {(s.totalWeight || 0).toLocaleString()} kg · {s.totalVolume || 0} m³
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge variant={s.status as any} size="sm" />
                      </td>

                      {/* Status Progression Controls */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 3D Plan Visualizer Link */}
                          <Link
                            href={`/load-planner?shipmentId=${s.id}${s.truckId ? `&truckId=${s.truckId}` : ''}`}
                            className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1 border border-border"
                            title="Open 3D Load Planner"
                          >
                            <Box size={11} className="text-primary" />
                            <span>3D Plan</span>
                          </Link>

                          {/* Lifecycle Status Buttons */}
                          {s.status === 'PLANNED' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAdvanceStatus(s, 'LOADING', 'Loading Started')}
                              className="px-2.5 py-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1"
                            >
                              <Play size={10} />
                              <span>Start Loading</span>
                            </button>
                          )}

                          {s.status === 'LOADING' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAdvanceStatus(s, 'READY', 'Marked Ready for Highway')}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 size={10} />
                              <span>Mark Ready</span>
                            </button>
                          )}

                          {s.status === 'READY' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAdvanceStatus(s, 'DISPATCHED', 'Vehicle Dispatched on Highway')}
                              className="px-2.5 py-1 bg-purple-600 text-white text-[11px] font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                            >
                              <Navigation size={10} />
                              <span>Dispatch</span>
                            </button>
                          )}

                          {(s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT') && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleAdvanceStatus(s, 'COMPLETED', 'Shipment Completed')}
                              className="px-2.5 py-1 bg-positive text-white text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1"
                            >
                              <Check size={10} />
                              <span>Complete POD</span>
                            </button>
                          )}

                          {(s.status === 'COMPLETED' || s.status === 'DELIVERED') && (
                            <span className="text-[10px] text-positive font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Complete
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Dispatch Modal */}
      {showCreateModal && (
        <CreateDispatchModal
          trucks={trucks}
          packages={packages}
          onClose={() => setShowCreateModal(false)}
          onDispatchCreated={handleDispatchCreated}
        />
      )}
    </div>
  );
}
