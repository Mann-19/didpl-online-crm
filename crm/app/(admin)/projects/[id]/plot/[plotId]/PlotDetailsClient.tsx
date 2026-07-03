'use client';

import React, { useState } from 'react';
import {
  ArrowLeft, User, Users, Plus, Ruler, Banknote, Trophy,
  ChevronRight, XCircle, CheckCircle2, GitMerge, Trash2, X
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/utils/formatNumber';
import { submitChangeRequest } from '@/app/(admin)/change-requests.actions';
import { Toast, useToast } from '@/components/ui/Toast';
import { 
  createBooking, confirmBooking, cancelBooking, addPayment, 
  transferBooking, getTransferablePlotsForClient, mergeTransferIntoPartnership
} from '../../../../plots.actions';

export default function PlotDetailsClient({
  initialPlot, clients, projectId, isAdmin, role
}: any) {
  const [plot] = useState(initialPlot);

  // Modals
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Add Client form
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addClientForm, setAddClientForm] = useState({
    total_amount: String(plot.price || ''),
    discount_amount: '',
    consultant_id: '',
    commission_percent: ''
  });

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0], mode: 'Cash', description: '', transaction_id: '', payment_type: 'Plot payment', entity_id: ''
  });

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availablePlots, setAvailablePlots] = useState<any[]>([]);
  const [selectedNewPlotId, setSelectedNewPlotId] = useState('');
  const [isMergeTransfer, setIsMergeTransfer] = useState(false);
  const [mergeTargetBookingId, setMergeTargetBookingId] = useState<string | null>(null);
  const [transferBookingId, setTransferBookingId] = useState<string | null>(null);

  const [isPending, startTransition] = React.useTransition();
  const { toast, showToast, hideToast } = useToast();

  const isEmployee = role === 'employee';
  const reload = () => window.location.reload();

  // --- ACTIONS ---

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) { alert('Please select a client'); return; }

    startTransition(async () => {
      const payload = {
        plot_id: plot.id,
        client_id: selectedClientId,
        total_amount: parseFloat(addClientForm.total_amount) || plot.price || 0,
        discount_amount: parseFloat(addClientForm.discount_amount) || 0,
        consultant_id: addClientForm.consultant_id || '',
        commission_percent: parseFloat(addClientForm.commission_percent) || 0,
      };

      if (isEmployee) {
        const client = clients.find((c: any) => c.id === selectedClientId);
        const result = await submitChangeRequest({
          entity_type: 'booking',
          operation: 'create',
          payload,
          description: `New booking for plot ${plot.plot_number} by "${client?.name}"`,
        });
        if (result.success) {
          showToast('Booking request submitted for review', 'warning');
          setShowAddClientModal(false);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      } else {
        const result = await createBooking(payload);
        if (result.success) {
          showToast('Booking created successfully', 'success');
          setShowAddClientModal(false);
          setTimeout(reload, 800);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      }
    });
  };

  const handleConfirm = (bookingId: string, clientId: string) => {
    if (!confirm('Confirm this client as the plot owner?')) return;
    startTransition(async () => {
      if (isEmployee) {
        const booking = bookings.find(b => b.id === bookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: bookingId, operation: 'update',
          payload: { status: 'confirmed' },
          description: `Confirm booking for "${booking?.client?.name}" on plot ${plot.plot_number}`,
        });
        if (result.success) showToast('Confirmation request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await confirmBooking(bookingId, plot.id, clientId);
        if (result.success) { showToast('Owner confirmed', 'success'); setTimeout(reload, 800); }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleCancel = (bookingId: string) => {
    if (!confirm('Remove this negotiation? This cannot be undone.')) return;
    startTransition(async () => {
      if (isEmployee) {
        const booking = bookings.find(b => b.id === bookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: bookingId, operation: 'delete', payload: {},
          description: `Remove booking negotiation for "${booking?.client?.name}" on plot ${plot.plot_number}`,
        });
        if (result.success) showToast('Cancellation request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await cancelBooking(bookingId, plot.id);
        if (result.success) { showToast('Negotiation removed', 'success'); setTimeout(reload, 800); }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingId) return;
    const booking = bookings.find(b => b.id === activeBookingId);
    
    startTransition(async () => {
      const payload = {
        booking_id: activeBookingId,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.date,
        payment_mode: paymentForm.mode,
        description: paymentForm.description,
        transaction_id: paymentForm.transaction_id || '',
        entity_id: paymentForm.entity_id || booking.client_id,
        payment_type: paymentForm.payment_type
      };

      if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'payment', operation: 'create', payload,
          description: `New payment of ₹${formatNumber(payload.amount)} for plot ${plot.plot_number} (${booking?.client?.name})`,
        });
        if (result.success) { showToast('Payment request submitted for review', 'warning'); setShowPaymentModal(false); }
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await addPayment(payload);
        if (result.success) { showToast('Payment recorded successfully', 'success'); setShowPaymentModal(false); setTimeout(reload, 800); }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const openTransferModal = async (bookingId: string, clientId: string) => {
    setTransferBookingId(bookingId);
    setSelectedNewPlotId('');
    setIsMergeTransfer(false);
    setMergeTargetBookingId(null);
    const plots = await getTransferablePlotsForClient(projectId, clientId);
    setAvailablePlots(plots);
    setShowTransferModal(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferBookingId || !selectedNewPlotId) return;

    const selectedPlot = availablePlots.find((p: any) => p.uniqueKey === selectedNewPlotId);
    const actualPlotId = selectedPlot?.id;
    if (!actualPlotId) return;

    const isPartnershipMerge = selectedPlot?.isPartnership;

    startTransition(async () => {
      if (isPartnershipMerge) {
        if (!mergeTargetBookingId) { showToast('Could not find target booking', 'error'); return; }
        const result = await mergeTransferIntoPartnership(transferBookingId, mergeTargetBookingId);
        if (result.success) {
          showToast('Merged into partnership booking successfully', 'success');
          setShowTransferModal(false);
          setTimeout(() => window.location.href = `/projects/${projectId}/plot/${actualPlotId}`, 800);
        } else showToast(result.error || 'Failed', 'error');
      } else if (isEmployee) {
        const booking = bookings.find(b => b.id === transferBookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: transferBookingId, operation: 'update', payload: { plot_id: actualPlotId },
          description: `Transfer booking for "${booking?.client?.name}" to plot ${selectedPlot.plot_number}`,
        });
        if (result.success) {
          showToast('Transfer request submitted for approval', 'warning');
          setShowTransferModal(false);
        } else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await transferBooking(transferBookingId, actualPlotId);
        if (result.success) {
          showToast('Plot transferred successfully', 'success');
          setShowTransferModal(false);
          setTimeout(() => window.location.href = `/projects/${projectId}/plot/${actualPlotId}/booking/${result.bookingId || transferBookingId}`, 800);
        } else showToast(result.error || 'Failed', 'error');
      }
    });
  };


  // --- DERIVED DATA ---
  const bookings: any[] = [...(plot.bookings || [])].sort((a: any, b: any) => {
    if (a.status === 'confirmed') return -1;
    if (b.status === 'confirmed') return 1;
    return 0;
  });
  const confirmedBooking = bookings.find((b: any) => b.status === 'confirmed');

  const filteredClients = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.client_code?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const plotStatusBadge = () => {
    if (plot.status === 'sold') return 'bg-rose-100 text-rose-700';
    if (plot.status === 'token_paid') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-500 border border-gray-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* BOOKINGS SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bookings &amp; Negotiations</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage all client deals for this plot</p>
            </div>
            {!confirmedBooking && (isAdmin || isEmployee) && (
              <button
                onClick={() => setShowAddClientModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> {isEmployee ? 'Request Booking' : 'Add Client'}
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bookings yet</p>
                <p className="text-gray-400 text-sm mt-1">Click "Add Client" to start a negotiation</p>
              </div>
            ) : (
              bookings.map((booking: any) => {
                const finalDeal = booking.total_amount - (booking.discount_amount || 0);
                const paid = (booking.payments || [])
                  .filter((p: any) => p.payment_type === 'Plot payment' || !p.payment_type)
                  .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                const due = finalDeal - paid;
                const paymentPct = finalDeal > 0 ? Math.round((paid / finalDeal) * 100) : 0;
                const isConfirmed = booking.status === 'confirmed';

                return (
                  <div key={booking.id} className={`flex flex-col gap-4 border rounded-2xl p-5 md:p-6 transition-colors hover:shadow-sm ${isConfirmed ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 bg-white'}`}>
                    
                    {/* Top Row: Client Info & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
                          {isConfirmed ? <Trophy className="w-6 h-6" /> : (booking.client?.name?.charAt(0) || 'C')}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {booking.client?.name || 'Unknown Client'}
                            {(booking.booking_partners || []).length > 0 && (
                              <span className="text-gray-400 font-normal text-base">
                                {' & '}
                                {(booking.booking_partners || []).map((bp: any) => bp.client?.name).filter(Boolean).join(' & ')}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(booking.status)}`}>
                              {booking.status}
                            </span>
                            <span className="text-sm text-gray-500">• {new Date(booking.booking_date).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/projects/${projectId}/plot/${plot.id}/booking/${booking.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:text-violet-700 hover:border-violet-200 transition-colors"
                      >
                        View Full Details <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* Middle Row: Financials & Progress */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Deal Value</p>
                        <p className="font-bold text-gray-900">₹{formatNumber(finalDeal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Paid</p>
                        <p className="font-bold text-emerald-600">₹{formatNumber(paid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Balance</p>
                        <p className="font-bold text-orange-600">₹{formatNumber(due)}</p>
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-semibold">
                          <span>Payment Progress</span>
                          <span>{paymentPct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(paymentPct, 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {(isAdmin || isEmployee) && !isConfirmed && booking.status === 'pending' && !confirmedBooking && (
                        <button
                          onClick={() => handleConfirm(booking.id, booking.client_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                        </button>
                      )}
                      {(isAdmin || isEmployee) && booking.status !== 'cancelled' && (
                        <button
                          onClick={() => { setActiveBookingId(booking.id); setShowPaymentModal(true); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-bold hover:bg-violet-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Payment
                        </button>
                      )}
                      {(isAdmin || isEmployee) && booking.status === 'pending' && (
                        <button
                          onClick={() => openTransferModal(booking.id, booking.client_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          <GitMerge className="w-3.5 h-3.5" /> Transfer
                        </button>
                      )}
                      {(isAdmin || isEmployee) && booking.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Start Negotiation</h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-4 border-b border-gray-100 shrink-0">
              <input 
                type="text" 
                placeholder="Search clients..." 
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredClients.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">No clients found</p>
              ) : (
                filteredClients.map((client: any) => (
                  <label key={client.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedClientId === client.id ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-gray-200 hover:border-violet-300'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="client" value={client.id} checked={selectedClientId === client.id} onChange={(e) => setSelectedClientId(e.target.value)} className="w-4 h-4 text-violet-600" />
                      <div>
                        <p className="font-bold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.phone} • {client.client_code}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <form onSubmit={handleAddClient} className="p-6 bg-gray-50 border-t border-gray-100 shrink-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Agreed Value (₹)</label>
                  <input type="number" required value={addClientForm.total_amount} onChange={e => setAddClientForm({...addClientForm, total_amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Discount Amount (₹)</label>
                  <input type="number" value={addClientForm.discount_amount} onChange={e => setAddClientForm({...addClientForm, discount_amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddClientModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending || !selectedClientId} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">Create Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Add Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Type</label>
                <select value={paymentForm.payment_type} onChange={e => setPaymentForm({...paymentForm, payment_type: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                  <option value="Plot payment">Plot Payment</option>
                  <option value="Legal fees">Legal & Gov Fees</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹) *</label>
                  <input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                  <input type="date" required value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <select value={paymentForm.mode} onChange={e => setPaymentForm({...paymentForm, mode: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                    <option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option><option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ref / UTR</label>
                  <input type="text" value={paymentForm.transaction_id} onChange={e => setPaymentForm({...paymentForm, transaction_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Who is paying?</label>
                <select value={paymentForm.entity_id} onChange={e => setPaymentForm({...paymentForm, entity_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                  {activeBookingId && bookings.find(b => b.id === activeBookingId) && (
                    <>
                      <option value={bookings.find(b => b.id === activeBookingId).client_id}>{bookings.find(b => b.id === activeBookingId).client?.name} (Primary)</option>
                      {(bookings.find(b => b.id === activeBookingId).booking_partners || []).map((bp: any) => (
                        <option key={bp.client_id} value={bp.client_id}>{bp.client?.name} (Partner)</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <input type="text" value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Transfer Plot</h3>
                <p className="text-xs text-gray-500 mt-0.5">Move this booking to another plot</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleTransfer} className="p-6 flex flex-col min-h-0">
              <div className="mb-4 shrink-0">
                <p className="text-sm text-gray-600">Select a destination plot. Plots highlighted in purple indicate this client already has an active negotiation there.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-[200px] border border-gray-200 rounded-xl divide-y divide-gray-100">
                {availablePlots.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No eligible plots available for transfer.</div>
                ) : (
                  availablePlots.map((p) => {
                    const isMerge = p.uniqueKey.endsWith('_primary') || p.uniqueKey.endsWith('_partner');
                    return (
                      <label key={p.uniqueKey} className={`flex flex-col p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedNewPlotId === p.uniqueKey ? (isMerge ? 'bg-violet-50 ring-1 ring-violet-500' : 'bg-blue-50 ring-1 ring-blue-500') : ''}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name="transfer_plot" 
                            value={p.uniqueKey} 
                            checked={selectedNewPlotId === p.uniqueKey}
                            onChange={() => {
                              setSelectedNewPlotId(p.uniqueKey);
                              if (isMerge && p.uniqueKey.endsWith('_partner')) {
                                setIsMergeTransfer(true);
                              } else {
                                setIsMergeTransfer(false);
                                setMergeTargetBookingId(null);
                              }
                            }}
                            className="w-4 h-4 text-blue-600" 
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">Plot {p.plot_number}</span>
                              {isMerge && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-700">Merge Booking</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                              <span>{p.area_sqyd} sq.yd</span>
                              <span>₹{formatNumber(p.price)}</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="pt-6 shrink-0 flex justify-end gap-3 mt-auto">
                <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending || !selectedNewPlotId} className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isMergeTransfer ? 'Merge Bookings' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
