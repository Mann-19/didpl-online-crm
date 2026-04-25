'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, CreditCard,
  Wallet, TrendingUp, Users, Briefcase, CheckCircle2,
  Receipt, Edit2, X, Save
} from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { updateConsultant, addConsultantPayout } from '../../people.actions';

const InfoRow = ({ label, value }: any) => (
  <div className="grid grid-cols-3 gap-4 items-start py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-0.5">{label}</span>
    <div className="col-span-2 text-sm font-medium text-gray-900">{value || <span className="text-gray-300 font-normal">—</span>}</div>
  </div>
);

const statusBadge = (status: string) => {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-500';
  return 'bg-amber-100 text-amber-700';
};

export default function ConsultantDetailClient({ consultant, isAdmin }: any) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: consultant.name || '',
    phone: consultant.phone || '',
    email: consultant.email || '',
    address: consultant.address || '',
    bank_name: consultant.bank_name || '',
    account_number: consultant.account_number || '',
    ifsc_code: consultant.ifsc_code || '',
    pan_number: consultant.pan_number || '',
    aadhar_number: consultant.aadhar_number || '',
  });

  const [payoutForm, setPayoutForm] = useState({
    amount: '', date: '', payment_mode: 'Bank Transfer', notes: ''
  });

  useEffect(() => {
    setPayoutForm(p => ({ ...p, date: p.date || new Date().toISOString().split('T')[0] }));
  }, []);

  const bookings: any[] = consultant.bookings || [];

  const payouts = consultant.payouts || [];

  // Stats
  const totalSalesValue = bookings.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
  const totalCommission = bookings.reduce((s: number, b: any) => s + Number(b.commission_amount || 0), 0);
  const totalPaidOut = payouts.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const balanceDue = totalCommission - totalPaidOut;

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateConsultant(consultant.id, editForm);
    setSaving(false);
    if (!result.success) { alert(`Failed: ${result.error}`); return; }
    setShowEditModal(false);
    window.location.reload();
  };

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm.amount || Number(payoutForm.amount) <= 0) { alert('Enter a valid amount'); return; }
    setSaving(true);
    const result = await addConsultantPayout({
      consultant_id: consultant.id,
      amount: parseFloat(payoutForm.amount),
      payment_date: payoutForm.date,
      payment_mode: payoutForm.payment_mode,
      notes: payoutForm.notes,
    });
    setSaving(false);
    if (!result.success) { alert(`Failed: ${result.error}`); return; }
    setShowPayoutModal(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <Link href="/consultants/list" className="inline-flex items-center text-sm text-gray-500 hover:text-amber-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Consultants
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{consultant.name}</h1>
                <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {consultant.consultant_code || 'NO-CODE'}
                </span>
                {consultant.type && (
                  <span className="bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded text-xs font-semibold capitalize">
                    {consultant.type}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-1">Registered {formatDate(consultant.created_at)}</p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 shadow-sm transition-colors"
                >
                  <Wallet className="w-4 h-4" /> Record Payout
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Sales', value: bookings.length, sub: `₹${formatNumber(totalSalesValue)}`, icon: Users, color: 'text-gray-900', bg: 'bg-gray-50 text-gray-600' },
            { label: 'Commission Earned', value: `₹${formatNumber(totalCommission)}`, sub: `${consultant.commission_rate || 0}% Rate`, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50 text-emerald-600' },
            { label: 'Paid Out', value: `₹${formatNumber(totalPaidOut)}`, sub: `${payouts.length} Transactions`, icon: CheckCircle2, color: 'text-blue-700', bg: 'bg-blue-50 text-blue-600' },
            { label: 'Balance Due', value: `₹${formatNumber(Math.max(0, balanceDue))}`, sub: 'Pending Payout', icon: Wallet, color: balanceDue > 0 ? 'text-red-600' : 'text-gray-400', bg: 'bg-red-50 text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${s.bg}`}><s.icon className="w-4 h-4" /></div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* INFO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600"><Phone className="w-4 h-4" /></div>
              <h2 className="font-bold text-gray-900">Contact Details</h2>
            </div>
            <InfoRow label="Phone" value={consultant.phone} />
            <InfoRow label="Email" value={consultant.email} />
            <InfoRow label="Address" value={consultant.address} />
          </div>

          {/* Banking */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600"><Building2 className="w-4 h-4" /></div>
              <h2 className="font-bold text-gray-900">Banking & Legal</h2>
            </div>
            <InfoRow label="Bank" value={consultant.bank_name} />
            <InfoRow label="Account No" value={<span className="font-mono">{consultant.account_number}</span>} />
            <InfoRow label="IFSC" value={<span className="font-mono">{consultant.ifsc_code}</span>} />
            <InfoRow label="PAN" value={<span className="font-mono uppercase">{consultant.pan_number}</span>} />
            <InfoRow label="Aadhar" value={<span className="font-mono">{consultant.aadhar_number}</span>} />
          </div>
        </div>

        {/* DEALS + PAYOUTS SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Associated Deals (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <h2 className="font-bold text-gray-900">Associated Deals</h2>
              </div>
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">{bookings.length}</span>
            </div>
            {bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client / Project</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Deal Value</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{b.client?.name || '—'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {b.plot?.project?.name} • Plot {b.plot?.plot_number}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-gray-700">₹{formatNumber(b.total_amount)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-emerald-600">₹{formatNumber(b.commission_amount || 0)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(b.status)}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 text-sm">No associated deals yet.</div>
            )}
          </div>

          {/* Payout History (1/3 width) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-500" />
                <h2 className="font-bold text-gray-900">Payout History</h2>
              </div>
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">{payouts.length}</span>
            </div>
            {payouts.length > 0 ? (
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {payouts.map((p: any) => (
                  <div key={p.id} className="px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-bold text-gray-900 font-mono">₹{formatNumber(p.amount)}</div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{p.payment_mode?.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(p.payment_date)}</div>
                    {p.description && <div className="text-xs text-gray-400 truncate">{p.description}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">No payouts recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Consultant Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name *', name: 'name' },
                    { label: 'Phone', name: 'phone' },
                    { label: 'Email', name: 'email' },
                  ].map(f => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">{f.label}</label>
                      <input className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                        value={(editForm as any)[f.name]}
                        onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })} />
                    </div>
                  ))}
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <textarea className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none" rows={2}
                      value={editForm.address}
                      onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Banking & Legal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Bank Name', name: 'bank_name' },
                    { label: 'Account Number', name: 'account_number', mono: true },
                    { label: 'IFSC Code', name: 'ifsc_code', mono: true },
                    { label: 'PAN Number', name: 'pan_number', mono: true, upper: true },
                    { label: 'Aadhar Number', name: 'aadhar_number', mono: true },
                  ].map(f => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">{f.label}</label>
                      <input className={`p-2 border border-gray-300 rounded-lg text-sm text-gray-900 ${f.mono ? 'font-mono' : ''} ${f.upper ? 'uppercase' : ''}`}
                        value={(editForm as any)[f.name]}
                        onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT MODAL */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Record Commission Payout</h3>
                <p className="text-sm text-gray-500">Balance due: <span className="font-semibold text-amber-700">₹{formatNumber(Math.max(0, balanceDue))}</span></p>
              </div>
              <button onClick={() => setShowPayoutModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePayout} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Amount (₹) *</label>
                <input type="number" step="0.01" min="0" autoFocus required
                  className="p-2 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 font-mono"
                  value={payoutForm.amount}
                  onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input type="date" className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={payoutForm.date}
                    onChange={e => setPayoutForm({ ...payoutForm, date: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Mode</label>
                  <select className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={payoutForm.payment_mode}
                    onChange={e => setPayoutForm({ ...payoutForm, payment_mode: e.target.value })}>
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>UPI</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notes / Reference</label>
                <textarea className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none" rows={2}
                  placeholder="Cheque no, UTR, etc."
                  value={payoutForm.notes}
                  onChange={e => setPayoutForm({ ...payoutForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPayoutModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
                  <Wallet className="w-4 h-4" /> {saving ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
