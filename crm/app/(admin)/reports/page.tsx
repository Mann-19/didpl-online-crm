import Link from 'next/link';
import { FileText, Percent, BookOpen, RefreshCcw, Map, BarChart3, ArrowRight, Receipt, ReceiptText } from 'lucide-react';

const reports = [
  { id: 'ledger', title: 'General Ledger', description: 'Complete transaction history — all credits and debits across the organization.', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', link: '/reports/ledger' },
  { id: 'recovery', title: 'Recovery Report', description: 'Outstanding balances and pending collections per client and plot.', icon: RefreshCcw, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', link: '/reports/recovery' },
  { id: 'booking', title: 'Booking Report', description: 'Project-wise plot availability, sold and token-paid counts.', icon: Map, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', link: '/reports/booking' },
  { id: 'commission', title: 'Commission Report', description: 'Consultant commissions earned, TDS deducted, and balance payable.', icon: Percent, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', link: '/reports/commission' },
  { id: 'receipts', title: 'Receipt Report', description: 'Detailed log of all incoming client payments and receipts.', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', link: '/reports/receipts' },
  { id: 'expenses', title: 'Expense Report', description: 'Complete record of organizational expenses and petty cash usage.', icon: ReceiptText, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', link: '/reports/expenses' },
];

export default function ReportsHubPage() {
  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-md bg-emerald-100 text-emerald-700"><BarChart3 className="w-6 h-6" /></div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
        </div>
        <p className="text-gray-500 max-w-2xl">Generate and view financial and operational reports.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {reports.map(r => (
          <Link key={r.id} href={r.link}
            className={`group block bg-white rounded-xl border ${r.border} p-6 hover:shadow-md transition-all duration-200 hover:border-emerald-200`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${r.bg} ${r.color}`}><r.icon className="w-6 h-6" /></div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">{r.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{r.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
