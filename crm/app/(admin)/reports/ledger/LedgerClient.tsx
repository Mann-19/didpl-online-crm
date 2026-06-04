'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Calendar, ArrowDownLeft, ArrowUpRight, Wallet, Download } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { exportToPDF } from '@/utils/pdf/exportToPDF';

export default function LedgerClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState('payment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [txType, setTxType] = useState('');

  const [showStampDuty, setShowStampDuty] = useState(false);
  const [showLegalFees, setShowLegalFees] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const filtered = data
    .filter(r => {
      const s = search.toLowerCase();
      const matchText = (r.client_name || '').toLowerCase().includes(s) ||
        (r.plot_number || '').toLowerCase().includes(s) ||
        (r.payment_mode || '').toLowerCase().includes(s) ||
        (r.description || '').toLowerCase().includes(s);
      const matchDate = (!startDate || r.payment_date >= startDate) && (!endDate || r.payment_date <= endDate);
      const matchType = !txType || r.transaction_type === txType;
      
      // Fee toggle logic
      let feeMatch = true;
      // TEMPORARY_GOV_FEES_V200
      // if (r.payment_type === 'Stamp duty fees' && !showStampDuty) feeMatch = false;
      if ((r.payment_type === 'Gov fees' || r.payment_type === 'Legal fees') && !showLegalFees) feeMatch = false;
      // if (r.payment_type === 'Maintenance fees' && !showMaintenance) feeMatch = false;
      // if (r.payment_type === 'Registration fees' && !showRegistration) feeMatch = false;

      return matchText && matchDate && matchType && feeMatch;
    })
    .sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (sortKey === 'amount') { va = Number(va); vb = Number(vb); }
      if (sortKey === 'payment_date') { va = new Date(va || 0); vb = new Date(vb || 0); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalCredit = filtered.filter(r => r.transaction_type === 'credit').reduce((s, r) => s + r.amount, 0);
  const totalDebit = filtered.filter(r => r.transaction_type === 'debit').reduce((s, r) => s + r.amount, 0);
  const net = totalCredit - totalDebit;

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleExport = () => {
    exportToPDF({
      title: 'General Ledger Report',
      filename: 'General_Ledger_Report',
      data: filtered,
      headers: [
        { label: 'Date', key: (r) => fmt(r.payment_date) },
        { label: 'Client / Entity', key: (r) => r.client_name || r.entity_type || 'Internal' },
        { label: 'Details', key: (r) => r.project_name ? `${r.project_name} — Plot ${r.plot_number}` : r.description || '—' },
        { label: 'Mode', key: 'payment_mode' },
        { label: 'Credit (+)', key: (r) => r.transaction_type === 'credit' ? `Rs. ${formatNumber(r.amount)}` : '—' },
        { label: 'Debit (-)', key: (r) => r.transaction_type === 'debit' ? `Rs. ${formatNumber(r.amount)}` : '—' }
      ]
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link href="/reports" className="inline-flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Reports
          </Link>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
            <p className="text-gray-500 mt-1">Master record of all financial transactions.</p>
          </div>
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Collected', value: totalCredit, icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Total Debited', value: totalDebit, icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            { label: 'Net Balance', value: net, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          ].map(s => (
            <div key={s.label} className={`bg-white p-5 rounded-xl border ${s.border} shadow-sm flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-full ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-6 h-6" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>₹{formatNumber(s.value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search client, plot, mode, description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={txType} onChange={e => setTxType(e.target.value)}>
                <option value="">All Types</option>
                <option value="credit">Credit (+)</option>
                <option value="debit">Debit (-)</option>
              </select>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Include Fee Transactions:</span>
              {/* TEMPORARY_GOV_FEES_V200: Hidden checkboxes
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showStampDuty} onChange={e => setShowStampDuty(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Stamp Duty
              </label>
              */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showLegalFees} onChange={e => setShowLegalFees(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Legal Fees
              </label>
              {/* TEMPORARY_GOV_FEES_V200: Hidden checkboxes
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showMaintenance} onChange={e => setShowMaintenance(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Maintenance
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showRegistration} onChange={e => setShowRegistration(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Registration
              </label>
              */}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 items-center pt-2 border-t border-gray-100">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={endDate} onChange={e => setEndDate(e.target.value)} />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={sortKey} onChange={e => setSortKey(e.target.value)}>
                <option value="payment_date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="payment_mode">Sort: Mode</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50">
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Particulars</th>
                  <th className="px-5 py-3 text-left">Mode</th>
                  <th className="px-5 py-3 text-right text-emerald-600">Credit (+)</th>
                  <th className="px-5 py-3 text-right text-red-600">Debit (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No transactions found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-600">{fmt(r.payment_date)}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{r.client_name || r.entity_type || 'Internal'}</div>
                      <div className="text-xs text-gray-400">
                        {r.project_name ? `${r.project_name} — Plot ${r.plot_number}` : r.description || '—'}
                      </div>
                      {r.payment_type && r.payment_type !== 'Plot payment' && (
                        <div className="text-xs text-amber-600 font-semibold mt-0.5">
                          {r.payment_type === 'Gov fees' ? 'Legal Fees' : r.payment_type}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">{r.payment_mode}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      {r.transaction_type === 'credit' ? `₹${formatNumber(r.amount)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">
                      {r.transaction_type === 'debit' ? `₹${formatNumber(r.amount)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Period Total ({filtered.length} records)</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-emerald-700">₹{formatNumber(totalCredit)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-700">₹{formatNumber(totalDebit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
