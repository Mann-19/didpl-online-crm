'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Users, Plus, Ruler, Banknote, Trophy,
  CheckCircle2, XCircle, Percent, HandCoins, Search, X, Printer, Clock,
  Edit2, Trash2, UserPlus, GitMerge
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/utils/formatNumber';
import {
  createBooking, addPayment, confirmBooking,
  cancelBooking, updateBookingDiscount, revertBooking,
  updatePlot, updateBooking, updatePayment, deletePayment,
  transferBooking, getTransferablePlotsForClient,
  addPartnerToBooking, removePartnerFromBooking, mergeTransferIntoPartnership,
  updateBookingFees
} from '../../../../plots.actions';
import { submitChangeRequest } from '@/app/(admin)/change-requests.actions';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';
import { generateAllotmentLetter } from '@/utils/pdf/generateAllotmentLetter';
import { Toast, useToast } from '@/components/ui/Toast';

export default function PlotDetailsClient({
  initialPlot, clients, consultants, projectId, isAdmin, role
}: any) {
  const [plot, setPlot] = useState(initialPlot);

  // Modal visibility
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Active booking context
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferBookingId, setTransferBookingId] = useState<string | null>(null);
  const [availablePlots, setAvailablePlots] = useState<any[]>([]);
  const [selectedNewPlotId, setSelectedNewPlotId] = useState('');

  // Partner modal state
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [partnerBookingId, setPartnerBookingId] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  // Merge transfer state
  const [isMergeTransfer, setIsMergeTransfer] = useState(false);
  const [mergeTargetBookingId, setMergeTargetBookingId] = useState<string | null>(null);

  // Fees calculation state (UI only)
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [activeFeeBookingId, setActiveFeeBookingId] = useState<string | null>(null);
  const [bookingFees, setBookingFees] = useState<Record<string, { stampDuty: number, legal: number, maintenance: number }>>({});
  
  // Sync state with props when data is refreshed
  useEffect(() => {
    const initialFees: Record<string, any> = {};
    (initialPlot?.bookings || []).forEach((b: any) => {
      if (b.booking_fees) {
        const bf = Array.isArray(b.booking_fees) ? b.booking_fees[0] : b.booking_fees;
        if (bf) {
          initialFees[b.id] = {
            stampDuty: bf.stamp_duty || 0,
            legal: bf.legal_fees || 0,
            maintenance: bf.maintenance_fees || 0
          };
        }
      }
    });
    setBookingFees(prev => ({ ...prev, ...initialFees }));
  }, [initialPlot]);

  const [feeForm, setFeeForm] = useState({ stampDuty: '', legal: '', maintenance: '' });

  const [isPending, startTransition] = React.useTransition();
  const { toast, showToast, hideToast } = useToast();

  // Add Client form
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addClientForm, setAddClientForm] = useState({
    total_amount: String(plot.price || ''),
    discount_amount: '',
    consultant_id: '',
    commission_percent: ''
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: '', mode: 'Cash', description: '', transaction_id: ''
  });

  // Discount form
  const [discountValue, setDiscountValue] = useState('');

  // Master admin modals
  const [showEditPlotModal, setShowEditPlotModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  // Edit forms
  const [editPlotForm, setEditPlotForm] = useState({
    plot_number: String(plot.plot_number || ''),
    area_sqyd: String(plot.area_sqyd || ''),
    price: String(plot.price || ''),
    status: plot.status || 'available',
  });
  const [editBookingForm, setEditBookingForm] = useState({
    total_amount: '',
    discount_amount: '',
    commission_percent: '',
    status: 'pending',
  });
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    payment_date: '',
    payment_mode: 'Cash',
    description: '',
    transaction_id: '',
  });

  // SSR-safe today date
  useEffect(() => {
    setPaymentForm(prev => ({
      ...prev,
      date: prev.date || new Date().toISOString().split('T')[0]
    }));
  }, []);

  const reload = () => window.location.reload();

  // ---- ACTIONS ----
  const isEmployee = role === 'employee';
  const isMasterAdmin = role === 'master_admin';

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) { alert('Please select a client'); return; }

    startTransition(async () => {
      const payload = {
        plot_id: plot.id,
        client_id: selectedClientId,
        total_amount: parseFloat(addClientForm.total_amount) || plot.price || 0,
        discount_amount: parseFloat(addClientForm.discount_amount) || 0,
        consultant_id: addClientForm.consultant_id || undefined,
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

  const openTransferModal = async (bookingId: string) => {
    const booking = bookings.find((b: any) => b.id === bookingId);
    setTransferBookingId(bookingId);
    setSelectedNewPlotId('');
    setIsMergeTransfer(false);
    setMergeTargetBookingId(null);
    const plots = await getTransferablePlotsForClient(projectId, booking?.client_id || '');
    setAvailablePlots(plots);
    setShowTransferModal(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferBookingId || !selectedNewPlotId) return;

    const selectedPlot = availablePlots.find((p: any) => p.id === selectedNewPlotId);
    const isPartnershipMerge = selectedPlot?.isPartnership;

    startTransition(async () => {
      if (isPartnershipMerge) {
        // Find the target booking on the selected partnership plot
        // We need to fetch the booking id for that plot; we use mergeTargetBookingId if set
        if (!mergeTargetBookingId) { showToast('Could not find target booking', 'error'); return; }
        const result = await mergeTransferIntoPartnership(transferBookingId, mergeTargetBookingId);
        if (result.success) {
          showToast('Merged into partnership booking successfully', 'success');
          setShowTransferModal(false);
          setTimeout(reload, 800);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      } else if (isEmployee) {
        const booking = bookings.find((b: any) => b.id === transferBookingId);
        const newPlot = availablePlots.find((p: any) => p.id === selectedNewPlotId);
        const result = await submitChangeRequest({
          entity_type: 'booking',
          entity_id: transferBookingId,
          operation: 'update',
          payload: { plot_id: selectedNewPlotId },
          description: `Transfer booking for "${booking?.client?.name}" from plot ${plot.plot_number} to plot ${newPlot?.plot_number}`,
        });
        if (result.success) {
          showToast('Transfer request submitted for approval', 'warning');
          setShowTransferModal(false);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      } else {
        const result = await transferBooking(transferBookingId, selectedNewPlotId);
        if (result.success) {
          showToast('Plot transferred successfully', 'success');
          setShowTransferModal(false);
          setTimeout(reload, 800);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      }
    });
  };

  // Add Partner handler
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerBookingId || !selectedPartnerId) { alert('Select a partner client'); return; }
    startTransition(async () => {
      const result = await addPartnerToBooking(partnerBookingId, selectedPartnerId);
      if (result.success) {
        showToast('Partner added successfully', 'success');
        setShowAddPartnerModal(false);
        setTimeout(reload, 800);
      } else {
        showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleRemovePartner = (bookingId: string, partnerClientId: string) => {
    if (!confirm('Remove this partner from the booking?')) return;
    startTransition(async () => {
      const result = await removePartnerFromBooking(bookingId, partnerClientId);
      if (result.success) {
        showToast('Partner removed', 'success');
        setTimeout(reload, 800);
      } else {
        showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleConfirm = (bookingId: string, clientId: string) => {
    if (!confirm('Confirm this client as the plot owner? All other negotiations will be cancelled.')) return;

    startTransition(async () => {
      if (isEmployee) {
        const booking = bookings.find((b: any) => b.id === bookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking',
          entity_id: bookingId,
          operation: 'update',
          payload: { status: 'confirmed' },
          description: `Confirm booking for "${booking?.client?.name}" on plot ${plot.plot_number}`,
        });
        if (result.success) showToast('Confirmation request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await confirmBooking(bookingId, plot.id, clientId);
        if (result.success) {
          showToast('Owner confirmed', 'success');
          setTimeout(reload, 800);
        } else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleCancel = (bookingId: string) => {
    if (!confirm('Remove this negotiation? This cannot be undone.')) return;

    startTransition(async () => {
      if (isEmployee) {
        const booking = bookings.find((b: any) => b.id === bookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking',
          entity_id: bookingId,
          operation: 'delete',
          payload: {},
          description: `Remove booking negotiation for "${booking?.client?.name}" on plot ${plot.plot_number}`,
        });
        if (result.success) showToast('Cancellation request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await cancelBooking(bookingId, plot.id);
        if (result.success) {
          showToast('Negotiation removed', 'success');
          setTimeout(reload, 800);
        } else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleRevert = (bookingId: string) => {
    if (!confirm('Revert this booking back to pending? This will remove the client as the confirmed owner.')) return;

    startTransition(async () => {
      if (isEmployee) {
        const booking = bookings.find((b: any) => b.id === bookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking',
          entity_id: bookingId,
          operation: 'update',
          payload: { status: 'pending' },
          description: `Revert booking to pending for "${booking?.client?.name}" on plot ${plot.plot_number}`,
        });
        if (result.success) showToast('Revert request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await revertBooking(bookingId, plot.id);
        if (result.success) {
          showToast('Booking reverted to pending', 'success');
          setTimeout(reload, 800);
        } else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleEditPlot = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updatePlot(plot.id, {
        plot_number: editPlotForm.plot_number,
        area_sqyd: parseFloat(editPlotForm.area_sqyd) || 0,
        price: parseFloat(editPlotForm.price) || 0,
        status: editPlotForm.status,
      });
      if (result.success) {
        showToast('Plot updated', 'success');
        setShowEditPlotModal(false);
        setTimeout(reload, 800);
      } else showToast(result.error || 'Failed', 'error');
    });
  };

  const handleEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingId) return;
    startTransition(async () => {
      const result = await updateBooking(activeBookingId, {
        total_amount: parseFloat(editBookingForm.total_amount) || 0,
        discount_amount: parseFloat(editBookingForm.discount_amount) || 0,
        commission_percent: parseFloat(editBookingForm.commission_percent) || 0,
        status: editBookingForm.status,
      });
      if (result.success) {
        showToast('Booking updated', 'success');
        setShowEditBookingModal(false);
        setTimeout(reload, 800);
      } else showToast(result.error || 'Failed', 'error');
    });
  };

  const handleEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentId) return;
    startTransition(async () => {
      const result = await updatePayment(activePaymentId, {
        amount: parseFloat(editPaymentForm.amount) || 0,
        payment_date: editPaymentForm.payment_date,
        payment_mode: editPaymentForm.payment_mode,
        description: editPaymentForm.description,
        transaction_id: editPaymentForm.transaction_id || undefined,
      });
      if (result.success) {
        showToast('Payment updated', 'success');
        setShowEditPaymentModal(false);
        setTimeout(reload, 800);
      } else showToast(result.error || 'Failed', 'error');
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!confirm('Delete this payment record? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await deletePayment(paymentId);
      if (result.success) {
        showToast('Payment deleted', 'success');
        setTimeout(reload, 800);
      } else showToast(result.error || 'Failed', 'error');
    });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingId || !activeClientId) { alert('Missing booking info'); return; }

    startTransition(async () => {
      const payload = {
        booking_id: activeBookingId,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.date,
        payment_mode: paymentForm.mode,
        description: paymentForm.description,
        transaction_id: paymentForm.transaction_id || undefined,
        entity_id: activeClientId,
      };

      if (isEmployee) {
        const booking = bookings.find((b: any) => b.id === activeBookingId);
        const result = await submitChangeRequest({
          entity_type: 'payment',
          operation: 'create',
          payload,
          description: `New payment of ₹${formatNumber(payload.amount)} for plot ${plot.plot_number} (${booking?.client?.name})`,
        });
        if (result.success) {
          showToast('Payment request submitted for review', 'warning');
          setShowPaymentModal(false);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      } else {
        const result = await addPayment(payload);
        if (result.success) {
          showToast('Payment recorded successfully', 'success');
          setShowPaymentModal(false);
          setTimeout(reload, 800);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      }
    });
  };

  const handleUpdateDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingId) return;

    startTransition(async () => {
      const newDiscount = parseFloat(discountValue) || 0;
      if (isEmployee) {
        const booking = bookings.find((b: any) => b.id === activeBookingId);
        const result = await submitChangeRequest({
          entity_type: 'booking',
          entity_id: activeBookingId,
          operation: 'update',
          payload: { discount_amount: newDiscount },
          description: `Update discount to ₹${formatNumber(newDiscount)} for plot ${plot.plot_number} (${booking?.client?.name})`,
        });
        if (result.success) {
          showToast('Discount change request submitted', 'warning');
          setShowDiscountModal(false);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      } else {
        const result = await updateBookingDiscount(activeBookingId, newDiscount);
        if (result.success) {
          showToast('Discount updated', 'success');
          setShowDiscountModal(false);
          setTimeout(reload, 800);
        } else {
          showToast(result.error || 'Failed', 'error');
        }
      }
    });
  };

  const handleCloseModal = () => {
    setShowAddClientModal(false);
    setShowPaymentModal(false);
    setShowDiscountModal(false);
    setShowTransferModal(false);
    setShowAddPartnerModal(false);
    setShowFeesModal(false);
  };

  const handlePrintAllotmentLetter = async (booking: any) => {
    try {
      const payload = {
        name: booking.client?.name,
        client_name: booking.client?.name,
        partner_name: (booking.booking_partners || []).length > 0 ? booking.booking_partners.map((bp: any) => bp.client?.name).filter(Boolean).join(' & ') : null,
        project_name: plot.project?.name,
        plot_number: plot.plot_number,
        area_sqyd: plot.area_sqyd
      };
      const result = await generateAllotmentLetter(payload, true);
      if (result) {
        setPdfDoc(result.doc);
        setPdfFileName(result.fileName);
        setShowPdfModal(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate Allotment Letter');
    }
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
    return 'bg-emerald-100 text-emerald-700';
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
            {isMasterAdmin && (
              <button
                onClick={() => setShowEditPlotModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Plot
              </button>
            )}
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
            {!confirmedBooking && (isAdmin || isEmployee) && (
              <button
                onClick={() => setShowAddClientModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> {isEmployee ? 'Request Booking' : 'Add Client'}
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
                const fees = bookingFees[booking.id] || { stampDuty: 0, legal: 0, maintenance: 0 };
                const stampAmount = (booking.total_amount * fees.stampDuty) / 100;
                const legalAmount = (booking.total_amount * fees.legal) / 100;
                const maintenanceAmount = (booking.total_amount * fees.maintenance) / 100;
                const totalFees = stampAmount + legalAmount + maintenanceAmount;
                const grandTotal = finalDeal + totalFees;

                const paid = (booking.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                const due = grandTotal - paid;
                const isConfirmed = booking.status === 'confirmed';
                const paymentPct = grandTotal > 0 ? Math.round((paid / grandTotal) * 100) : 0;

                return (
                  <div key={booking.id} className={`border rounded-2xl p-6 ${isConfirmed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'} shadow-sm`}>
                    {/* Booking Header */}
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
                          {isConfirmed ? <Trophy className="w-6 h-6" /> : (booking.client?.name?.charAt(0) || 'C')}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {booking.client?.name || 'Unknown Client'}
                            {(booking.booking_partners || []).length > 0 && (
                              <span className="text-gray-400 font-normal text-base">
                                {' & '}
                                {(booking.booking_partners || []).map((bp: any) => bp.client?.name).filter(Boolean).join(' & ')}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{booking.client?.phone || 'No Phone'}</span>
                            {(booking.booking_partners || []).length > 0 && (
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">Partnership</span>
                            )}
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
                          Booking Status: {booking.status}
                        </span>
                        {/* Admin Actions */}
                        {/* Add Partner button — always shown unless plot is cancelled */}
                        {(isAdmin || isEmployee) && booking.status !== 'cancelled' && (
                          <button
                            onClick={() => { setPartnerBookingId(booking.id); setPartnerSearch(''); setSelectedPartnerId(''); setShowAddPartnerModal(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-bold hover:bg-violet-100 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Partner
                          </button>
                        )}
                        {/* Per-partner remove buttons */}
                        {(isAdmin || isEmployee) && (booking.booking_partners || []).map((bp: any) => (
                          <button
                            key={bp.client_id}
                            onClick={() => handleRemovePartner(booking.id, bp.client_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Remove {bp.client?.name || 'Partner'}
                          </button>
                        ))}
                        {isAdmin && isConfirmed && (
                           <button
                             onClick={() => handlePrintAllotmentLetter(booking)}
                             className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                           >
                             <Printer className="w-3.5 h-3.5" /> Print Allotment Letter
                           </button>
                        )}
                        {isMasterAdmin && (
                          <button
                            onClick={() => {
                              setActiveBookingId(booking.id);
                              setEditBookingForm({
                                total_amount: String(booking.total_amount || ''),
                                discount_amount: String(booking.discount_amount || ''),
                                commission_percent: String(booking.commission_percent || ''),
                                status: booking.status,
                              });
                              setShowEditBookingModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-bold hover:bg-violet-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Booking
                          </button>
                        )}
                        {(isAdmin || isEmployee) && isConfirmed && (
                          <button
                            onClick={() => handleRevert(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" /> {isEmployee ? 'Request Revert' : 'Revert to Pending'}
                          </button>
                        )}
                        {(isAdmin || isEmployee) && !isConfirmed && booking.status === 'pending' && !confirmedBooking && (
                          <button
                            onClick={() => handleConfirm(booking.id, booking.client_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> {isEmployee ? 'Request Confirmation' : 'Confirm Owner'}
                          </button>
                        )}
                        {(isAdmin || isEmployee) && booking.status === 'pending' && (
                          <button
                            onClick={() => openTransferModal(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> {isEmployee ? 'Request Transfer' : 'Transfer Plot'}
                          </button>
                        )}
                        {(isAdmin || isEmployee) && booking.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> {isEmployee ? 'Request Removal' : 'Remove'}
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
                        {fees.stampDuty > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>+ Stamp Duty ({fees.stampDuty}%)</span>
                            <span>₹{formatNumber(stampAmount)}</span>
                          </div>
                        )}
                        {fees.legal > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>+ Legal Fees ({fees.legal}%)</span>
                            <span>₹{formatNumber(legalAmount)}</span>
                          </div>
                        )}
                        {fees.maintenance > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>+ Maintenance ({fees.maintenance}%)</span>
                            <span>₹{formatNumber(maintenanceAmount)}</span>
                          </div>
                        )}
                        {totalFees > 0 && (
                          <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 text-violet-700">
                            <span>Total Deal Value</span>
                            <span>₹{formatNumber(grandTotal)}</span>
                          </div>
                        )}
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
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setActiveFeeBookingId(booking.id);
                              const existing = bookingFees[booking.id] || { stampDuty: 0, legal: 0, maintenance: 0 };
                              setFeeForm({
                                stampDuty: existing.stampDuty ? String(existing.stampDuty) : '',
                                legal: existing.legal ? String(existing.legal) : '',
                                maintenance: existing.maintenance ? String(existing.maintenance) : '',
                              });
                              setShowFeesModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline font-semibold pt-2"
                          >
                            <Plus className="w-3 h-3" /> Calculate Fees
                          </button>
                        )}
                      </div>

                      {/* Payment history */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment History</h4>
                          {booking.status !== 'cancelled' && (isAdmin || isEmployee) && (
                            <button
                              onClick={() => { setActiveBookingId(booking.id); setActiveClientId(booking.client_id); setShowPaymentModal(true); }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline"
                            >
                              <HandCoins className="w-3 h-3" /> {isEmployee ? 'Request Payment' : 'Add Payment'}
                            </button>
                          )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-3 py-2 text-left text-gray-600 font-semibold">Date</th>
                                  <th className="px-3 py-2 text-left text-gray-600 font-semibold">Mode</th>
                                  <th className="px-3 py-2 text-left text-gray-600 font-semibold">By</th>
                                  <th className="px-3 py-2 text-right text-gray-600 font-semibold">Amount</th>
                                  {isMasterAdmin && <th className="px-3 py-2"></th>}
                                </tr>
                            </thead>
                            <tbody>
                              {(booking.payments || []).map((p: any) => (
                                <tr key={p.id} className="border-b last:border-0">
                                  <td className="px-3 py-2 text-gray-700">
                                    {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">{p.payment_mode}</td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">
                                    {p.entity_id === booking.client_id
                                      ? (booking.client?.name || '—')
                                      : (() => {
                                          const partnerMatch = (booking.booking_partners || []).find((bp: any) => bp.client_id === p.entity_id);
                                          return partnerMatch
                                            ? <span className="text-violet-600 font-semibold">{partnerMatch.client?.name || 'Partner'}</span>
                                            : '—';
                                        })()
                                    }
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-gray-900">₹{formatNumber(p.amount)}</td>
                                  {isMasterAdmin && (
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setActivePaymentId(p.id);
                                            setEditPaymentForm({
                                              amount: String(p.amount || ''),
                                              payment_date: p.payment_date || '',
                                              payment_mode: p.payment_mode || 'Cash',
                                              description: p.description || '',
                                              transaction_id: p.transaction_id || '',
                                            });
                                            setShowEditPaymentModal(true);
                                          }}
                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                          title="Edit payment"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePayment(p.id)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                          title="Delete payment"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                              {(booking.payments || []).length === 0 && (
                                <tr><td colSpan={isMasterAdmin ? 5 : 4} className="p-3 text-center text-gray-400">No payments yet</td></tr>
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
              <h2 className="text-xl font-bold text-gray-900">{isEmployee ? 'Request New Booking' : 'Add Negotiating Client'}</h2>
              <button onClick={handleCloseModal}><X className="w-5 h-5 text-gray-400" /></button>
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
                <select className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 text-sm bg-white"
                  value={addClientForm.consultant_id}
                  onChange={e => setAddClientForm({ ...addClientForm, consultant_id: e.target.value })}
                >
                  <option value="">No Consultant</option>
                  {consultants.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.consultant_code || 'No Code'})</option>
                  ))}
                </select>
              </div>
              {addClientForm.consultant_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                  <input type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                    value={addClientForm.commission_percent}
                    onChange={e => setAddClientForm({ ...addClientForm, commission_percent: e.target.value })}
                    placeholder="e.g. 10"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={!selectedClientId || isPending}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Submitting...' : (isEmployee ? 'Submit Request' : 'Add to Negotiations')}
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
              <h2 className="text-xl font-bold text-gray-900">{isEmployee ? 'Request Payment' : 'Add Payment'}</h2>
              <button onClick={handleCloseModal}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-4">
              {/* Payment By — only shown when booking has a partner */}
              {(() => {
                const activeBooking = bookings.find((b: any) => b.id === activeBookingId);
                const hasPartners = (activeBooking?.booking_partners || []).length > 0;
                return hasPartners ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment By</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      value={activeClientId || ''}
                      onChange={e => setActiveClientId(e.target.value)}
                    >
                      <option value={activeBooking.client_id}>{activeBooking.client?.name} (Primary)</option>
                      {(activeBooking.booking_partners || []).map((bp: any) => (
                        <option key={bp.client_id} value={bp.client_id}>{bp.client?.name} (Partner)</option>
                      ))}
                    </select>
                  </div>
                ) : null;
              })()}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
                  disabled={isPending}
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
                  <option>NEFT/IMPS/RTGS</option>
                </select>
              </div>
              {paymentForm.mode !== 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID / Cheque No.</label>
                  <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                    value={paymentForm.transaction_id} onChange={e => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                  value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Submitting...' : (isEmployee ? 'Submit Request' : 'Save Payment')}
                </button>
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
              <h2 className="text-xl font-bold text-gray-900">{isEmployee ? 'Request Discount Change' : 'Update Discount'}</h2>
              <button onClick={handleCloseModal}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdateDiscount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
                  disabled={isPending}
                  placeholder="0" value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Submitting...' : (isEmployee ? 'Submit Request' : 'Apply')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== CALCULATE FEES MODAL ===== */}
      {showFeesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Calculate Fees</h2>
              <button onClick={handleCloseModal}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (activeFeeBookingId) {
                const newFees = {
                  stampDuty: parseFloat(feeForm.stampDuty) || 0,
                  legal: parseFloat(feeForm.legal) || 0,
                  maintenance: parseFloat(feeForm.maintenance) || 0,
                };
                
                setBookingFees(prev => ({
                  ...prev,
                  [activeFeeBookingId]: newFees
                }));
                setShowFeesModal(false);
                
                startTransition(async () => {
                  const res = await updateBookingFees(activeFeeBookingId, newFees);
                  if (res.success) {
                    showToast('Fees updated successfully', 'success');
                  } else {
                    showToast(res.error || 'Failed to update fees', 'error');
                  }
                });
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stamp Duty (%)</label>
                <input type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500"
                  placeholder="0" value={feeForm.stampDuty}
                  onChange={e => setFeeForm({ ...feeForm, stampDuty: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Fees (%)</label>
                <input type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500"
                  placeholder="0" value={feeForm.legal}
                  onChange={e => setFeeForm({ ...feeForm, legal: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Fees (%)</label>
                <input type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500"
                  placeholder="0" value={feeForm.maintenance}
                  onChange={e => setFeeForm({ ...feeForm, maintenance: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700">
                  Calculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT PLOT MODAL (master_admin) ===== */}
      {showEditPlotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Plot Details</h2>
              <button onClick={() => setShowEditPlotModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditPlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plot Number</label>
                  <input className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editPlotForm.plot_number}
                    onChange={e => setEditPlotForm({ ...editPlotForm, plot_number: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area (sq.yd)</label>
                  <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editPlotForm.area_sqyd}
                    onChange={e => setEditPlotForm({ ...editPlotForm, area_sqyd: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">List Price (₹)</label>
                  <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editPlotForm.price}
                    onChange={e => setEditPlotForm({ ...editPlotForm, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    value={editPlotForm.status}
                    onChange={e => setEditPlotForm({ ...editPlotForm, status: e.target.value })}>
                    <option value="available">Available</option>
                    <option value="token_paid">Token Paid</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditPlotModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT BOOKING MODAL (master_admin) ===== */}
      {showEditBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Booking</h2>
              <button onClick={() => setShowEditBookingModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                  <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editBookingForm.total_amount}
                    onChange={e => setEditBookingForm({ ...editBookingForm, total_amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                  <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editBookingForm.discount_amount}
                    onChange={e => setEditBookingForm({ ...editBookingForm, discount_amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
                  <input type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editBookingForm.commission_percent}
                    onChange={e => setEditBookingForm({ ...editBookingForm, commission_percent: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    value={editBookingForm.status}
                    onChange={e => setEditBookingForm({ ...editBookingForm, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditBookingModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT PAYMENT MODAL (master_admin) ===== */}
      {showEditPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Payment</h2>
              <button onClick={() => setShowEditPaymentModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  value={editPaymentForm.amount}
                  onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editPaymentForm.payment_date}
                    onChange={e => setEditPaymentForm({ ...editPaymentForm, payment_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    value={editPaymentForm.payment_mode}
                    onChange={e => setEditPaymentForm({ ...editPaymentForm, payment_mode: e.target.value })}>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>UPI</option>
                    <option>NEFT/IMPS/RTGS</option>
                  </select>
                </div>
              </div>
              {editPaymentForm.payment_mode !== 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID / Cheque No.</label>
                  <input className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    value={editPaymentForm.transaction_id}
                    onChange={e => setEditPaymentForm({ ...editPaymentForm, transaction_id: e.target.value })} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  value={editPaymentForm.description}
                  onChange={e => setEditPaymentForm({ ...editPaymentForm, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditPaymentModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD PARTNER MODAL ===== */}
      {showAddPartnerModal && (() => {
        const filteredPartnerClients = clients.filter((c: any) =>
          c.id !== bookings.find((b: any) => b.id === partnerBookingId)?.client_id &&
          (c.name?.toLowerCase().includes(partnerSearch.toLowerCase()) ||
           c.client_code?.toLowerCase().includes(partnerSearch.toLowerCase()))
        );
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add Partnership Client</h2>
                  <p className="text-xs text-gray-400 mt-0.5">This client will share this booking with the primary client</p>
                </div>
                <button onClick={handleCloseModal}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleAddPartner} className="flex flex-col gap-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Client</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or code..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      value={partnerSearch}
                      onChange={e => setPartnerSearch(e.target.value)}
                    />
                  </div>
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
                    {filteredPartnerClients.slice(0, 20).map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedPartnerId(c.id)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-violet-50 transition-colors ${selectedPartnerId === c.id ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-gray-700'}`}
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-gray-400">{c.client_code}</span>
                      </button>
                    ))}
                    {filteredPartnerClients.length === 0 && <p className="p-3 text-sm text-gray-400 text-center">No clients found</p>}
                  </div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                  <button type="submit" disabled={!selectedPartnerId || isPending}
                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                    {isPending ? 'Adding...' : 'Add as Partner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* PDF PREVIEW MODAL */}
      <PDFPreviewModal
        isOpen={showPdfModal}
        onClose={() => {
          setShowPdfModal(false);
          setPdfDoc(null);
        }}
        pdfDoc={pdfDoc}
        fileName={pdfFileName}
        title="Welcome Letter Preview"
      />

      {/* ===== TRANSFER PLOT MODAL ===== */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{isEmployee ? 'Request Plot Transfer' : 'Transfer Client to Another Plot'}</h2>
              <button onClick={() => setShowTransferModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Available Plot</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                  value={selectedNewPlotId}
                  onChange={async (e) => {
                    const newVal = e.target.value;
                    setSelectedNewPlotId(newVal);
                    const selected = availablePlots.find((p: any) => p.id === newVal);
                    if (selected?.isPartnership && transferBookingId) {
                      const booking = bookings.find((b: any) => b.id === transferBookingId);
                      // Fetch the target booking id on that partnership plot for this client
                      const { createClient } = await import('@/utils/supabase/client');
                      const supabase = createClient();
                      const { data: targetBooking } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('plot_id', newVal)
                        .eq('partner_client_id', booking?.client_id || '')
                        .in('status', ['pending', 'confirmed'])
                        .single();
                      setMergeTargetBookingId(targetBooking?.id || null);
                    } else {
                      setMergeTargetBookingId(null);
                    }
                  }}
                  required
                >
                  <option value="" disabled>Select a plot...</option>
                  {availablePlots.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      Plot {p.plot_number} ({p.area_sqyd} sq.yd) - ₹{formatNumber(p.price)}{p.isPartnership ? ' [Partnership — Merge]' : (p.status !== 'available' ? ' [Own Booking]' : '')}
                    </option>
                  ))}
                </select>
                {availablePlots.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No available plots found in this project.</p>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={isPending || !selectedNewPlotId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
                  {isPending ? 'Processing...' : (isEmployee ? 'Submit Request' : 'Confirm Transfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
