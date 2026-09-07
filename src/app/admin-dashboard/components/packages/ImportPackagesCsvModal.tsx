'use client';
import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Package } from '@/lib/types';

interface ImportPackagesCsvModalProps {
  onClose: () => void;
  onPackagesImported: (packages: Package[]) => void;
}

interface ParsedRow {
  rowNumber: number;
  data: any;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_CSV = `name,length,width,height,weight,fragility,priority,destination,delivery_sequence,stacking_note
Solar Inverter Unit,90,70,60,110,MEDIUM,HIGH,Mumbai,1,Keep upright
Laboratory Centrifuge,55,45,40,28,FRAGILE,URGENT,Delhi,2,TOP TIER ONLY — FRAGILE
Industrial Cable Spool,120,120,80,340,LOW,NORMAL,Pune,3,Floor placement only
Biotech Reagents Cooler,50,40,35,16,HIGH,URGENT,Chennai,4,Temperature sensitive
Precision Lathe Chuck,75,65,50,85,LOW,NORMAL,Mumbai,5,Heavy steel component`;

export default function ImportPackagesCsvModal({
  onClose,
  onPackagesImported,
}: ImportPackagesCsvModalProps) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'UPLOAD' | 'PREVIEW'>('UPLOAD');
  const [isImporting, setIsImporting] = useState(false);

  // Parse CSV line handling potential quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const validateCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      toast.error('CSV must contain a header row and at least one data row.');
      return false;
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const required = ['name', 'length', 'width', 'height', 'weight', 'destination'];
    const missingHeaders = required.filter((r) => !headers.includes(r));

    if (missingHeaders.length > 0) {
      toast.error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
      return false;
    }

    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
      });

      const rowErrors: string[] = [];

      // Validate fields
      if (!rowObj.name || rowObj.name.trim() === '') {
        rowErrors.push('Missing package name');
      }

      const l = parseFloat(rowObj.length);
      const w = parseFloat(rowObj.width);
      const h = parseFloat(rowObj.height);
      const wt = parseFloat(rowObj.weight);

      if (isNaN(l) || l <= 0) rowErrors.push(`Invalid length (${rowObj.length})`);
      if (isNaN(w) || w <= 0) rowErrors.push(`Invalid width (${rowObj.width})`);
      if (isNaN(h) || h <= 0) rowErrors.push(`Invalid height (${rowObj.height})`);
      if (isNaN(wt) || wt <= 0) rowErrors.push(`Invalid weight (${rowObj.weight})`);

      if (!rowObj.destination || rowObj.destination.trim() === '') {
        rowErrors.push('Missing destination');
      }

      const fragility = (rowObj.fragility || rowObj.fragility_level || 'LOW').toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH', 'FRAGILE'].includes(fragility)) {
        rowObj.fragility = 'LOW';
      } else {
        rowObj.fragility = fragility;
      }

      const priority = (rowObj.priority || 'NORMAL').toUpperCase();
      if (!['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
        rowObj.priority = 'NORMAL';
      } else {
        rowObj.priority = priority;
      }

      const seq = parseInt(rowObj.delivery_sequence || rowObj.deliverysequence || '1', 10);
      rowObj.delivery_sequence = isNaN(seq) || seq < 1 ? 1 : seq;

      parsed.push({
        rowNumber: i + 1,
        data: {
          digitalId: rowObj.digital_id || rowObj.digitalid || undefined,
          name: rowObj.name,
          length: l,
          width: w,
          height: h,
          weight: wt,
          fragilityLevel: rowObj.fragility,
          priority: rowObj.priority,
          destination: rowObj.destination,
          deliverySequence: rowObj.delivery_sequence,
          stackingNote: rowObj.stacking_note || rowObj.stackingnote || '',
          status: 'PENDING',
        },
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }

    setParsedRows(parsed);
    setStep('PREVIEW');
    return true;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      validateCsv(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'cargowala_packages_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    const validItems = parsedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validItems.length === 0) {
      toast.error('No valid rows found to import.');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: validItems }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Batch import failed');
      }

      toast.success(`Successfully imported ${result.count} packages into warehouse!`);
      onPackagesImported(result.packages || []);
      onClose();
    } catch (err: any) {
      console.error('CSV import error:', err);
      toast.error(err.message || 'Failed to import CSV packages');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Import Packages from CSV</h2>
              <p className="text-xs text-muted-foreground">
                Batch import parcel manifests with automated schema validation
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

        {/* Content */}
        {step === 'UPLOAD' ? (
          <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
            {/* Dropzone */}
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 text-center flex flex-col items-center justify-center bg-muted/20">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Upload size={22} />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">
                Upload CSV Manifest File
              </h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Drag and drop your parcel CSV file here, or click browse to validate and import.
              </p>
              <label className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                <span>Browse Files</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Template & Paste helper */}
            <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Need the CSV template format?
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Includes name, length, width, height, weight, fragility, priority, destination
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 bg-background border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Download Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCsvText(SAMPLE_CSV);
                    validateCsv(SAMPLE_CSV);
                  }}
                  className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Use Sample Data
                </button>
              </div>
            </div>

            {/* Manual text paste */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Or Paste CSV Content Directly:
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,length,width,height,weight,fragility,priority,destination..."
                className="w-full p-2.5 bg-muted border border-input rounded-lg text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
              {csvText.trim() && (
                <button
                  onClick={() => validateCsv(csvText)}
                  className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <span>Validate CSV Data</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Validation Preview */
          <div className="p-5 space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Summary badges */}
            <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-positive">
                  <CheckCircle2 size={16} />
                  <span>{validCount} Valid Records</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertTriangle size={16} />
                    <span>{invalidCount} Invalid Rows (will be skipped)</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setStep('UPLOAD')}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Change File
              </button>
            </div>

            {/* Records table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto border border-border rounded-xl scrollbar-thin max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border sticky top-0">
                  <tr>
                    <th className="p-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="p-2.5 font-semibold text-muted-foreground">Name</th>
                    <th className="p-2.5 font-semibold text-muted-foreground">Dims (L×W×H)</th>
                    <th className="p-2.5 font-semibold text-muted-foreground">Weight</th>
                    <th className="p-2.5 font-semibold text-muted-foreground">Fragility</th>
                    <th className="p-2.5 font-semibold text-muted-foreground">Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-muted/30 transition-colors ${
                        !row.isValid ? 'bg-destructive/5' : ''
                      }`}
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-positive font-bold bg-positive/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-destructive font-bold bg-destructive/10 px-2 py-0.5 rounded-full"
                            title={row.errors.join(', ')}
                          >
                            <AlertCircle size={10} /> Error
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold text-foreground">
                        {row.data.name || '—'}
                        {!row.isValid && (
                          <span className="block text-[10px] text-destructive mt-0.5">
                            {row.errors.join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {row.data.length && row.data.width && row.data.height
                          ? `${row.data.length}×${row.data.width}×${row.data.height} cm`
                          : '—'}
                      </td>
                      <td className="p-2.5 font-medium text-foreground">
                        {row.data.weight ? `${row.data.weight} kg` : '—'}
                      </td>
                      <td className="p-2.5 text-muted-foreground">{row.data.fragilityLevel}</td>
                      <td className="p-2.5 text-muted-foreground truncate max-w-[150px]">
                        {row.data.destination}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Ready to insert {validCount} verified packages into database.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={validCount === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shadow-sm"
                >
                  {isImporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirm & Import ({validCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
