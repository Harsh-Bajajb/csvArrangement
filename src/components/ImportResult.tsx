import React from 'react';
import DataTable from './DataTable';
import { Database, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ImportResultProps {
  result: {
    imported: any[];
    skipped: any[];
    totalImported: number;
    totalSkipped: number;
  };
  onReset: () => void;
}

const CRM_COLUMNS = [
  'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code', 
  'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 
  'crm_note', 'data_source', 'possession_time', 'description'
];

export default function ImportResult({ result, onReset }: ImportResultProps) {
  const { imported = [], skipped = [], totalImported = 0, totalSkipped = 0 } = result;

  // Dynamically get headers for skipped records to include 'reason' or raw columns
  const skippedHeaders = skipped.length > 0 ? Object.keys(skipped[0]) : [];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
      {/* Summary Stats Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Import Complete</h2>
          <p className="text-slate-500 mt-1">Here is the summary of your processed data.</p>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="text-center px-4 sm:px-8 py-2 border-r border-slate-200">
            <p className="text-3xl font-bold text-green-600">{totalImported}</p>
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide mt-1">Imported</p>
          </div>
          <div className="text-center px-4 sm:px-8 py-2">
            <p className="text-3xl font-bold text-amber-500">{totalSkipped}</p>
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide mt-1">Skipped</p>
          </div>
        </div>
        
        <button 
          onClick={onReset}
          className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium shadow-sm w-full md:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Start New Import
        </button>
      </div>

      {/* Imported Table */}
      <div className="space-y-2">
        <DataTable 
          title="Imported CRM Records"
          subtitle={
            <span className="text-xs text-slate-500">
              Successfully transformed and imported <span className="font-semibold text-slate-700">{imported.length}</span> records.
            </span>
          }
          icon={<Database className="w-5 h-5" />}
          headers={CRM_COLUMNS}
          rows={imported}
        />
      </div>

      {/* Skipped Table (Only show if there are skipped records) */}
      {skipped.length > 0 && (
        <div className="space-y-2 pt-4">
          <DataTable 
            title="Skipped Records"
            subtitle={
              <span className="text-xs text-slate-500">
                <span className="font-semibold text-amber-600">{skipped.length}</span> records were skipped due to validation failures or missing required fields.
              </span>
            }
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            headers={skippedHeaders}
            rows={skipped}
          />
        </div>
      )}
    </div>
  );
}
