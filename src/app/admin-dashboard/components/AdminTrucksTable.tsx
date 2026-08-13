'use client';
import React, { useState } from 'react';
import { Search, Edit, Eye, MoreHorizontal, Truck } from 'lucide-react';
import { MOCK_TRUCKS } from '@/lib/mockData';
import StatusBadge from '@/components/ui/StatusBadge';
import UtilizationBar from '@/components/ui/UtilizationBar';
import EmptyState from '@/components/ui/EmptyState';

export default function AdminTrucksTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = MOCK_TRUCKS?.filter((t) => {
    const matchSearch =
      t?.registrationNumber?.toLowerCase()?.includes(search?.toLowerCase()) ||
      t?.model?.toLowerCase()?.includes(search?.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <h3 className="text-sm font-600 text-foreground">Fleet Trucks</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{MOCK_TRUCKS?.length} trucks registered</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search trucks..."
              value={search}
              onChange={(e) => setSearch(e?.target?.value)}
              className="pl-8 pr-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e?.target?.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="LOADING">Loading</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        {filtered?.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No trucks found"
            description="No trucks match your current search or filter criteria."
            action={{ label: 'Clear Filters', onClick: () => { setSearch(''); setStatusFilter('ALL'); } }}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Registration', 'Model', 'Dimensions (cm)', 'Max Weight', 'Space Util.', 'Weight Util.', 'Assigned Loader', 'Status', '']?.map((col) => (
                  <th key={`th-truck-${col}`} className="px-4 py-2.5 text-left text-[10px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered?.map((truck) => (
                <tr key={`truck-row-${truck?.id}`} className="border-b border-border hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-600 text-primary">{truck?.registrationNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-foreground">{truck?.model}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-tabular text-muted-foreground">
                      {truck?.length}×{truck?.width}×{truck?.height}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-tabular text-foreground">{(truck?.maxWeight / 1000)?.toFixed(1)}t</span>
                  </td>
                  <td className="px-4 py-3 min-w-[100px]">
                    <UtilizationBar value={truck?.currentUtilization} size="sm" showPercent />
                  </td>
                  <td className="px-4 py-3 min-w-[100px]">
                    <UtilizationBar value={truck?.weightUtilization} size="sm" showPercent />
                  </td>
                  <td className="px-4 py-3">
                    {truck?.assignedLoaderName ? (
                      <span className="text-xs text-foreground">{truck?.assignedLoaderName}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={truck?.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="View truck details"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        title="Edit truck"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        title="More options"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/10">
        <span className="text-xs text-muted-foreground">
          Showing {filtered?.length} of {MOCK_TRUCKS?.length} trucks
        </span>
        <div className="flex items-center gap-1">
          {[1]?.map((page) => (
            <button
              key={`page-${page}`}
              className="w-6 h-6 rounded text-xs font-600 bg-primary/10 text-primary"
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}