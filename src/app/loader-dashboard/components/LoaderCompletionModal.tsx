'use client';
import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Truck as TruckIcon,
  PackageCheck,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Truck, Shipment, LoadingPackage } from '@/lib/types';

interface LoaderCompletionModalProps {
  currentShipment: Shipment;
  assignedTruck: Truck;
  packages: LoadingPackage[];
  onClose: () => void;
  onCompleted: () => void;
}

export default function LoaderCompletionModal({
  currentShipment,
  assignedTruck,
  packages,
  onClose,
  onCompleted,
}: LoaderCompletionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideAllowed, setOverrideAllowed] = useState(false);

  // Accounting validation
  const totalCount = packages.length;
  const loadedCount = packages.filter((p) => p.isLoaded).length;
  const damagedCount = packages.filter((p) => p.status === 'DAMAGED').length;
  const unaccountedPackages = packages.filter((p) => !p.isLoaded && p.status !== 'DAMAGED');
  const isFullyAccounted = unaccountedPackages.length === 0;

  // Weight capacity
  const totalLoadedWeight = packages
    .filter((p) => p.isLoaded)
    .reduce((sum, p) => sum + (p.weight || 0), 0);
  const maxWeight = assignedTruck.maxWeight || 1;
  const isWeightSafe = totalLoadedWeight <= maxWeight;

  const handleFinalizeLoading = async () => {
    try {
      setIsSubmitting(true);

      // 1. Update shipment status to IN_TRANSIT
      const res = await fetch('/api/shipments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentShipment.id,
          status: 'IN_TRANSIT',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update shipment status');
      }

      // 2. Update truck status to IN_TRANSIT
      await fetch('/api/trucks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assignedTruck.id,
          status: 'IN_TRANSIT',
        }),
      });

      // 3. Audit tracking event
      await fetch('/api/tracking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: currentShipment.id,
          eventType: 'IN_TRANSIT',
          description: `Loading session completed by bay operator. ${loadedCount} packages loaded, ${damagedCount} exceptions. Vehicle ${assignedTruck.registrationNumber} departed and is now IN_TRANSIT on the highway.`,
          location: currentShipment.origin,
          createdBy: 'Bay Loading Operator',
        }),
      });

      toast.success(
        `Dispatch ${currentShipment.id} is now IN_TRANSIT! Vehicle ${assignedTruck.registrationNumber} departed for highway.`
      );
      onCompleted();
      onClose();
    } catch (err: any) {
      console.error('Error completing loading:', err);
      toast.error(err.message || 'Failed to complete loading session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Complete Loading Session</h2>
              <p className="text-xs text-slate-400">
                Pre-departure verification & highway dispatch handoff
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Dispatch Summary Card */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dispatch ID:</span>
              <span className="font-mono font-bold text-primary">{currentShipment.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Assigned Vehicle:</span>
              <span className="font-semibold text-white">
                {assignedTruck.registrationNumber} ({assignedTruck.model})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Route Corridor:</span>
              <span className="text-white font-medium">
                {currentShipment.origin} → {currentShipment.destination}
              </span>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Pre-Departure Readiness Checklist
            </span>

            {/* 1. Manifest Accounting */}
            <div
              className={`p-3 rounded-xl border flex items-start gap-3 ${
                isFullyAccounted
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              {isFullyAccounted ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs flex-1">
                <span className="font-bold text-white block">
                  Cargo Manifest Reconciliation: {loadedCount}/{totalCount} Loaded
                </span>
                <span className="text-slate-400 block mt-0.5 text-[11px]">
                  {damagedCount > 0 && `${damagedCount} package(s) marked with damage exception. `}
                  {isFullyAccounted
                    ? 'All packages accounted for on vehicle trailer.'
                    : `${unaccountedPackages.length} package(s) remain unverified.`}
                </span>
              </div>
            </div>

            {/* 2. Weight Safety Check */}
            <div
              className={`p-3 rounded-xl border flex items-start gap-3 ${
                isWeightSafe
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {isWeightSafe ? (
                <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs flex-1">
                <span className="font-bold text-white block">
                  Gross Weight Compliance: {totalLoadedWeight.toLocaleString()} /{' '}
                  {maxWeight.toLocaleString()} kg
                </span>
                <span className="text-slate-400 block mt-0.5 text-[11px]">
                  {isWeightSafe
                    ? `Safe margin: ${(maxWeight - totalLoadedWeight).toLocaleString()} kg remaining payload capacity.`
                    : 'Hazard: Trailer is overloaded beyond rated axle limits!'}
                </span>
              </div>
            </div>
          </div>

          {/* Unaccounted Packages Warning List (if any) */}
          {!isFullyAccounted && (
            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-300 block">
                Unaccounted Packages ({unaccountedPackages.length}):
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin text-xs">
                {unaccountedPackages.map((p) => (
                  <div
                    key={p.id}
                    className="p-1.5 bg-slate-900/60 rounded flex items-center justify-between text-[11px]"
                  >
                    <span className="font-mono text-slate-300">{p.digitalId}</span>
                    <span className="text-white truncate max-w-[160px]">{p.name}</span>
                    <span className="text-slate-400">{p.weight}kg</span>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={overrideAllowed}
                  onChange={(e) => setOverrideAllowed(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Authorize departure with partial cargo manifest</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Back to Bay
            </button>
            <button
              type="button"
              disabled={isSubmitting || (!isFullyAccounted && !overrideAllowed) || !isWeightSafe}
              onClick={handleFinalizeLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'Finalizing...' : 'Confirm Ready for Highway (READY)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
