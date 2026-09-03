'use client';
import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  FileQuestion,
  HelpCircle,
  CheckCircle2,
  PackageX,
  Construction,
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingPackage, Shipment } from '@/lib/types';

interface LoaderExceptionModalProps {
  currentShipment: Shipment;
  packages: LoadingPackage[];
  preselectedPackageId?: string | null;
  onClose: () => void;
  onExceptionReported: (pkgId: string | null, exceptionType: string, note: string) => void;
}

const COMMON_REASONS = [
  'Box crushed or punctured during forklift staging',
  'Packaging tape torn / contents exposed',
  'Moisture / fluid leakage detected on exterior carton',
  'Package missing from bay staging pallet',
  'Dimensions exceed physical clearance door opening',
  'Fragility label damaged / unable to verify contents',
  'Pallet warped — unable to rest flush on trailer floor',
];

export default function LoaderExceptionModal({
  currentShipment,
  packages,
  preselectedPackageId = null,
  onClose,
  onExceptionReported,
}: LoaderExceptionModalProps) {
  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    preselectedPackageId || (packages.length > 0 ? packages[0].id : '')
  );
  const [exceptionType, setExceptionType] = useState<
    'DAMAGED' | 'MISSING' | 'DOES_NOT_FIT' | 'PHYSICAL_OBSTRUCTION' | 'PLAN_INCOMPATIBLE'
  >('DAMAGED');
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customNote.trim() ? `${selectedReason} — ${customNote.trim()}` : selectedReason;

    try {
      setIsSubmitting(true);
      const pkg = packages.find((p) => p.id === selectedPkgId);

      // 1. Update package status if damaged or missing
      if (pkg && (exceptionType === 'DAMAGED' || exceptionType === 'MISSING')) {
        await fetch('/api/packages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pkg.id,
            status: exceptionType === 'DAMAGED' ? 'DAMAGED' : 'PENDING',
            isLoaded: false,
            stackingNote: `[EXCEPTION: ${exceptionType}] ${finalReason}`,
          }),
        });
      }

      // 2. Record tracking audit event
      await fetch('/api/tracking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: currentShipment.id,
          packageId: pkg?.id || null,
          eventType: exceptionType === 'DAMAGED' ? 'DAMAGED' : 'DELAYED',
          description: `Loader reported exception [${exceptionType}] for ${pkg ? `"${pkg.name}" (${pkg.digitalId})` : 'bay'}: ${finalReason}`,
          location: currentShipment.origin,
          createdBy: 'Bay Loading Staff',
        }),
      });

      toast.error(`Exception logged: ${exceptionType.replace('_', ' ')} reported`);
      onExceptionReported(selectedPkgId || null, exceptionType, finalReason);
      onClose();
    } catch (err: any) {
      console.error('Error logging exception:', err);
      toast.error(err.message || 'Failed to submit exception');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-red-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report Loading Exception</h2>
              <p className="text-xs text-slate-400">
                Log damaged parcels, missing items, or physical trailer clearance issues
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Exception Type Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Exception Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'DAMAGED', label: 'Damaged Parcel', icon: PackageX, color: 'text-red-400' },
                { id: 'MISSING', label: 'Missing Cargo', icon: FileQuestion, color: 'text-amber-400' },
                { id: 'DOES_NOT_FIT', label: 'Does Not Fit', icon: Construction, color: 'text-orange-400' },
                { id: 'PLAN_INCOMPATIBLE', label: 'Plan Obstructed', icon: AlertTriangle, color: 'text-yellow-400' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = exceptionType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setExceptionType(t.id as any)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500/50 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <Icon size={16} className={t.color} />
                    <span className="text-xs">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Package Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Affected Package
            </label>
            <select
              value={selectedPkgId}
              onChange={(e) => setSelectedPkgId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-red-500 focus:outline-none"
            >
              <option value="">-- General Bay / Trailer Obstruction (No specific parcel) --</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.digitalId} · {pkg.name} ({pkg.weight}kg, Step #{pkg.loadingOrder || 1})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Common Reasons (Tap to select)
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedReason === r
                      ? 'bg-red-500/20 text-red-300 font-semibold border border-red-500/30'
                      : 'bg-slate-900/60 hover:bg-slate-850 text-slate-400 border border-slate-800/60'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Additional Details / Comments (Optional)
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Describe physical damage, location on trailer, or loader notes..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20"
            >
              {isSubmitting ? 'Logging Exception...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
