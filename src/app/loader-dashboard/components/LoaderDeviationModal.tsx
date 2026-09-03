'use client';
import React, { useState } from 'react';
import {
  X,
  RotateCw,
  ArrowDownToLine,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingPackage, Shipment } from '@/lib/types';

interface LoaderDeviationModalProps {
  currentShipment: Shipment;
  packages: LoadingPackage[];
  preselectedPackageId?: string | null;
  onClose: () => void;
  onDeviationSaved: (pkgId: string, deviationNote: string) => void;
}

const DEVIATION_PRESETS = [
  'Overhead clearance blocked — moved to floor level (Y=0)',
  'Rotated 90° horizontally to fit within sidewall ribs',
  'Swapped step sequence with adjacent carton for bay forklift safety',
  'Positioned against right wall for additional strap anchoring',
  'Cushioned with dunnage bag instead of direct wall contact',
];

export default function LoaderDeviationModal({
  currentShipment,
  packages,
  preselectedPackageId = null,
  onClose,
  onDeviationSaved,
}: LoaderDeviationModalProps) {
  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    preselectedPackageId || (packages.length > 0 ? packages[0].id : '')
  );
  const [deviationType, setDeviationType] = useState<
    'FLOOR_PLACEMENT' | 'ROTATION_90' | 'SEQUENCE_SWAP' | 'WALL_BRACE'
  >('FLOOR_PLACEMENT');
  const [selectedPreset, setSelectedPreset] = useState(DEVIATION_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId);

  // Real-time safety validation
  const isFragile = selectedPkg?.fragilityLevel === 'FRAGILE';
  const isHeavy = (selectedPkg?.weight || 0) > 60;

  let safetyAssessment = {
    safe: true,
    message: 'Controlled deviation complies with trailer stability guidelines.',
  };

  if (deviationType === 'FLOOR_PLACEMENT' && isHeavy) {
    safetyAssessment = {
      safe: true,
      message: 'Positive safety impact: Anchoring heavy mass to floor level lowers Center of Gravity.',
    };
  } else if (isFragile && deviationType === 'SEQUENCE_SWAP') {
    safetyAssessment = {
      safe: true,
      message: 'Caution: Ensure fragile cargo remains protected on upper tier with zero top crush load.',
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    const fullNote = customReason.trim()
      ? `${selectedPreset} (${customReason.trim()})`
      : selectedPreset;

    try {
      setIsSubmitting(true);

      const updateData: any = {
        id: selectedPkg.id,
        isLoaded: true,
        status: 'LOADED',
        stackingNote: `[DEVIATION: ${deviationType}] ${fullNote}`,
      };

      if (deviationType === 'FLOOR_PLACEMENT') {
        updateData.positionY = 0;
      } else if (deviationType === 'ROTATION_90') {
        updateData.rotationY = (selectedPkg.rotationY === 90 ? 0 : 90);
      }

      // Update package
      await fetch('/api/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Audit tracking event
      await fetch('/api/tracking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: currentShipment.id,
          packageId: selectedPkg.id,
          eventType: 'LOADING',
          description: `Loader executed placement deviation [${deviationType}] for "${selectedPkg.name}": ${fullNote}`,
          location: currentShipment.origin,
          createdBy: 'Bay Loading Operator',
        }),
      });

      toast.success(`Deviation recorded for "${selectedPkg.name}"`);
      onDeviationSaved(selectedPkg.id, updateData.stackingNote);
      onClose();
    } catch (err: any) {
      console.error('Error saving deviation:', err);
      toast.error(err.message || 'Failed to record deviation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Loading Deviation</h2>
              <p className="text-xs text-slate-400">
                Log authorized alternate placement with real-time safety impact check
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
          {/* Target Package */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Package
            </label>
            <select
              value={selectedPkgId}
              onChange={(e) => setSelectedPkgId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.digitalId} · {pkg.name} ({pkg.weight}kg, {pkg.fragilityLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Deviation Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Deviation Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'FLOOR_PLACEMENT', label: 'Floor Level (Y=0)', icon: ArrowDownToLine },
                { id: 'ROTATION_90', label: 'Rotate 90°', icon: RotateCw },
                { id: 'SEQUENCE_SWAP', label: 'Swap Order', icon: ArrowRightLeft },
                { id: 'WALL_BRACE', label: 'Sidewall Bracing', icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = deviationType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDeviationType(item.id as any)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <Icon size={16} className="text-amber-400" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Safety Impact Badge */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <AlertTriangle size={14} />
              <span>Safety Re-Analysis:</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {safetyAssessment.message}
            </p>
          </div>

          {/* Reason Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Operational Reason (Tap preset)
            </label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
              {DEVIATION_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPreset(p)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedPreset === p
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                      : 'bg-slate-900/60 hover:bg-slate-850 text-slate-400 border border-slate-800/60'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Details */}
          <div>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Additional loader remark (optional)..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !selectedPkg}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Saving Deviation...' : 'Apply & Confirm Load'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
