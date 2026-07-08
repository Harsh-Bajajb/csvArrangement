import React from 'react';

interface DataTableProps {
  headers: string[];
  rows: any[];
  title?: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function DataTable({ headers, rows, title, subtitle, icon, actions }: DataTableProps) {
  return (
    <div className="space-y-4 opacity-100 transition-opacity duration-500">
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{title}</h3>}
              {subtitle && (typeof subtitle === 'string' ? <p className="text-xs text-slate-500">{subtitle}</p> : subtitle)}
            </div>
          </div>
          
          {actions && (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full relative">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-600 uppercase bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                <th className="px-6 py-4 font-semibold border-b border-r border-slate-200 bg-slate-50/95 backdrop-blur-sm sticky left-0 z-20 w-12 text-center text-slate-400">#</th>
                {headers.map((header, i) => (
                  <th key={i} className="px-6 py-4 font-semibold border-b border-slate-200 whitespace-nowrap bg-slate-50/95 backdrop-blur-sm">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1} className="px-6 py-8 text-center text-slate-500 italic">
                    No data to display.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-3 border-r border-slate-100 whitespace-nowrap text-slate-400 font-mono text-xs text-center bg-white group-hover:bg-slate-50/80 transition-colors sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">
                      {rowIndex + 1}
                    </td>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} className="px-6 py-3 whitespace-nowrap text-slate-700">
                        {row[header] !== undefined && row[header] !== null && String(row[header]).trim() !== ''
                          ? String(row[header]).length > 50 
                            ? String(row[header]).substring(0, 50) + '...' 
                            : String(row[header])
                          : <span className="text-slate-300 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
