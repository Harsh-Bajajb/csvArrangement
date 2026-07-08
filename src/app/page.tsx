import CsvUploader from '@/components/CsvUploader';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl mb-12 text-center relative z-10">
        <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium tracking-wide">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          AI-Powered CRM Importer
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 tracking-tight mb-6 leading-tight">
          Effortlessly map any messy CSV <br className="hidden sm:block" />
          <span className="text-blue-600 bg-none bg-clip-border">straight into your CRM.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Securely upload your CSV files to instantly preview your data, then let our AI intuitively parse, standardize, and map your arbitrary columns into the strict GrowEasy schema.
        </p>
      </div>
      
      <div className="w-full relative z-10">
        <CsvUploader />
      </div>
    </main>
  );
}
