'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, TrendingUp, Percent, Wallet, Download, HandCoins, CheckCircle2, X } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { exportToPDF } from '@/utils/pdf/exportToPDF';
import { addConsultantPayout } from '@/app/(admin)/people.actions';

const fmt = (d: string) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

export default function CommissionClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState('payment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Payout modal state
  const [payoutRow, setPayoutRow] = useState<any | null>(null);
  const [payoutForm, setPayoutForm] = useState({ amount: '', payment_date: '', payment_mode: 'Bank Transfer', notes: '' });
  const [payoutSuccess, setPayoutSuccess] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = [...data]
    .filter(r => {
      const s = search.toLowerCase();
      const matchText =
        (r.consultant_name || '').toLowerCase().includes(s) ||
        (r.client_name || '').toLowerCase().includes(s) ||
        (r.plot_number || '').toLowerCase().includes(s) ||
        (r.project_name || '').toLowerCase().includes(s) ||
        (r.consultant_code || '').toLowerCase().includes(s);
      const matchDate =
        (!startDate || r.payment_date >= startDate) &&
        (!endDate || r.payment_date <= endDate);
      return matchText && matchDate;
    })
    .sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalCommission = filtered.reduce((s, r) => s + r.commission_amount, 0);
  const totalTDS = filtered.reduce((s, r) => s + r.tds_amount, 0);
  const totalNet = filtered.reduce((s, r) => s + r.net_payable, 0);
  const totalPayments = filtered.reduce((s, r) => s + r.payment_amount, 0);

  const openPayout = (row: any) => {
    setPayoutRow(row);
    setPayoutForm({
      amount: String(row.net_payable.toFixed(2)),
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Bank Transfer',
      notes: `Commission payout for Plot ${row.plot_number} — payment on ${fmt(row.payment_date)}`,
    });
    setPayoutSuccess('');
    setPayoutError('');
  };

  const handlePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutRow?.consultant_id) return;
    startTransition(async () => {
      const result = await addConsultantPayout({
        consultant_id: payoutRow.consultant_id,
        amount: parseFloat(payoutForm.amount) || 0,
        payment_date: payoutForm.payment_date,
        payment_mode: payoutForm.payment_mode,
        notes: payoutForm.notes,
        client_payment_id: payoutRow.payment_id,
      });
      if (result.success) {
        setPayoutSuccess('Payout recorded successfully');
        setTimeout(() => setPayoutRow(null), 1500);
      } else {
        setPayoutError(result.error || 'Failed to record payout');
      }
    });
  };

  const handleExport = () => {
    exportToPDF({
      title: 'Commission Report',
      filename: 'Commission_Report',
      data: filtered,
      headers: [
        { label: 'Date', key: (r: any) => fmt(r.payment_date) },
        { label: 'Consultant', key: 'consultant_name' },
        { label: 'Client', key: 'client_name' },
        { label: 'Project', key: 'project_name' },
        { label: 'Plot No.', key: 'plot_number' },
        { label: 'Rate', key: (r: any) => `${r.commission_rate}%` },
        { label: 'Payment', key: (r: any) => `Rs. ${formatNumber(r.payment_amount)}` },
        { label: 'Commission', key: (r: any) => `Rs. ${formatNumber(r.commission_amount)}` },
        { label: 'TDS', key: (r: any) => `Rs. ${formatNumber(r.tds_amount)}` },
        { label: 'Net Payable', key: (r: any) => `Rs. ${formatNumber(r.net_payable)}` },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/reports" className="inline-flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Commission Report</h1>
              <p className="text-gray-500 mt-1">Per-payment commission breakdown for each consultant.</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Client Payments', value: totalPayments, icon: Wallet, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Commission Earned', value: totalCommission, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'TDS Deducted (2%)', value: totalTDS, icon: Percent, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Net Payable', value: totalNet, icon: HandCoins, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase leading-tight">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>₹{formatNumber(s.value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search consultant, client, plot, project..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={endDate} onChange={e => setEndDate(e.target.value)} />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
            >
              <option value="payment_date">Sort: Date</option>
              <option value="consultant_name">Sort: Consultant</option>
              <option value="payment_amount">Sort: Payment Amount</option>
              <option value="commission_amount">Sort: Commission</option>
              <option value="net_payable">Sort: Net Payable</option>
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 min-w-[70px]"
            >
              {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Payment Date</th>
                  <th className="px-4 py-3 text-left">Consultant</th>
                  <th className="px-4 py-3 text-left">Client / Plot</th>
                  <th className="px-4 py-3 text-center">Rate</th>
                  <th className="px-4 py-3 text-right">Client Payment</th>
                  <th className="px-4 py-3 text-right text-emerald-600">Commission</th>
                  <th className="px-4 py-3 text-right text-red-500">TDS</th>
                  <th className="px-4 py-3 text-right text-blue-600">Net Payable</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">No commission records found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.payment_id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-3 text-gray-600">{fmt(r.payment_date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.consultant_name}</div>
                      <div className="text-xs text-gray-400">{r.consultant_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 font-medium">{r.client_name}</div>
                      <div className="text-xs text-gray-400">{r.project_name} — Plot {r.plot_number}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-700 font-bold">{r.commission_rate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">₹{formatNumber(r.payment_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{formatNumber(r.commission_amount)}</td>
                    <td className="px-4 py-3 text-right text-red-500">₹{formatNumber(r.tds_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">₹{formatNumber(r.net_payable)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.consultant_id && !r.is_paid_out ? (
                        <button
                          onClick={() => openPayout(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          <HandCoins className="w-3.5 h-3.5" /> Record Payout
                        </button>
                      ) : r.is_paid_out ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} payments</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-700">₹{formatNumber(totalPayments)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">₹{formatNumber(totalCommission)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-700">₹{formatNumber(totalTDS)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">₹{formatNumber(totalNet)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── PAYOUT MODAL ── */}
      {payoutRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Commission Payout</h2>
                <p className="text-sm text-gray-500 mt-0.5">To: <span className="font-semibold text-gray-800">{payoutRow.consultant_name}</span></p>
              </div>
              <button onClick={() => setPayoutRow(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context summary */}
            <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 space-y-1">
              <div className="flex justify-between"><span>Client Payment:</span><span className="font-bold">₹{formatNumber(payoutRow.payment_amount)}</span></div>
              <div className="flex justify-between"><span>Commission ({payoutRow.commission_rate}%):</span><span className="font-bold text-emerald-700">₹{formatNumber(payoutRow.commission_amount)}</span></div>
              <div className="flex justify-between"><span>TDS (2%):</span><span className="font-bold text-red-600">– ₹{formatNumber(payoutRow.tds_amount)}</span></div>
              <div className="flex justify-between border-t border-blue-200 pt-1"><span className="font-bold">Net Payable:</span><span className="font-bold text-blue-700">₹{formatNumber(payoutRow.net_payable)}</span></div>
            </div>

            <form onSubmit={handlePayout} className="px-6 pt-4 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payoutForm.amount}
                    onChange={e => setPayoutForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={payoutForm.payment_date}
                    onChange={e => setPayoutForm(p => ({ ...p, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
                <select
                  value={payoutForm.payment_mode}
                  onChange={e => setPayoutForm(p => ({ ...p, payment_mode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'NEFT', 'RTGS'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={payoutForm.notes}
                  onChange={e => setPayoutForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {payoutSuccess && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> {payoutSuccess}
                </div>
              )}
              {payoutError && (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{payoutError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPayoutRow(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {isPending ? 'Recording...' : 'Record Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
