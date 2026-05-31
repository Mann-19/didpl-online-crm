import { Construction, Sparkles } from 'lucide-react';

export default function InvestorsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
        <div className="relative mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <Construction className="w-12 h-12 text-indigo-600" />
          <div className="absolute top-0 right-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Coming Soon</h1>
        
        <p className="text-gray-500 leading-relaxed">
          The Investors module is currently under construction. We are building a powerful new way to manage and track investor databases. Stay tuned!
        </p>
        
        <div className="pt-4">
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 w-1/3 rounded-full animate-pulse" />
          </div>
          <p className="text-xs text-gray-400 mt-3 uppercase tracking-wider font-semibold">Development in Progress</p>
        </div>
      </div>
    </div>
  );
}
