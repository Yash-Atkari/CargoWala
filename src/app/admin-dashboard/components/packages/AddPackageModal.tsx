'use client';
import React, { useState } from 'react';
import { X, Box, Check, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Package } from '@/lib/types';

interface AddPackageModalProps {
  onClose: () => void;
  onPackageAdded: (pkg: Package) => void;
}

const COMMON_DESTINATIONS = [
  'Pune Distribution Hub',
  'Mumbai Warehouse A',
  'Nashik Depot',
  'Nagpur Central',
  'Surat Express',
  'Ahmedabad Logistics Park',
  'Bengaluru Tech Park',
  'Delhi NCR Depot',
  'Chennai Port Yard',
  'Hyderabad Central',
];

export default function AddPackageModal({ onClose, onPackageAdded }: AddPackageModalProps) {
  const [digitalId, setDigitalId] = useState(
    `CW-2026-PKG-${Math.floor(100 + Math.random() * 900)}`
  );
  const [name, setName] = useState('');
  const [length, setLength] = useState<string>('80');
  const [width, setWidth] = useState<string>('60');
  const [height, setHeight] = useState<string>('50');
  const [weight, setWeight] = useState<string>('45');
  const [fragilityLevel, setFragilityLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'FRAGILE'>('LOW');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [destination, setDestination] = useState(COMMON_DESTINATIONS[0]);
  const [customDestination, setCustomDestination] = useState('');
  const [deliverySequence, setDeliverySequence] = useState<number>(1);
  const [stackingNote, setStackingNote] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'STAGED'>('PENDING');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Package name is required';
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);
    const wt = parseFloat(weight);

    if (isNaN(l) || l <= 0) errs.length = 'Length must be > 0 cm';
    if (isNaN(w) || w <= 0) errs.width = 'Width must be > 0 cm';
    if (isNaN(h) || h <= 0) errs.height = 'Height must be > 0 cm';
    if (isNaN(wt) || wt <= 0) errs.weight = 'Weight must be > 0 kg';

    const finalDest = customDestination.trim() || destination;
    if (!finalDest.trim()) errs.destination = 'Destination is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix validation errors before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalDest = customDestination.trim() || destination;

      const payload = {
        digitalId: digitalId.trim(),
        name: name.trim(),
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        weight: parseFloat(weight),
        fragilityLevel,
        priority,
        destination: finalDest,
        deliverySequence: Number(deliverySequence) || 1,
        stackingNote: stackingNote.trim(),
        status,
      };

      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create package');
      }

      toast.success(`Package "${data.package.name}" added successfully!`);
      onPackageAdded(data.package);
      onClose();
    } catch (err: any) {
      console.error('Error adding package:', err);
      toast.error(err.message || 'Network error while adding package');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Box size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Add New Package</h2>
              <p className="text-xs text-muted-foreground">
                Enter package specifications, safety requirements & route details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Digital ID / Barcode <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={digitalId}
                onChange={(e) => setDigitalId(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                placeholder="CW-2026-PKG-..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Package Name / Description <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={`w-full px-3 py-2 bg-muted border rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none ${
                  errors.name ? 'border-destructive' : 'border-input'
                }`}
                placeholder="e.g. Industrial Motor Unit, Medical Crate"
              />
              {errors.name && <p className="text-[11px] text-destructive mt-0.5">{errors.name}</p>}
            </div>
          </div>

          {/* Dimensions & Weight */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
            <span className="text-xs font-bold text-foreground block">
              Dimensions & Weight (Cargo Metrics)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Length (cm) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.length && <p className="text-[10px] text-destructive mt-0.5">{errors.length}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Width (cm) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.width && <p className="text-[10px] text-destructive mt-0.5">{errors.width}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Height (cm) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.height && <p className="text-[10px] text-destructive mt-0.5">{errors.height}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Weight (kg) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.weight && <p className="text-[10px] text-destructive mt-0.5">{errors.weight}</p>}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Volume: {(((parseFloat(length) || 0) * (parseFloat(width) || 0) * (parseFloat(height) || 0)) / 1000000).toFixed(3)} m³ · Density:{' '}
              {(((parseFloat(weight) || 0) / (((parseFloat(length) || 0) * (parseFloat(width) || 0) * (parseFloat(height) || 0)) / 1000000 || 1))).toFixed(1)} kg/m³
            </p>
          </div>

          {/* Fragility, Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Fragility Level
              </label>
              <select
                value={fragilityLevel}
                onChange={(e) => setFragilityLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">LOW — Standard Rigid</option>
                <option value="MEDIUM">MEDIUM — Moderate Care</option>
                <option value="HIGH">HIGH — Fragile Handling</option>
                <option value="FRAGILE">FRAGILE — Top Tier Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Delivery Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">LOW — Economy</option>
                <option value="NORMAL">NORMAL — Standard</option>
                <option value="HIGH">HIGH — Express</option>
                <option value="URGENT">URGENT — Critical SLA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="PENDING">PENDING (In Warehouse)</option>
                <option value="STAGED">STAGED (At Bay)</option>
              </select>
            </div>
          </div>

          {/* Destination & Sequence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Destination <span className="text-destructive">*</span>
              </label>
              <div className="space-y-1.5">
                <select
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setCustomDestination('');
                  }}
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {COMMON_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom Destination...</option>
                </select>
                {destination === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    placeholder="Enter custom destination city or hub"
                    className="w-full px-3 py-1.5 bg-background border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stop / Sequence
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={deliverySequence}
                onChange={(e) => setDeliverySequence(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Stop # (1 = first unload)</p>
            </div>
          </div>

          {/* Stacking Note & Special Handling */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Special Handling / Stacking Requirements
            </label>
            <input
              type="text"
              value={stackingNote}
              onChange={(e) => setStackingNote(e.target.value)}
              placeholder="e.g. Keep upright, Cushion with air dunnage, Bottom floor layer only"
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Package...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Add Package</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
