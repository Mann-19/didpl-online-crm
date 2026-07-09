'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Phone, AlertCircle, Wallet, CheckCircle2, Download } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { parseFee } from '@/utils/parseFee';
import { exportToPDF } from '@/utils/pdf/exportToPDF';

export default function RecoveryClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('balance_due');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [projectFilter, setProjectFilter] = useState('');

  const uniqueProjects = Array.from(new Set(data.map(r => r.project_name).filter(Boolean))).sort() as string[];

  const [showStampDuty, setShowStampDuty] = useState(false);
  const [showLegalFees, setShowLegalFees] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const filtered = [...data]
    .filter(r => {
      const s = search.toLowerCase();
      const matchText = (r.name || '').toLowerCase().includes(s) ||
        (r.plot_number || '').toLowerCase().includes(s) ||
        (r.project_name || '').toLowerCase().includes(s) ||
        (r.phone || '').includes(s);
      const matchProject = !projectFilter || r.project_name === projectFilter;
      return matchText && matchProject;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPending = filtered.reduce((s, r) => s + r.balance_due, 0);
  const totalDeal = filtered.reduce((s, r) => s + r.total_amount, 0);
  const totalPaid = filtered.reduce((s, r) => s + r.amount_paid, 0);
  const rate = totalDeal > 0 ? ((totalPaid / totalDeal) * 100).toFixed(1) : '0';

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleExport = () => {
    const headers = [
      { label: 'Client', key: 'name' },
      { label: 'Phone', key: (r: any) => r.phone || 'No Phone' },
      { label: 'Project', key: 'project_name' },
      { label: 'Plot No.', key: 'plot_number' },
      { label: 'Booking Date', key: (r: any) => fmt(r.booking_date) },
      { label: 'Deal Value', key: (r: any) => `Rs. ${formatNumber(r.total_amount)}` },
      { label: 'Paid Amount', key: (r: any) => `Rs. ${formatNumber(r.amount_paid)}` },
      { label: 'Balance Due', key: (r: any) => `Rs. ${formatNumber(r.balance_due)}` }
    ];

    if (showStampDuty) headers.push({ label: 'Stamp Duty Balance', key: (r: any) => {
      const amt = parseFee(r.booking_fees?.stamp_duty, r.total_amount);
      const paid = r.payments?.filter((p: any) => p.payment_type === 'Stamp duty fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
      return `Rs. ${formatNumber(amt - paid)}`;
    }});
    if (showLegalFees) headers.push({ label: 'Legal Fees Balance', key: (r: any) => {
      const amt = parseFee(r.booking_fees?.gov_fees, r.total_amount); // TEMPORARY_GOV_FEES_V200
      const paid = r.payments?.filter((p: any) => p.payment_type === 'Gov fees' || p.payment_type === 'Legal fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
      return `Rs. ${formatNumber(amt - paid)}`;
    }});
    if (showMaintenance) headers.push({ label: 'Maintenance Balance', key: (r: any) => {
      const amt = parseFee(r.booking_fees?.maintenance_fees, r.total_amount);
      const paid = r.payments?.filter((p: any) => p.payment_type === 'Maintenance fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
      return `Rs. ${formatNumber(amt - paid)}`;
    }});
    if (showRegistration) headers.push({ label: 'Registration Balance', key: (r: any) => {
      const amt = parseFee(r.booking_fees?.registration_fees, r.total_amount);
      const paid = r.payments?.filter((p: any) => p.payment_type === 'Registration fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
      return `Rs. ${formatNumber(amt - paid)}`;
    }});

    exportToPDF({
      title: 'Recovery Report',
      filename: 'Recovery_Report',
      data: filtered,
      headers
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
            <h1 className="text-3xl font-bold text-gray-900">Recovery Report</h1>
            <p className="text-gray-500 mt-1">All clients with outstanding balances — across both pending and confirmed bookings.</p>
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
          <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm border-l-4 border-l-red-500 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600"><AlertCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Amount Pending</p>
              <p className="text-2xl font-bold text-red-600">₹{formatNumber(totalPending)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Wallet className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Deal Value</p>
              <p className="text-2xl font-bold text-gray-900">₹{formatNumber(totalDeal)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Collection Health</p>
              <p className="text-2xl font-bold text-emerald-600">{rate}%</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search client, phone, plot..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="balance_due">Sort: Balance Due</option>
              <option value="name">Sort: Client Name</option>
              <option value="total_amount">Sort: Deal Value</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
              <option value="">All Projects</option>
              {uniqueProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 min-w-[70px]">
              {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 px-4 pb-4 pt-1">
            {/* <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Include Fee Recoveries:</span> */}
            {/* TEMPORARY_GOV_FEES_V200: Hidden checkboxes
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={showStampDuty} onChange={e => setShowStampDuty(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
              Stamp Duty
            </label>
            */}
            {/* <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={showLegalFees} onChange={e => setShowLegalFees(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
              Legal Fees
            </label> */}
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

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Client</th>
                  <th className="px-5 py-3 text-left">Plot</th>
                  <th className="px-5 py-3 text-left">Booking Status</th>
                  <th className="px-5 py-3 text-right">Deal Value</th>
                  <th className="px-5 py-3 text-right text-orange-600">Discount</th>
                  <th className="px-5 py-3 text-right text-emerald-600">Paid</th>
                  <th className="px-5 py-3 text-right text-red-600">Balance Due</th>
                  {showStampDuty && <th className="px-5 py-3 text-right text-gray-500 min-w-[120px]">Stamp Duty<br/>Balance</th>}
                  {showLegalFees && <th className="px-5 py-3 text-right text-gray-500 min-w-[120px]">Legal Fees<br/>Balance</th>}
                  {showMaintenance && <th className="px-5 py-3 text-right text-gray-500 min-w-[120px]">Maintenance<br/>Balance</th>}
                  {showRegistration && <th className="px-5 py-3 text-right text-gray-500 min-w-[120px]">Registration<br/>Balance</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">No pending balances. All clear!</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{r.name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Phone className="w-3 h-3" />{r.phone || 'No Phone'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-800">Plot {r.plot_number}</div>
                      <div className="text-xs text-gray-500">{r.project_name}</div>
                      <div className="text-xs text-gray-400">Booked: {fmt(r.booking_date)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                        r.booking_status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.booking_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-700">₹{formatNumber(r.total_amount)}</td>
                    <td className="px-5 py-4 text-right font-medium text-orange-600">₹{formatNumber(r.discount_amount)}</td>
                    <td className="px-5 py-4 text-right font-medium text-emerald-600">₹{formatNumber(r.amount_paid)}</td>
                    <td className="px-5 py-4 text-right font-bold text-red-600 bg-red-50/30 group-hover:bg-red-50 transition-colors">
                      ₹{formatNumber(r.balance_due)}
                    </td>
                    {showStampDuty && (() => {
                      const amt = parseFee(r.booking_fees?.stamp_duty, r.total_amount);
                      const paid = r.payments?.filter((p: any) => p.payment_type === 'Stamp duty fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
                      return <td className="px-5 py-4 text-right font-bold text-gray-600 bg-gray-50/50">₹{formatNumber(Math.max(0, amt - paid))}</td>;
                    })()}
                    {showLegalFees && (() => {
                      const amt = parseFee(r.booking_fees?.gov_fees, r.total_amount); // TEMPORARY_GOV_FEES_V200
                      const paid = r.payments?.filter((p: any) => p.payment_type === 'Gov fees' || p.payment_type === 'Legal fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
                      return <td className="px-5 py-4 text-right font-bold text-gray-600 bg-gray-50/50">₹{formatNumber(Math.max(0, amt - paid))}</td>;
                    })()}
                    {showMaintenance && (() => {
                      const amt = parseFee(r.booking_fees?.maintenance_fees, r.total_amount);
                      const paid = r.payments?.filter((p: any) => p.payment_type === 'Maintenance fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
                      return <td className="px-5 py-4 text-right font-bold text-gray-600 bg-gray-50/50">₹{formatNumber(Math.max(0, amt - paid))}</td>;
                    })()}
                    {showRegistration && (() => {
                      const amt = parseFee(r.booking_fees?.registration_fees, r.total_amount);
                      const paid = r.payments?.filter((p: any) => p.payment_type === 'Registration fees').reduce((s: number, p: any) => s + p.amount, 0) || 0;
                      return <td className="px-5 py-4 text-right font-bold text-gray-600 bg-gray-50/50">₹{formatNumber(Math.max(0, amt - paid))}</td>;
                    })()}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} Records</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-emerald-700">₹{formatNumber(totalPaid)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-700">₹{formatNumber(totalPending)}</td>
                  {showStampDuty && (
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-700">
                      ₹{formatNumber(filtered.reduce((sum, r) => sum + Math.max(0, parseFee(r.booking_fees?.stamp_duty, r.total_amount) - (r.payments?.filter((p: any) => p.payment_type === 'Stamp duty fees').reduce((s: number, p: any) => s + p.amount, 0) || 0)), 0))}
                    </td>
                  )}
                  {showLegalFees && (
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-700">
                      ₹{formatNumber(filtered.reduce((sum, r) => sum + Math.max(0, parseFee(r.booking_fees?.gov_fees, r.total_amount) - (r.payments?.filter((p: any) => p.payment_type === 'Gov fees' || p.payment_type === 'Legal fees').reduce((s: number, p: any) => s + p.amount, 0) || 0)), 0))}
                    </td>
                  )}
                  {showMaintenance && (
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-700">
                      ₹{formatNumber(filtered.reduce((sum, r) => sum + Math.max(0, parseFee(r.booking_fees?.maintenance_fees, r.total_amount) - (r.payments?.filter((p: any) => p.payment_type === 'Maintenance fees').reduce((s: number, p: any) => s + p.amount, 0) || 0)), 0))}
                    </td>
                  )}
                  {showRegistration && (
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-700">
                      ₹{formatNumber(filtered.reduce((sum, r) => sum + Math.max(0, parseFee(r.booking_fees?.registration_fees, r.total_amount) - (r.payments?.filter((p: any) => p.payment_type === 'Registration fees').reduce((s: number, p: any) => s + p.amount, 0) || 0)), 0))}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
