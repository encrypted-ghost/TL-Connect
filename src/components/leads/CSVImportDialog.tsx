import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '../../lib/apiClient';

interface CSVImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CSVImportDialog({ isOpen, onOpenChange, onSuccess }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setStep('upload');
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV file');
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5));
        setStep('preview');
      },
      error: (error) => {
        toast.error('Error parsing CSV: ' + error.message);
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const leads = results.data.map((row: any) => ({
            email: row.email || row.Email || row['E-mail'] || row['EMAIL'],
            firstName: row.firstName || row.first_name || row['First Name'] || row['FirstName'] || (row.Name ? row.Name.split(' ')[0] : ''),
            lastName: row.lastName || row.last_name || row['Last Name'] || row['LastName'] || (row.Name ? row.Name.split(' ').slice(1).join(' ') : ''),
            title: row.title || row.Title || row.job_title || row['Job Title'],
            companyName: row.company || row.companyName || row.company_name || row.CompanyName || row['Company Name'] || row['Company'] || row['Organization'],
            category: row.category || row.Category || row.segment || row['Category'] || 'Outbound',
            phone: row.phone || row.phoneNumber || row['Phone Number'] || row.Phone,
            linkedinUrl: row.linkedin || row.linkedinUrl || row.linkedin_url || row['LinkedIn'] || row['Linkedin URL'],
            notes: row.notes || row.Notes
          })).filter((l: any) => l.email);

          if (leads.length === 0) {
            toast.error('No valid leads found in CSV (email is required)');
            setIsLoading(false);
            return;
          }

          const response = await apiClient.post('/leads/bulk', { leads });
          toast.success(`Successfully imported ${leads.length} leads`);
          onSuccess();
          onOpenChange(false);
          reset();
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Import failed');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'text/csv' && !droppedFile.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV file');
        return;
      }
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) reset();
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-neutral-950 border-neutral-800">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} className="text-indigo-400" />
            Import Leads from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk add leads to your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' ? (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-800 rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-neutral-900/50 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="text-neutral-500 group-hover:text-indigo-400" size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Click to upload or drag & drop</p>
                <p className="text-xs text-neutral-500 mt-1">Accepts .CSV files up to 10MB</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" 
                accept=".csv"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <FileText className="text-green-500" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white max-w-[200px] truncate">{file?.name}</p>
                    <p className="text-xs text-neutral-500">{(file?.size || 0) / 1024 > 1024 ? ((file?.size || 0) / (1024 * 1024)).toFixed(1) + 'MB' : ((file?.size || 0) / 1024).toFixed(1) + 'KB'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>Change</Button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Preview (First 5 Rows)</p>
                <div className="border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-900 border-b border-neutral-800">
                      <tr>
                        {preview.length > 0 && Object.keys(preview[0]).slice(0, 4).map(key => (
                          <th key={key} className="px-3 py-2 font-medium text-neutral-400">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {preview.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-900/50 transition-colors">
                          {Object.values(row).slice(0, 4).map((val: any, j) => (
                            <td key={j} className="px-3 py-2 text-neutral-300 truncate max-w-[100px]">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-neutral-500 italic">
                  * Note: We automatically map columns like Email, FirstName, etc.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-neutral-900/30 border-t border-neutral-800">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          {step === 'preview' && (
            <Button variant="white" onClick={handleImport} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
