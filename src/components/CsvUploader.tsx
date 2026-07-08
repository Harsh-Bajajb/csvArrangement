'use client';

import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, AlertCircle, FileSpreadsheet, X, Loader2, ArrowRight } from 'lucide-react';
import DataTable from './DataTable';
import ImportResult from './ImportResult';

interface CsvData {
  headers: string[];
  rows: any[];
}

export default function CsvUploader() {
  // Parsing states
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Import states
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    setCsvData(null);
    setImportResult(null);
    setImportError(null);
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // limit preview to first 100 rows for performance
      preview: 100, 
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Failed to parse CSV: ${results.errors[0].message}`);
          return;
        }
        
        if (results.data.length === 0) {
          setError('The uploaded CSV file is empty.');
          return;
        }

        const headers = Object.keys(results.data[0] as any);
        setCsvData({
          headers,
          // We save all rows in state.
          rows: results.data
        });
      },
      error: (err: any) => {
        setError(`Failed to read file: ${err.message}`);
      }
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };
  
  const resetUpload = () => {
    setCsvData(null);
    setFileName(null);
    setError(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!csvData || csvData.rows.length === 0) return;
    
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(csvData.rows),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Import successful:', result);
      setImportResult(result);
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportError(err.message || 'An unexpected error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  // If import succeeded, render the Result View
  if (importResult) {
    return <ImportResult result={importResult} onReset={resetUpload} />;
  }

  // Otherwise, render the Upload / Preview View
  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* Upload Zone */}
      {!csvData && (
        <div 
          className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group ${
            isDragging 
              ? 'border-blue-500 bg-blue-50/50' 
              : error 
                ? 'border-red-300 bg-red-50/30 hover:border-red-400 hover:bg-red-50/50' 
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleChange}
          />
          
          <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {isDragging ? 'Drop your CSV here' : 'Drag & drop a CSV file'}
          </h3>
          <p className="text-slate-500 text-sm max-w-xs">
            Or click to browse from your computer. Only .csv files are supported.
          </p>
        </div>
      )}

      {/* Parse Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 text-red-700 bg-red-50 border border-red-200 rounded-lg opacity-100 transition-opacity duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Import Error Message */}
      {importError && (
        <div className="flex items-center gap-3 p-4 text-red-700 bg-red-50 border border-red-200 rounded-lg opacity-100 transition-opacity duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Import failed</p>
            <p className="text-red-600 mt-0.5">{importError}</p>
          </div>
        </div>
      )}

      {/* Data Preview */}
      {csvData && (
        <DataTable 
          title={fileName || 'Uploaded CSV'}
          subtitle={`Previewing first ${csvData.rows.length} rows`}
          icon={<FileSpreadsheet className="w-5 h-5" />}
          headers={csvData.headers}
          rows={csvData.rows}
          actions={
            <>
              <button 
                onClick={resetUpload}
                disabled={isImporting}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium w-full sm:w-auto disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              <button 
                onClick={handleConfirmImport}
                disabled={isImporting || csvData.rows.length === 0}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium w-full sm:w-auto shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Confirm Import
                  </>
                )}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
