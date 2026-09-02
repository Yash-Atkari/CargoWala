'use client';
import React, { useState } from 'react';
import { Search, Ship } from 'lucide-react';
import { MOCK_SHIPMENTS } from '@/lib/mockData';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

interface AdminShipmentsTableProps {
  shipments?: typeof MOCK_SHIPMENTS;
}

export default function AdminShipmentsTable({ shipments = MOCK_SHIPMENTS }: AdminShipmentsTableProps) {
  const [search, setSearch] = useState('');

  const filtered = shipments?.filter(
    (s) =>
      s?.origin?.toLowerCase()?.includes(search?.toLowerCase()) ||
      s?.destination?.toLowerCase()?.includes(search?.toLowerCase()) ||
      s?.truckRegistration?.toLowerCase()?.includes(search?.toLowerCase())
  );

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <h3 className="text-sm font-600 text-foreground">Shipments</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{shipments?.length} total</p>
        </div>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e?.target?.value)}
            className="pl-8 pr-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-40"
          />
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        {filtered?.length === 0 ? (
          <EmptyState
            icon={Ship}
            title="No shipments found"
            description="No shipments match your search criteria."
            action={{ label: 'Clear Search', onClick: () => setSearch('') }}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['ID', 'Route', 'Truck', 'Loader', 'Packages', 'Weight', 'Status']?.map((col) => (
                  <th
                    key={`th-shp-${col}`}
                    className="px-4 py-2.5 text-left text-[10px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered?.map((shp) => (
                <tr
                  key={`shp-row-${shp?.id}`}
                  className="border-b border-border hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-600 text-primary">
                      {shp?.id?.replace('shipment-', 'SHP-')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate max-w-[140px]">
                        {shp?.origin}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                        → {shp?.destination}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {shp?.truckRegistration}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-foreground">{shp?.loaderName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-tabular text-foreground">
                      {shp?.packageCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-tabular text-foreground">
                      {(shp?.totalWeight / 1000)?.toFixed(1)}t
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={shp?.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-border bg-muted/10">
        <span className="text-xs text-muted-foreground">
          Showing {filtered?.length} of {shipments?.length} shipments
        </span>
      </div>
    </div>
  );
}
