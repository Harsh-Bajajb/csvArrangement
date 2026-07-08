import CsvUploader from '@/components/CsvUploader';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          GrowEasy CSV Importer
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Securely upload your CSV files to quickly preview and manage your data on the client side.
        </p>
      </div>
      
      <CsvUploader />
    </main>
  );
}
