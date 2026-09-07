'use client';
import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Package } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

interface DeleteConfirmModalProps {
  packageToDelete: Package;
  onClose: () => void;
  onConfirmDelete: (pkgId: string) => Promise<void> | void;
}

export default function DeleteConfirmModal({
  packageToDelete,
  onClose,
  onConfirmDelete,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete(packageToDelete.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete package');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Confirm Package Deletion</h2>
              <p className="text-xs text-muted-foreground">Permanent action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Are you sure you want to delete this package from the live system?
          </p>

          {/* Package Preview Card */}
          <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary">
                {packageToDelete.digitalId || packageToDelete.id}
              </span>
              <StatusBadge variant={packageToDelete.status as any} size="sm" />
            </div>
            <h4 className="text-sm font-bold text-foreground">{packageToDelete.name}</h4>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              <span>Weight: <strong className="text-foreground">{packageToDelete.weight} kg</strong></span>
              <span>Destination: <strong className="text-foreground">{packageToDelete.destination}</strong></span>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              This will remove the package record, allocation sequences, and live tracking data.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete Package</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
