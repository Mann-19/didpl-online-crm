'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Plus, Ruler, Banknote, Trophy,
  CheckCircle2, XCircle, Percent, HandCoins, Search, X
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/utils/formatNumber';
import {
  createBooking, addPayment, confirmBooking,
  cancelBooking, updateBookingDiscount
} from '../../../../plots.actions';

export default function PlotDetailsClient({
  initialPlot, clients, consultants, projectId, isAdmin
}: any) {
  const [plot, setPlot] = useState(initialPlot);

  // Modal visibility
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Active booking context
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  // Add Client form
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addClientForm, setAddClientForm] = useState({
    total_amount: String(plot.price || ''),
    discount_amount: '',
    consultant_id: '',
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: '', mode: 'Cash', description: '', transaction_id: ''
  });

  // Discount form
  const [discountValue, setDiscountValue] = useState('');

  // SSR-safe today date
  useEffect(() => {
    setPaymentForm(prev => ({
      ...prev,
      date: prev.date || new Date().toISOString().split('T')[0]
    }));
  }, []);

  const reload = () => window.location.reload();

  // ---- ACTIONS ----
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) { alert('Please select a client'); return; }
    const result = await createBooking({
      plot_id: plot.id,
      client_id: selectedClientId,
      total_amount: parseFloat(addClientForm.total_amount) || plot.price || 0,
      discount_amount: parseFloat(addClientForm.discount_amount) || 0,
      consultant_id: addClientForm.consultant_id || undefined,
    });
    if (!result.success) { alert(`Failed: ${result.error}`); return; }
    reload();
  };

  const handleConfirm = async (bookingId: string, clientId: string) => {
    if (!confirm('Confirm this client as the plot owner? All other negotiations will be cancelled.')) return;
    const result = await confirmBooking(bookingId, plot.id, clientId);
    if (!result.success) { alert(`Failed: ${result.error}`); return; }
    reload();
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Remove this negotiation? This cannot be undone.')) return;
    const result = await cancelBooking(bookingId, plot.id);
    if (!result.success) { alert(`Failed: ${result.error}`); return; }
    reload();
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingId || !activeClientId) { alert('Missing booking info'); return; }
    const result = await addPayment({
      booking_id: activeBookingId,
      amount: parseFloat(paymentForm.amount),
      payment_date: paymentForm.date,
      payment_mode: paymentForm.mode,
      description: paymentForm.description,
      transaction_id: paymentForm.transaction_id || undefined,
      entity_id: activeClientId,
    });
    if (!result.success) { alert(`Payment failed: ${result.error}`); return; }
    reload();
  };

  const handleUpdateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingId) return;
    const result = await updateBookingDiscount(activeBookingId, parseFloat(discountValue) || 0);
    if (!result.success) { alert(`Failed: ${result.error}`); return; }
    reload();
  };

  // ---- DERIVED ----
  const bookings: any[] = plot.bookings || [];
  const confirmedBooking = bookings.find((b: any) => b.status === 'confirmed');
  const pendingBookings = bookings.filter((b: any) => b.status === 'pending');
  const filteredClients = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.client_code?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-500';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  const plotStatusBadge = () => {
    if (plot.status === 'sold') return 'bg-rose-100 text-rose-700';
    if (plot.status === 'token_paid') return 'bg-amber-100 text-amber-700';
    if (plot.status === 'partially_paid') return 'bg-orange-100 text-orange-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <Link href={`/projects/${projectId}/list`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-violet-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Plots
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Plot {plot.plot_number}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${plotStatusBadge()}`}>
              {plot.status?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-gray-500 mt-1 font-medium">{plot.project?.name}</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Area Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(plot.area_sqyd)} <span className="text-sm font-medium text-gray-400">sq.yd</span></p>
            </div>
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
              <Ruler className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">List Price</p>
              <p className="text-2xl font-bold text-emerald-600">₹{formatNumber(plot.price)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                {plot.client?.name ? 'Confirmed Owner' : 'Negotiations'}
              </p>
              <p className="text-xl font-bold text-gray-900 truncate max-w-[200px]">
                {plot.client?.name || `${pendingBookings.length} active`}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${plot.client?.name ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <User className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* BOOKINGS SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bookings &amp; Negotiations</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage all client deals for this plot</p>
            </div>
            {!confirmedBooking && (
              <button
                onClick={() => setShowAddClientModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Client
              </button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bookings yet</p>
                <p className="text-gray-400 text-sm mt-1">Click "Add Client" to start a negotiation</p>
              </div>
            ) : (
              bookings.map((booking: any) => {
                const finalDeal = booking.total_amount - (booking.discount_amount || 0);
                const paid = (booking.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                const due = finalDeal - paid;
                const isConfirmed = booking.status === 'confirmed';
                const paymentPct = finalDeal > 0 ? Math.round((paid / finalDeal) * 100) : 0;

                return (
                  <div key={booking.id} className={`border rounded-2xl p-6 ${isConfirmed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'} shadow-sm`}>
                    {/* Booking Header */}
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
                          {isConfirmed ? <Trophy className="w-6 h-6" /> : (booking.client?.name?.charAt(0) || 'C')}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{booking.client?.name || 'Unknown Client'}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{booking.client?.phone || 'No Phone'}</span>
                            {booking.consultant?.name && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-violet-600 font-medium">Via {booking.consultant.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(booking.status)}`}>
                          {booking.status}
                        </span>
                        {/* Admin Actions */}
                        {isAdmin && !isConfirmed && booking.status === 'pending' && !confirmedBooking && (
                          <button
                            onClick={() => handleConfirm(booking.id, booking.client_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Owner
                          </button>
                        )}
                        {isAdmin && booking.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financials + Payments */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Financial breakdown */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Agreed Value</span>
                          <span className="font-bold text-gray-900">₹{formatNumber(booking.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount</span>
                          <span className="font-bold">– ₹{formatNumber(booking.discount_amount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 text-gray-900">
                          <span>Final Deal</span>
                          <span>₹{formatNumber(finalDeal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-emerald-600 pt-1">
                          <span>Paid</span>
                          <span className="font-bold">₹{formatNumber(paid)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-orange-600 font-bold">
                          <span>Balance Due</span>
                          <span>₹{formatNumber(due)}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="pt-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Payment Progress</span><span>{paymentPct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(paymentPct, 100)}%` }} />
                          </div>
                        </div>
                        {/* Discount button */}
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => { setActiveBookingId(booking.id); setDiscountValue(String(booking.discount_amount || '')); setShowDiscountModal(true); }}
                            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline font-semibold pt-1"
                          >
                            <Percent className="w-3 h-3" /> Update Discount
                          </button>
                        )}
                      </div>

                      {/* Payment history */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment History</h4>
                          {booking.status !== 'cancelled' && (
                            <button
                              onClick={() => { setActiveBookingId(booking.id); setActiveClientId(booking.client_id); setShowPaymentModal(true); }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline"
                            >
                              <HandCoins className="w-3 h-3" /> Add Payment
                            </button>
                          )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-3 py-2 text-left text-gray-600 font-semibold">Date</th>
                                <th className="px-3 py-2 text-left text-gray-600 font-semibold">Mode</th>
                                <th className="px-3 py-2 text-right text-gray-600 font-semibold">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(booking.payments || []).map((p: any) => (
                                <tr key={p.id} className="border-b last:border-0">
                                  <td className="px-3 py-2 text-gray-700">
                                    {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">{p.payment_mode}</td>
                                  <td className="px-3 py-2 text-right font-bold text-gray-900">₹{formatNumber(p.amount)}</td>
                                </tr>
                              ))}
                              {(booking.payments || []).length === 0 && (
                                <tr><td colSpan={3} className="p-3 text-center text-gray-400">No payments yet</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== ADD CLIENT MODAL ===== */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Negotiating Client</h2>
              <button onClick={() => setShowAddClientModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddClient} className="flex flex-col gap-4 overflow-y-auto">
              {/* Client Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {filteredClients.slice(0, 20).map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClientId(c.id)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-violet-50 transition-colors ${selectedClientId === c.id ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-gray-700'}`}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-gray-400">{c.client_code}</span>
                    </button>
                  ))}
                  {filteredClients.length === 0 && <p className="p-3 text-sm text-gray-400 text-center">No clients found</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Amount</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                  value={addClientForm.total_amount}
                  onChange={e => setAddClientForm({ ...addClientForm, total_amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (optional)</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                  placeholder="0"
                  value={addClientForm.discount_amount}
                  onChange={e => setAddClientForm({ ...addClientForm, discount_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultant (optional)</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                  value={addClientForm.consultant_id}
                  onChange={e => setAddClientForm({ ...addClientForm, consultant_id: e.target.value })}
                >
                  <option value="">None</option>
                  {consultants.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddClientModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={!selectedClientId}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                  Add to Negotiations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD PAYMENT MODAL ===== */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Payment</h2>
              <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                  value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                  value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                  value={paymentForm.mode} onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })}>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Transaction ID</label>
                <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                  value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DISCOUNT MODAL ===== */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Update Discount</h2>
              <button onClick={() => setShowDiscountModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdateDiscount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="0" value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDiscountModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
