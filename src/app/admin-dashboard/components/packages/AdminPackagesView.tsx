'use client';
import React, { useState, useMemo } from 'react';
import {
  Package as PackageIcon,
  Search,
  Plus,
  QrCode,
  Upload,
  Filter,
  X,
  RefreshCw,
  Box,
  AlertTriangle,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Package } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import AddPackageModal from './AddPackageModal';
import ScanPackageModal from './ScanPackageModal';
import ImportPackagesCsvModal from './ImportPackagesCsvModal';

interface AdminPackagesViewProps {
  packages: Package[];
  onPackagesUpdate: (updatedPackages: Package[]) => void;
  onRefresh?: () => void;
}

export default function AdminPackagesView({
  packages,
  onPackagesUpdate,
  onRefresh,
}: AdminPackagesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fragilityFilter, setFragilityFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Extract unique destinations
  const uniqueDestinations = useMemo(() => {
    const dests = new Set<string>();
    packages.forEach((p) => {
      if (p.destination) dests.add(p.destination);
    });
    return Array.from(dests).sort();
  }, [packages]);

  // Filtered packages
  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.digitalId && p.digitalId.toLowerCase().includes(q)) ||
        (p.destination && p.destination.toLowerCase().includes(q)) ||
        (p.stackingNote && p.stackingNote.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesFragility = fragilityFilter === 'ALL' || p.fragilityLevel === fragilityFilter;
      const matchesPriority = priorityFilter === 'ALL' || p.priority === priorityFilter;
      const matchesDestination = destinationFilter === 'ALL' || p.destination === destinationFilter;

      return matchesSearch && matchesStatus && matchesFragility && matchesPriority && matchesDestination;
    });
  }, [packages, search, statusFilter, fragilityFilter, priorityFilter, destinationFilter]);

  // Package statistics
  const stats = useMemo(() => {
    const total = packages.length;
    const pending = packages.filter((p) => p.status === 'PENDING').length;
    const staged = packages.filter((p) => p.status === 'STAGED').length;
    const loaded = packages.filter((p) => p.status === 'LOADED').length;
    const inTransit = packages.filter((p) => p.status === 'IN_TRANSIT').length;
    const fragile = packages.filter((p) => p.fragilityLevel === 'FRAGILE').length;
    const totalWeightKg = packages.reduce((sum, p) => sum + (p.weight || 0), 0);
    return { total, pending, staged, loaded, inTransit, fragile, totalWeightKg };
  }, [packages]);

  const handlePackageAdded = (newPkg: Package) => {
    onPackagesUpdate([newPkg, ...packages]);
  };

  const handlePackagesImported = (imported: Package[]) => {
    onPackagesUpdate([...imported, ...packages]);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    fragilityFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    destinationFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setFragilityFilter('ALL');
    setPriorityFilter('ALL');
    setDestinationFilter('ALL');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>Package Inventory & Staging</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {packages.length} Total
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage incoming cargo, scan QR/barcodes, import manifests & prepare packages for dispatch
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Add Package</span>
          </button>
          <button
            onClick={() => setShowScanModal(true)}
            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-border"
          >
            <QrCode size={14} className="text-primary" />
            <span>Scan QR / Barcode</span>
          </button>
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-border"
          >
            <Upload size={14} className="text-primary" />
            <span>Import CSV</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
              title="Refresh package list"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-2.5 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Pending Staging
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-foreground">{stats.pending}</span>
            <span className="text-[10px] text-muted-foreground">Unassigned</span>
          </div>
        </div>
        <div className="p-2.5 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Staged at Bay
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-indigo-400">{stats.staged}</span>
            <span className="text-[10px] text-muted-foreground">Queued</span>
          </div>
        </div>
        <div className="p-2.5 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Loaded in Truck
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-primary">{stats.loaded}</span>
            <span className="text-[10px] text-muted-foreground">Optimized</span>
          </div>
        </div>
        <div className="p-2.5 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            In Transit
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-cyan-400">{stats.inTransit}</span>
            <span className="text-[10px] text-muted-foreground">On Highway</span>
          </div>
        </div>
        <div className="p-2.5 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Fragile Parcels
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-negative">{stats.fragile}</span>
            <span className="text-[10px] text-muted-foreground">Top-tier safety</span>
          </div>
        </div>
        <div className="p-2.5 bg-card border border-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Total Cargo Mass
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-foreground">
              {(stats.totalWeightKg / 1000).toFixed(1)} <span className="text-xs font-normal">T</span>
            </span>
            <span className="text-[10px] text-muted-foreground">{stats.totalWeightKg.toLocaleString()} kg</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-elevated p-3 border border-border rounded-xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by ID, name, destination, handling note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-muted border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending (Unassigned)</option>
            <option value="STAGED">Staged</option>
            <option value="LOADED">Loaded</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DAMAGED">Damaged</option>
          </select>

          {/* Fragility filter */}
          <select
            value={fragilityFilter}
            onChange={(e) => setFragilityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All Fragilities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="FRAGILE">Fragile (Top Tier)</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Destination filter */}
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none max-w-[160px] truncate"
          >
            <option value="ALL">All Destinations</option>
            {uniqueDestinations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="card-elevated overflow-hidden border border-border rounded-xl">
        <div className="overflow-x-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={PackageIcon}
                title="No packages match criteria"
                description={
                  hasActiveFilters
                    ? 'Try clearing your filters or changing your search terms.'
                    : 'Get started by manually adding a package, scanning a QR barcode, or importing a CSV file.'
                }
                action={
                  hasActiveFilters
                    ? { label: 'Clear Filters', onClick: clearFilters }
                    : { label: 'Add First Package', onClick: () => setShowAddModal(true) }
                }
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Package & ID
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Dimensions & Vol
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Weight
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Fragility / Priority
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Destination & Stop
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Risk Assessment
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Status / Dispatch
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((pkg) => {
                  const volM3 = (pkg.length * pkg.width * pkg.height) / 1000000;
                  return (
                    <tr
                      key={pkg.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Package & ID */}
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                            <Box size={14} />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate max-w-[180px]">
                              {pkg.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {pkg.digitalId || pkg.id}
                            </span>
                            {pkg.stackingNote && (
                              <p className="text-[10px] text-amber-400/90 italic truncate max-w-[200px] mt-0.5">
                                ⚠ {pkg.stackingNote}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Dimensions */}
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="text-foreground font-semibold">
                          {pkg.length}×{pkg.width}×{pkg.height}
                        </span>{' '}
                        <span className="text-[10px]">cm</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {volM3.toFixed(3)} m³
                        </span>
                      </td>

                      {/* Weight */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-foreground font-bold text-xs">{pkg.weight}</span>{' '}
                        <span className="text-[10px] text-muted-foreground">kg</span>
                      </td>

                      {/* Fragility / Priority */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge variant={pkg.fragilityLevel as any} size="sm" />
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              pkg.priority === 'URGENT'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : pkg.priority === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {pkg.priority}
                          </span>
                        </div>
                      </td>

                      {/* Destination & Stop */}
                      <td className="px-3 py-3">
                        <span className="text-foreground font-medium block truncate max-w-[150px]">
                          {pkg.destination}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Stop #{pkg.deliverySequence || 1}
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge variant={pkg.riskLevel as any} size="sm" />
                          <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                            {pkg.riskScore || 0}%
                          </span>
                        </div>
                      </td>

                      {/* Status / Dispatch */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge variant={pkg.status as any} size="sm" />
                          {pkg.shipmentId ? (
                            <span className="font-mono text-[9px] text-primary hover:underline truncate max-w-[110px]">
                              {pkg.shipmentId}
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">
                              Unassigned
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

      {/* Modals */}
      {showAddModal && (
        <AddPackageModal
          onClose={() => setShowAddModal(false)}
          onPackageAdded={handlePackageAdded}
        />
      )}

      {showScanModal && (
        <ScanPackageModal
          existingPackages={packages}
          onClose={() => setShowScanModal(false)}
          onPackageAdded={handlePackageAdded}
          onPackageRetrieved={(pkg) => {
            setSearch(pkg.digitalId || pkg.id);
          }}
        />
      )}

      {showCsvModal && (
        <ImportPackagesCsvModal
          onClose={() => setShowCsvModal(false)}
          onPackagesImported={handlePackagesImported}
        />
      )}
    </div>
  );
}
