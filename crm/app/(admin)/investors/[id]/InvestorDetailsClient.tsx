'use client';

import { useState } from 'react';
import { User, Phone, Mail, MapPin, CheckCircle, TrendingUp, DollarSign, Calendar, Plus } from 'lucide-react';
import BackLink from '@/components/ui/BackLink';
import Badge from '@/components/ui/Badge';
import { addInvestment, settleInvestment } from '../../investors.actions';

export default function InvestorDetailsClient({ investor }: { investor: any }) {
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [formData, setFormData] = useState({
    invested_amount: '',
    interest_rate: '',
    mature_date: '',
    payment_mode: 'bank_transfer',
    transaction_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatLakhs = (amount: number) => {
    if (!amount) return '₹0.00 L';
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  const calculateStats = () => {
    let totalInvested = 0;
    let pendingReturns = 0;
    let activeInvestmentsCount = 0;

    investor.investments?.forEach((investment: any) => {
      totalInvested += Number(investment.invested_amount) || 0;
      if (investment.status === 'pending') {
        pendingReturns += Number(investment.mature_amount) || 0;
        activeInvestmentsCount++;
      }
    });

    return { totalInvested, pendingReturns, activeInvestmentsCount };
  };

  const stats = calculateStats();

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amount = Number(formData.invested_amount) || 0;
    const rate = Number(formData.interest_rate) || 0;
    const mature = amount + (amount * rate / 100);

    await addInvestment(investor.id, {
      invested_amount: amount,
      interest_rate: rate,
      mature_amount: mature,
      mature_date: formData.mature_date,
      payment_mode: formData.payment_mode,
      transaction_id: formData.transaction_id,
    });

    setIsSubmitting(false);
    setIsAddingInvestment(false);
    setFormData({ invested_amount: '', interest_rate: '', mature_date: '', payment_mode: 'bank_transfer', transaction_id: '' });
  };

  const handleSettle = async (investmentId: string) => {
    if (confirm('Are you sure you want to mark this investment as settled?')) {
      await settleInvestment(investmentId, investor.id);
    }
  };

  const theme = {
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300 pb-12">
      <BackLink href="/investors/list" dirname="Investors Directory" accent="indigo" />

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl">
              {(investor.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {investor.name}
                <Badge variant={stats.activeInvestmentsCount > 0 ? "warning" : "indigo"}>
                  {stats.activeInvestmentsCount} Active
                </Badge>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Code: <span className="font-medium text-gray-700">{investor.investor_code}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 w-full md:w-auto">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Invested</span>
              <span className="text-xl font-bold text-gray-900">{formatLakhs(stats.totalInvested)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pending Returns</span>
              <span className="text-xl font-bold text-emerald-600">{formatLakhs(stats.pendingReturns)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-4 px-6 md:px-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            {investor.phone || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            {investor.email || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{investor.address || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Investments Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Investment History
          </h2>
          <button
            onClick={() => setIsAddingInvestment(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${theme.button}`}
          >
            <Plus className="w-4 h-4" /> Add Investment
          </button>
        </div>

        {isAddingInvestment && (
          <div className="p-6 bg-indigo-50/50 border-b border-indigo-100">
            <h3 className="text-md font-semibold text-gray-800 mb-4">Record New Investment</h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Invested Amount (₹) *</label>
                <input required type="number" value={formData.invested_amount} onChange={e => setFormData({ ...formData, invested_amount: e.target.value })} className={`w-full p-2 border border-gray-300 rounded-md text-sm ${theme.inputFocus}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Total Return (%) *</label>
                <input required type="number" step="0.01" value={formData.interest_rate} onChange={e => setFormData({ ...formData, interest_rate: e.target.value })} className={`w-full p-2 border border-gray-300 rounded-md text-sm ${theme.inputFocus}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mature Date *</label>
                <input required type="date" value={formData.mature_date} onChange={e => setFormData({ ...formData, mature_date: e.target.value })} className={`w-full p-2 border border-gray-300 rounded-md text-sm ${theme.inputFocus}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                <select value={formData.payment_mode} onChange={e => setFormData({ ...formData, payment_mode: e.target.value })} className={`w-full p-2 border border-gray-300 rounded-md text-sm bg-white ${theme.inputFocus}`}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Transaction ID</label>
                <input type="text" value={formData.transaction_id} onChange={e => setFormData({ ...formData, transaction_id: e.target.value })} className={`w-full p-2 border border-gray-300 rounded-md text-sm ${theme.inputFocus}`} />
              </div>

              <div className="col-span-full flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsAddingInvestment(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`px-4 py-2 text-white text-sm font-medium rounded-md ${theme.button}`}>{isSubmitting ? 'Saving...' : 'Save Investment'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Inv. Code</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Invested</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Mature Amount</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Mature Date</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {investor.investments?.length > 0 ? (
                investor.investments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">{inv.investment_code || '---'}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(inv.investment_date).toLocaleDateString()}</td>
                    <td className="p-4 text-sm font-medium text-gray-900">₹{Number(inv.invested_amount).toLocaleString()}</td>
                    <td className="p-4 text-sm text-gray-600">{inv.interest_rate}%</td>
                    <td className="p-4 text-sm font-medium text-emerald-600">₹{Number(inv.mature_amount).toLocaleString()}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(inv.mature_date).toLocaleDateString()}</td>
                    <td className="p-4 text-sm">
                      <Badge variant={inv.status === 'pending' ? 'warning' : 'success'}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-right">
                      {inv.status === 'pending' ? (
                        <button
                          onClick={() => handleSettle(inv.id)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                        >
                          Mark Settled
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Settled on {inv.exit_date ? new Date(inv.exit_date).toLocaleDateString() : 'N/A'}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                    No investments recorded for this investor yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
