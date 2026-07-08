'use client';

import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, AlertCircle, FileSpreadsheet, X } from 'lucide-react';

interface CsvData {
  headers: string[];
  rows: any[];
}

export default function CsvUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    setCsvData(null);
    
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 text-red-700 bg-red-50 border border-red-200 rounded-lg opacity-100 transition-opacity duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Data Preview */}
      {csvData && (
        <div className="space-y-4 opacity-100 transition-opacity duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{fileName}</h3>
                <p className="text-xs text-slate-500">Previewing first {csvData.rows.length} rows</p>
              </div>
            </div>
            <button 
              onClick={resetUpload}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium w-full sm:w-auto"
            >
              <X className="w-4 h-4" />
              Clear Selection
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full relative">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-slate-600 uppercase bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold border-b border-r border-slate-200 bg-slate-50/95 backdrop-blur-sm sticky left-0 z-20 w-12 text-center text-slate-400">#</th>
                    {csvData.headers.map((header, i) => (
                      <th key={i} className="px-6 py-4 font-semibold border-b border-slate-200 whitespace-nowrap bg-slate-50/95 backdrop-blur-sm">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-3 border-r border-slate-100 whitespace-nowrap text-slate-400 font-mono text-xs text-center bg-white group-hover:bg-slate-50/80 transition-colors sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">
                        {rowIndex + 1}
                      </td>
                      {csvData.headers.map((header, colIndex) => (
                        <td key={colIndex} className="px-6 py-3 whitespace-nowrap text-slate-700">
                          {row[header] !== undefined && row[header] !== null && String(row[header]).trim() !== ''
                            ? String(row[header]).length > 50 
                              ? String(row[header]).substring(0, 50) + '...' 
                              : String(row[header])
                            : <span className="text-slate-300 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
