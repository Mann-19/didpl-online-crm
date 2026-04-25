'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, TrendingUp, Percent, Wallet, Download } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { exportToPDF } from '@/utils/pdf/exportToPDF';

export default function CommissionClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState('booking_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = [...data]
    .filter(r => {
      const s = search.toLowerCase();
      const matchText = (r.consultant_name || '').toLowerCase().includes(s) ||
        (r.client_name || '').toLowerCase().includes(s) ||
        (r.plot_number || '').toLowerCase().includes(s) ||
        (r.consultant_code || '').toLowerCase().includes(s);
      const matchDate = (!startDate || r.booking_date >= startDate) && (!endDate || r.booking_date <= endDate);
      return matchText && matchDate;
    })
    .sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalEarned = filtered.reduce((s, r) => s + r.commission_earned, 0);
  const totalTDS = filtered.reduce((s, r) => s + r.tds, 0);
  const totalNet = filtered.reduce((s, r) => s + r.net_payable, 0);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleExport = () => {
    exportToPDF({
      title: 'Commission Report',
      filename: 'Commission_Report',
      data: filtered,
      headers: [
        { label: 'Date', key: (r) => fmt(r.booking_date) },
        { label: 'Consultant', key: 'consultant_name' },
        { label: 'Client', key: 'client_name' },
        { label: 'Project', key: 'project_name' },
        { label: 'Plot No.', key: 'plot_number' },
        { label: 'Rate', key: (r) => `${r.commission_rate}%` },
        { label: 'Deal Value', key: (r) => `Rs. ${formatNumber(r.deal_value)}` },
        { label: 'Earned', key: (r) => `Rs. ${formatNumber(r.commission_earned)}` },
        { label: 'TDS', key: (r) => `Rs. ${formatNumber(r.tds)}` },
        { label: 'Net', key: (r) => `Rs. ${formatNumber(r.net_payable)}` },
        { label: 'Paid Out', key: (r) => `Rs. ${formatNumber(r.paid_out)}` },
        { label: 'Balance', key: (r) => `Rs. ${formatNumber(r.balance_due)}` }
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
            <h1 className="text-3xl font-bold text-gray-900">Commission Report</h1>
            <p className="text-gray-500 mt-1">Consultant commission breakdown per booking.</p>
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
            { label: 'Commission Earned', value: totalEarned, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total TDS (2%)', value: totalTDS, icon: Percent, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Net Payable', value: totalNet, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-6 h-6" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>₹{formatNumber(s.value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search consultant, client, plot..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={startDate} onChange={e => setStartDate(e.target.value)} />
              <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={endDate} onChange={e => setEndDate(e.target.value)} />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={sortKey} onChange={e => setSortKey(e.target.value)}>
                <option value="booking_date">Sort: Date</option>
                <option value="consultant_name">Sort: Consultant</option>
                <option value="commission_earned">Sort: Earned</option>
                <option value="balance_due">Sort: Balance Due</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 min-w-[70px]">
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Consultant</th>
                  <th className="px-4 py-3 text-left">Client / Plot</th>
                  <th className="px-4 py-3 text-center">Rate</th>
                  <th className="px-4 py-3 text-right">Deal Value</th>
                  <th className="px-4 py-3 text-right text-emerald-600">Earned</th>
                  <th className="px-4 py-3 text-right text-red-600">TDS</th>
                  <th className="px-4 py-3 text-right text-blue-600">Net</th>
                  <th className="px-4 py-3 text-right">Paid Out</th>
                  <th className="px-4 py-3 text-right text-orange-600">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-gray-400">No commission records found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.booking_id} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-4 py-3 text-gray-600">{fmt(r.booking_date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.consultant_name}</div>
                      <div className="text-xs text-gray-400">{r.consultant_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{r.client_name}</div>
                      <div className="text-xs text-gray-400">{r.project_name} — Plot {r.plot_number}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-700">{r.commission_rate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{formatNumber(r.deal_value)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{formatNumber(r.commission_earned)}</td>
                    <td className="px-4 py-3 text-right text-red-500">₹{formatNumber(r.tds)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">₹{formatNumber(r.net_payable)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{formatNumber(r.paid_out)}</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">₹{formatNumber(r.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} Records</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{formatNumber(totalEarned)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">₹{formatNumber(totalTDS)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">₹{formatNumber(totalNet)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
