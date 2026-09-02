'use client';
import React, { useState } from 'react';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { MOCK_PACKAGES } from '@/lib/mockData';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

interface AdminPackagesTableProps {
  packages?: typeof MOCK_PACKAGES;
}

export default function AdminPackagesTable({ packages = MOCK_PACKAGES }: AdminPackagesTableProps) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filtered = packages.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.digitalId.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'ALL' || p.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <h3 className="text-sm font-600 text-foreground">Packages</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{packages.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-36"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Risk</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No packages found"
            description="No packages match your current filters."
            action={{
              label: 'Clear Filters',
              onClick: () => {
                setSearch('');
                setRiskFilter('ALL');
              },
            }}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  'Digital ID',
                  'Name',
                  'Weight',
                  'Fragility',
                  'Priority',
                  'Risk Score',
                  'Status',
                ].map((col) => (
                  <th
                    key={`th-pkg-${col}`}
                    className="px-4 py-2.5 text-left text-[10px] font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 10).map((pkg) => (
                <tr
                  key={`pkg-row-${pkg.id}`}
                  className="border-b border-border hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {pkg.digitalId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-foreground max-w-[140px] truncate block">
                      {pkg.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-tabular text-foreground">{pkg.weight}kg</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={
                        pkg.fragilityLevel === 'FRAGILE'
                          ? 'FRAGILE'
                          : (pkg.fragilityLevel as 'LOW' | 'MEDIUM' | 'HIGH')
                      }
                      label={pkg.fragilityLevel}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={pkg.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'}
                      label={pkg.priority}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {pkg.riskScore >= 70 && <AlertTriangle size={11} className="text-negative" />}
                      <span
                        className={`text-xs font-tabular font-600 ${pkg.riskScore >= 70 ? 'text-negative' : pkg.riskScore >= 40 ? 'text-warning' : 'text-positive'}`}
                      >
                        {pkg.riskScore}/100
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={pkg.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border bg-muted/10">
        <span className="text-xs text-muted-foreground">
          Showing {Math.min(filtered.length, 10)} of {filtered.length} packages
        </span>
      </div>
    </div>
  );
}
