'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Calendar, ReceiptText, Download, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { addExpense, updateExpense, deleteExpense } from '../../expenses.actions';
import { exportToPDF } from '@/utils/pdf/exportToPDF';

export default function ExpensesClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState('expense_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    to_entity: '',
    expense_type: '',
    amount: '',
    payment_mode: 'Bank Transfer',
    transaction_id: '',
    bank_name: '',
    branch_name: '',
    ifsc_code: '',
    remarks: ''
  });

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      to_entity: '',
      expense_type: '',
      amount: '',
      payment_mode: 'Bank Transfer',
      transaction_id: '',
      bank_name: '',
      branch_name: '',
      ifsc_code: '',
      remarks: ''
    });
    setShowModal(true);
  };

  const openEditModal = (expense: any) => {
    setEditId(expense.id);
    setFormData({
      expense_date: expense.expense_date,
      to_entity: expense.to_entity || '',
      expense_type: expense.expense_type || '',
      amount: String(expense.amount || ''),
      payment_mode: expense.payment_mode || 'Bank Transfer',
      transaction_id: expense.transaction_id || '',
      bank_name: expense.bank_name || '',
      branch_name: expense.branch_name || '',
      ifsc_code: expense.ifsc_code || '',
      remarks: expense.remarks || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
    const res = await deleteExpense(id);
    if (!res.success) {
      alert(`Failed to delete: ${res.error}`);
    } else {
      window.location.reload();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    let res;
    if (editId) {
      res = await updateExpense(editId, payload);
    } else {
      res = await addExpense(payload);
    }

    setSaving(false);
    if (!res.success) {
      alert(`Failed: ${res.error}`);
    } else {
      setShowModal(false);
      window.location.reload();
    }
  };

  const filtered = [...data]
    .filter(r => {
      const s = search.toLowerCase();
      const matchText = (r.to_entity || '').toLowerCase().includes(s) ||
        (r.remarks || '').toLowerCase().includes(s) ||
        (r.transaction_id || '').toLowerCase().includes(s);
      const matchDate = (!startDate || r.expense_date >= startDate) && (!endDate || r.expense_date <= endDate);
      const matchType = !typeFilter || r.expense_type === typeFilter;
      return matchText && matchDate && matchType;
    })
    .sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalExpensesCount = filtered.length;
  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleExport = () => {
    exportToPDF({
      title: 'Expenses Report',
      filename: 'Expenses_Report',
      data: filtered,
      headers: [
        { label: 'Date', key: (r) => fmt(r.expense_date) },
        { label: 'Entity / Paid To', key: 'to_entity' },
        { label: 'Category', key: 'expense_type' },
        { label: 'Payment Mode', key: 'payment_mode' },
        { label: 'Transaction ID', key: (r) => r.transaction_id || '—' },
        { label: 'Bank Name', key: (r) => r.bank_name || '—' },
        { label: 'Branch / IFSC', key: (r) => (r.branch_name || r.ifsc_code) ? `${r.branch_name || ''} ${r.ifsc_code ? `(${r.ifsc_code})` : ''}` : '—' },
        { label: 'Remarks', key: (r) => r.remarks || '—' },
        { label: 'Amount', key: (r) => `Rs. ${formatNumber(r.amount)}` }
      ]
    });
  };

  const expensesByCategory = filtered.reduce((acc: any, r: any) => {
    acc[r.expense_type] = (acc[r.expense_type] || 0) + r.amount;
    return acc;
  }, {});

  let highestCat = 'None';
  let highestCatAmount = 0;
  for (const [cat, amt] of Object.entries(expensesByCategory)) {
    if ((amt as number) > highestCatAmount) {
      highestCatAmount = amt as number;
      highestCat = cat;
    }
  }

  const uniqueTypes = Array.from(new Set(data.map(r => r.expense_type).filter(Boolean)));
  const needsBankDetails = ['Bank Transfer', 'Cheque', 'UPI', 'NEFT/IMPS/RTGS'].includes(formData.payment_mode);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link href="/reports" className="inline-flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expense Report</h1>
              <p className="text-gray-500 mt-1">Complete record of organizational expenses.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={openAddModal} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">
                <Plus className="w-5 h-5" /> Add Expense
              </button>
              <button 
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600`}><ReceiptText className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Expenses</p>
              <p className={`text-2xl font-bold text-gray-900`}>{formatNumber(totalExpensesCount)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex items-center gap-4 bg-red-50/10">
            <div className={`w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600`}><ReceiptText className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-red-500 uppercase">Total Outflow</p>
              <p className={`text-2xl font-bold text-red-600`}>₹{formatNumber(totalAmount)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex items-center gap-4 bg-blue-50/10">
            <div className={`w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600`}><ReceiptText className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-blue-500 uppercase">Highest Category: {highestCat}</p>
              <p className={`text-2xl font-bold text-blue-600`}>₹{formatNumber(highestCatAmount)}</p>
            </div>
          </div>
        </div>

        {/* Table Filter */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search payee, remarks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Expense Types</option>
                {uniqueTypes.map((t: any) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={endDate} onChange={e => setEndDate(e.target.value)} />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={sortKey} onChange={e => setSortKey(e.target.value)}>
                <option value="expense_date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="to_entity">Sort: Payee</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 min-w-[70px]">
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Paid To</th>
                  <th className="px-4 py-3 text-left">Expense Type</th>
                  <th className="px-4 py-3 text-left">Payment Details</th>
                  <th className="px-4 py-3 text-right text-red-600">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No expenses found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-4 py-4 text-gray-900">{fmt(r.expense_date)}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{r.to_entity}</div>
                      {r.remarks && <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate" title={r.remarks}>{r.remarks}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {r.expense_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-700">{r.payment_mode || '—'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                        {r.bank_name && <span>{r.bank_name}</span>}
                        {r.transaction_id && <span className="font-mono bg-gray-50 px-1 rounded">Ref: {r.transaction_id}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-red-600 text-base">
                      ₹{formatNumber(r.amount)}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} Expenses</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700 text-base">₹{formatNumber(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">{editId ? 'Edit Expense' : 'Record New Expense'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Date *</label>
                    <input type="date" required className="p-2.5 border border-gray-300 rounded-lg text-sm"
                      value={formData.expense_date} onChange={e => setFormData({ ...formData, expense_date: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Amount (₹) *</label>
                    <input type="number" step="0.01" min="0" required placeholder="0.00" className="p-2.5 border border-gray-300 rounded-lg font-bold font-mono text-gray-900"
                      value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Paid To (Payee) *</label>
                    <input type="text" required placeholder="Vendor or Person name" className="p-2.5 border border-gray-300 rounded-lg text-sm"
                      value={formData.to_entity} onChange={e => setFormData({ ...formData, to_entity: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Expense Category *</label>
                    <input type="text" required placeholder="e.g. Marketing, Office Rent, Repairs" className="p-2.5 border border-gray-300 rounded-lg text-sm"
                      value={formData.expense_type} onChange={e => setFormData({ ...formData, expense_type: e.target.value })} />
                    <p className="text-xs text-gray-400">Type freely to categorize</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Payment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Payment Mode</label>
                      <select className="p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                        value={formData.payment_mode} onChange={e => setFormData({ ...formData, payment_mode: e.target.value })}>
                        <option>Bank Transfer</option>
                        <option>Cash</option>
                        <option>Cheque</option>
                        <option>UPI</option>
                        <option>Credit Card</option>
                        <option>NEFT/IMPS/RTGS</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Transaction/Ref ID</label>
                      <input type="text" placeholder="UTR, Cheque No, etc." className="p-2.5 border border-gray-300 rounded-lg text-sm"
                        value={formData.transaction_id} onChange={e => setFormData({ ...formData, transaction_id: e.target.value })} />
                    </div>
                  </div>
                  
                  {needsBankDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-600">Bank Name</label>
                        <input type="text" className="p-2 border border-gray-300 rounded-md text-sm"
                          value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-600">Branch Name</label>
                        <input type="text" className="p-2 border border-gray-300 rounded-md text-sm"
                          value={formData.branch_name} onChange={e => setFormData({ ...formData, branch_name: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-600">IFSC Code</label>
                        <input type="text" className="p-2 border border-gray-300 rounded-md text-sm font-mono uppercase"
                          value={formData.ifsc_code} onChange={e => setFormData({ ...formData, ifsc_code: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4">
                  <label className="text-sm font-semibold text-gray-700">Remarks / Description</label>
                  <textarea rows={2} placeholder="Optional notes about this expense..." className="p-2.5 border border-gray-300 rounded-lg text-sm resize-none"
                    value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                </div>

              </form>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : (editId ? 'Save Changes' : 'Record Expense')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
