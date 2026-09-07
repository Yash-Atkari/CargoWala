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
  Trash2,
  Pencil,
  Truck as TruckIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Package, Truck, Shipment } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import AddPackageModal from './AddPackageModal';
import ScanPackageModal from './ScanPackageModal';
import ImportPackagesCsvModal from './ImportPackagesCsvModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface AdminPackagesViewProps {
  packages: Package[];
  trucks?: Truck[];
  shipments?: Shipment[];
  onPackagesUpdate: (updatedPackages: Package[]) => void;
  onRefresh?: () => void;
}

export default function AdminPackagesView({
  packages,
  trucks = [],
  shipments = [],
  onPackagesUpdate,
  onRefresh,
}: AdminPackagesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fragilityFilter, setFragilityFilter] = useState('ALL');
  const [truckFilter, setTruckFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<Package | null>(null);

  // Map shipments & trucks for quick lookup
  const shipmentMap = useMemo(() => {
    const map = new Map<string, Shipment>();
    shipments.forEach((s) => map.set(s.id, s));
    return map;
  }, [shipments]);

  const truckMap = useMemo(() => {
    const map = new Map<string, Truck>();
    trucks.forEach((t) => {
      map.set(t.id, t);
      if (t.registrationNumber) map.set(t.registrationNumber, t);
    });
    return map;
  }, [trucks]);

  // Extract unique destinations based on packages matching active filters (truck, status, fragility)
  const uniqueDestinations = useMemo(() => {
    const dests = new Set<string>();
    packages.forEach((p) => {
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesFragility = fragilityFilter === 'ALL' || p.fragilityLevel === fragilityFilter;

      const pkgShipment = p.shipmentId ? shipmentMap.get(p.shipmentId) : undefined;
      const pkgTruck = pkgShipment
        ? (truckMap.get(pkgShipment.truckId) || truckMap.get(pkgShipment.truckRegistration))
        : undefined;

      const matchesTruck =
        truckFilter === 'ALL' ||
        (truckFilter === 'UNASSIGNED' && (!p.shipmentId || !pkgTruck)) ||
        (pkgTruck && (pkgTruck.id === truckFilter || pkgTruck.registrationNumber === truckFilter));

      if (matchesStatus && matchesFragility && matchesTruck && p.destination) {
        dests.add(p.destination);
      }
    });
    return Array.from(dests).sort();
  }, [packages, statusFilter, fragilityFilter, truckFilter, shipmentMap, truckMap]);

  // Reset destination filter if current selection is not in active unique destinations
  React.useEffect(() => {
    if (destinationFilter !== 'ALL' && !uniqueDestinations.includes(destinationFilter)) {
      setDestinationFilter('ALL');
    }
  }, [uniqueDestinations, destinationFilter]);

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
      
      const pkgShipment = p.shipmentId ? shipmentMap.get(p.shipmentId) : undefined;
      const pkgTruck = pkgShipment
        ? (truckMap.get(pkgShipment.truckId) || truckMap.get(pkgShipment.truckRegistration))
        : undefined;

      const matchesTruck =
        truckFilter === 'ALL' ||
        (truckFilter === 'UNASSIGNED' && (!p.shipmentId || !pkgTruck)) ||
        (pkgTruck && (pkgTruck.id === truckFilter || pkgTruck.registrationNumber === truckFilter));

      const matchesDestination = destinationFilter === 'ALL' || p.destination === destinationFilter;

      return matchesSearch && matchesStatus && matchesFragility && matchesTruck && matchesDestination;
    });
  }, [packages, search, statusFilter, fragilityFilter, truckFilter, destinationFilter, shipmentMap, truckMap]);

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

  const handlePackageUpdated = (updatedPkg: Package) => {
    onPackagesUpdate(
      packages.map((p) => (p.id === updatedPkg.id || p.digitalId === updatedPkg.digitalId ? updatedPkg : p))
    );
  };

  const handlePackagesImported = (imported: Package[]) => {
    onPackagesUpdate([...imported, ...packages]);
  };

  const handlePackageDeleted = (deletedId: string) => {
    onPackagesUpdate(packages.filter((p) => p.id !== deletedId && p.digitalId !== deletedId));
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    fragilityFilter !== 'ALL' ||
    truckFilter !== 'ALL' ||
    destinationFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setFragilityFilter('ALL');
    setTruckFilter('ALL');
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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

          {/* Truck filter */}
          <select
            value={truckFilter}
            onChange={(e) => setTruckFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none max-w-[170px] truncate"
          >
            <option value="ALL">All Trucks</option>
            <option value="UNASSIGNED">Unassigned (No Truck)</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.registrationNumber} ({t.model})
              </option>
            ))}
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
                    Fragility
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Destination & Stop
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Risk Assessment
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Status / Assigned Truck
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((pkg) => {
                  const volM3 = (pkg.length * pkg.width * pkg.height) / 1000000;
                  const pkgShipment = pkg.shipmentId ? shipmentMap.get(pkg.shipmentId) : undefined;
                  const pkgTruck = pkgShipment
                    ? (truckMap.get(pkgShipment.truckId) || truckMap.get(pkgShipment.truckRegistration))
                    : undefined;

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

                      {/* Fragility */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge variant={pkg.fragilityLevel as any} size="sm" />
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

                      {/* Status / Assigned Truck */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge variant={pkg.status as any} size="sm" />
                          {pkgTruck ? (
                            <div className="flex items-center gap-1.5 text-[10px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">
                              <TruckIcon size={12} className="text-primary shrink-0" />
                              <span className="font-semibold text-foreground font-mono">
                                {pkgTruck.registrationNumber}
                              </span>
                              <span className="text-[9px] font-bold text-primary uppercase">
                                ({pkgTruck.status})
                              </span>
                            </div>
                          ) : pkgShipment ? (
                            <div className="flex items-center gap-1 text-[10px]">
                              <TruckIcon size={12} className="text-muted-foreground shrink-0" />
                              <span className="font-mono text-muted-foreground">
                                {pkgShipment.truckRegistration || pkg.shipmentId}
                              </span>
                              {pkgShipment.status && (
                                <span className="text-[9px] text-muted-foreground italic">
                                  ({pkgShipment.status})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingPackage(pkg)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title={`Edit ${pkg.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingPackage(pkg)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${pkg.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
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
      {(showAddModal || editingPackage) && (
        <AddPackageModal
          packageToEdit={editingPackage}
          onClose={() => {
            setShowAddModal(false);
            setEditingPackage(null);
          }}
          onPackageAdded={handlePackageAdded}
          onPackageUpdated={handlePackageUpdated}
        />
      )}

      {deletingPackage && (
        <DeleteConfirmModal
          packageToDelete={deletingPackage}
          onClose={() => setDeletingPackage(null)}
          onConfirmDelete={async (pkgId) => {
            const res = await fetch(`/api/packages?id=${encodeURIComponent(pkgId)}`, {
              method: 'DELETE',
            });
            if (!res.ok) {
              const d = await res.json();
              throw new Error(d.error || 'Failed to delete package');
            }
            toast.success(`Package "${deletingPackage.name}" deleted from system`);
            handlePackageDeleted(pkgId);
          }}
        />
      )}

      {showScanModal && (
        <ScanPackageModal
          existingPackages={packages}
          onClose={() => setShowScanModal(false)}
          onPackageAdded={handlePackageAdded}
          onPackageDeleted={handlePackageDeleted}
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
