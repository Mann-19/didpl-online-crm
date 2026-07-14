'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Users, Plus, Ruler, Banknote, Trophy,
  CheckCircle2, XCircle, Percent, HandCoins, Search, X, Printer, Clock,
  Edit2, Trash2, UserPlus, GitMerge, Bookmark, FileText, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/utils/formatNumber';
import { parseFee } from '@/utils/parseFee';
import {
  confirmBooking, cancelBooking, updateBookingDiscount, revertBooking,
  updateBooking, updatePayment, deletePayment, addPayment,
  transferBooking, getTransferablePlotsForClient,
  addPartnerToBooking, removePartnerFromBooking, mergeTransferIntoPartnership,
  updateBookingFees, mergeBookingsOnSamePlot
} from '../../../../../../plots.actions';
import { submitChangeRequest } from '@/app/(admin)/change-requests.actions';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';
import { generateAllotmentLetter } from '@/utils/pdf/generateAllotmentLetter';
import { generateReceipt } from '@/utils/pdf/generateReceipt';
import { generateMergedReceipt } from '@/utils/pdf/generateMergedReceipt';
import { Toast, useToast } from '@/components/ui/Toast';
import DocumentSection from '@/components/documents/DocumentSection';

export default function BookingDetailsClient({
  initialBooking, clients, consultants, projectId, plotId, isAdmin, role, companies = []
}: any) {
  const [booking, setBooking] = useState(initialBooking);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availablePlots, setAvailablePlots] = useState<any[]>([]);
  const [selectedNewPlotId, setSelectedNewPlotId] = useState('');
  const [isMergeTransfer, setIsMergeTransfer] = useState(false);
  const [mergeTargetBookingId, setMergeTargetBookingId] = useState<string | null>(null);

  // Partner Modal
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  // Edit Modals
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  // Fees Modals
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [bookingFees, setBookingFees] = useState<Record<string, { stampDuty: string | number, legal: string | number, maintenance: string | number, registration: string | number, govFees?: string | number }>>({});
  
  const parseState = (val: string | number | undefined) => {
    if (!val || val === '0') return { value: '', type: '%' };
    const str = String(val).trim();
    if (str.endsWith('%')) return { value: str.replace('%', ''), type: '%' };
    return { value: str, type: '₹' };
  };

  const [feeForm, setFeeForm] = useState({ 
    stampDuty: { value: '', type: '%' }, 
    legal: { value: '', type: '%' }, 
    maintenance: { value: '', type: '%' },
    registration: { value: '', type: '%' }
  });

  const [isPending, startTransition] = React.useTransition();
  const { toast, showToast, hideToast } = useToast();

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0], mode: 'Cash', description: '', transaction_id: '', payment_type: 'Plot payment', entity_id: '', company_id: ''
  });
  const [discountValue, setDiscountValue] = useState(String(booking.discount_amount || 0));
  const [editBookingForm, setEditBookingForm] = useState({
    total_amount: String(booking.total_amount || ''),
    discount_amount: String(booking.discount_amount || ''),
    commission_percent: String(booking.commission_percent || ''),
    status: booking.status,
  });
  const [editPaymentForm, setEditPaymentForm] = useState({
    id: '', amount: '', payment_date: '', payment_mode: 'Cash', description: '', transaction_id: '', payment_type: 'Plot payment'
  });

  useEffect(() => {
    const bf = Array.isArray(booking.booking_fees) ? booking.booking_fees[0] : booking.booking_fees;
    if (bf) {
      setBookingFees({
        [booking.id]: {
          stampDuty: bf.stamp_duty || 0,
          legal: bf.legal_fees || 0,
          maintenance: bf.maintenance_fees || 0,
          registration: bf.registration_fees || 0,
          govFees: bf.gov_fees || 0 
        }
      });
    }
  }, [booking]);

  const reload = () => window.location.reload();
  const isEmployee = role === 'employee';
  const isMasterAdmin = role === 'master_admin';

  // --- ACTIONS ---

  const handleConfirm = () => {
    if (!confirm('Confirm this client as the plot owner?')) return;
    startTransition(async () => {
      if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: booking.id, operation: 'update',
          payload: { status: 'confirmed' },
          description: `Confirm booking for "${booking.client?.name}" on plot ${booking.plot?.plot_number}`,
        });
        if (result.success) showToast('Confirmation request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await confirmBooking(booking.id, booking.plot_id, booking.client_id);
        if (result.success) { showToast('Owner confirmed', 'success'); setTimeout(reload, 800); }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleCancel = () => {
    if (!confirm('Remove this negotiation? This cannot be undone.')) return;
    startTransition(async () => {
      if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: booking.id, operation: 'delete', payload: {},
          description: `Remove booking negotiation for "${booking.client?.name}" on plot ${booking.plot?.plot_number}`,
        });
        if (result.success) showToast('Cancellation request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await cancelBooking(booking.id, booking.plot_id);
        // Navigate back to plot page since this booking is deleted
        if (result.success) { window.location.href = `/projects/${projectId}/plot/${plotId}`; }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleRevert = () => {
    if (!confirm('Revert this booking back to pending?')) return;
    startTransition(async () => {
      if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: booking.id, operation: 'update', payload: { status: 'pending' },
          description: `Revert booking to pending for "${booking.client?.name}" on plot ${booking.plot?.plot_number}`,
        });
        if (result.success) showToast('Revert request sent for approval', 'warning');
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await revertBooking(booking.id, booking.plot_id);
        if (result.success) { showToast('Booking reverted to pending', 'success'); setTimeout(reload, 800); }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const openTransferModal = async () => {
    setSelectedNewPlotId('');
    setIsMergeTransfer(false);
    setMergeTargetBookingId(null);
    const plots = await getTransferablePlotsForClient(projectId, booking.client_id);
    setAvailablePlots(plots);
    setShowTransferModal(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewPlotId) return;

    const selectedPlot = availablePlots.find((p: any) => p.uniqueKey === selectedNewPlotId);
    const actualPlotId = selectedPlot?.id;
    if (!actualPlotId) return;

    const isPartnershipMerge = selectedPlot?.isPartnership;

    startTransition(async () => {
      if (isPartnershipMerge) {
        if (!mergeTargetBookingId) { showToast('Could not find target booking', 'error'); return; }
        const result = await mergeTransferIntoPartnership(booking.id, mergeTargetBookingId);
        if (result.success) {
          showToast('Merged into partnership booking successfully', 'success');
          setShowTransferModal(false);
          setTimeout(() => window.location.href = `/projects/${projectId}/plot/${actualPlotId}`, 800);
        } else showToast(result.error || 'Failed', 'error');
      } else if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: booking.id, operation: 'update', payload: { plot_id: actualPlotId },
          description: `Transfer booking for "${booking.client?.name}" to plot ${selectedPlot.plot_number}`,
        });
        if (result.success) {
          showToast('Transfer request submitted for approval', 'warning');
          setShowTransferModal(false);
        } else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await transferBooking(booking.id, actualPlotId);
        if (result.success) {
          showToast('Plot transferred successfully', 'success');
          setShowTransferModal(false);
          setTimeout(() => window.location.href = `/projects/${projectId}/plot/${actualPlotId}/booking/${booking.id}`, 800);
        } else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) { alert('Select a partner client'); return; }
    startTransition(async () => {
      const result = await addPartnerToBooking(booking.id, selectedPartnerId);
      if (result.success) {
        showToast('Partner added successfully', 'success');
        setShowAddPartnerModal(false);
        setTimeout(reload, 800);
      } else showToast(result.error || 'Failed', 'error');
    });
  };

  const handleRemovePartner = (partnerClientId: string) => {
    if (!confirm('Remove this partner from the booking?')) return;
    startTransition(async () => {
      const result = await removePartnerFromBooking(booking.id, partnerClientId);
      if (result.success) { showToast('Partner removed', 'success'); setTimeout(reload, 800); }
      else showToast(result.error || 'Failed', 'error');
    });
  };

  const handlePrintAllotmentLetter = async () => {
    try {
      const payload = {
        name: booking.client?.name,
        client_name: booking.client?.name,
        partner_name: (booking.booking_partners || []).length > 0 ? booking.booking_partners.map((bp: any) => bp.client?.name).filter(Boolean).join(' & ') : null,
        project_name: booking.plot?.project?.name,
        plot_number: booking.plot?.plot_number,
        area_sqyd: booking.plot?.area_sqyd
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

  const handleDownloadReceipt = async (payment: any) => {
    try {
      const payload = {
        client_name: booking.client?.name,
        gender: booking.client?.gender,
        residential_address: booking.client?.residential_address,
        client_city: booking.client?.residential_city,
        client_state: booking.client?.residential_state,
        client_pincode: booking.client?.residential_pincode,
        amount: payment.amount,
        transaction_id: payment.transaction_id,
        payment_date: payment.payment_date,
        payment_mode: payment.payment_mode,
        payment_type: payment.payment_type || 'Plot payment',
        id: payment.id
      };
      const result = await generateReceipt(payload, true);
      if (result) {
        setPdfDoc(result.doc);
        setPdfFileName(result.fileName);
        setShowPdfModal(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate receipt');
    }
  };

  const handleDownloadMergedReceipt = async () => {
    try {
      const paymentsToMerge = (booking.payments || []).filter((p: any) => selectedPayments.includes(p.id));
      let plotSum = 0;
      let legalSum = 0;
      paymentsToMerge.forEach((p: any) => {
        if (p.payment_type === 'Legal fees') legalSum += Number(p.amount);
        else plotSum += Number(p.amount);
      });
      const payload = {
        client_name: booking.client?.name,
        gender: booking.client?.gender,
        residential_address: booking.client?.residential_address,
        client_city: booking.client?.residential_city,
        client_state: booking.client?.residential_state,
        client_pincode: booking.client?.residential_pincode,
        plot_payment_total: plotSum,
        legal_fees_total: legalSum,
      };
      const result = await generateMergedReceipt(payload, true);
      if (result) {
        setPdfDoc(result.doc);
        setPdfFileName(result.fileName);
        setShowPdfModal(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate merged receipt');
    }
  };

  const handleEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBooking(booking.id, {
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

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        booking_id: booking.id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.date,
        payment_mode: paymentForm.mode,
        description: paymentForm.description,
        transaction_id: paymentForm.transaction_id || '',
        entity_id: paymentForm.entity_id || booking.client_id,
        company_id: paymentForm.company_id || undefined,
        payment_type: paymentForm.payment_type
      };

      if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'payment', operation: 'create', payload,
          description: `New payment of ₹${formatNumber(payload.amount)} for plot ${booking.plot?.plot_number} (${booking.client?.name})`,
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

  const handleUpdateDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const newDiscount = parseFloat(discountValue) || 0;
      if (isEmployee) {
        const result = await submitChangeRequest({
          entity_type: 'booking', entity_id: booking.id, operation: 'update', payload: { discount_amount: newDiscount },
          description: `Update discount to ₹${formatNumber(newDiscount)} for plot ${booking.plot?.plot_number} (${booking.client?.name})`,
        });
        if (result.success) { showToast('Discount change request submitted', 'warning'); setShowDiscountModal(false); }
        else showToast(result.error || 'Failed', 'error');
      } else {
        const result = await updateBookingDiscount(booking.id, newDiscount);
        if (result.success) { showToast('Discount updated', 'success'); setShowDiscountModal(false); setTimeout(reload, 800); }
        else showToast(result.error || 'Failed', 'error');
      }
    });
  };

  const handleUpdateFees = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formatFeeField = (field: any) => field.value ? `${field.value}${field.type}` : '';
      const payload = {
        stampDuty: formatFeeField(feeForm.stampDuty),
        legal: formatFeeField(feeForm.legal), // Map UI 'legal' to DB gov_fees in plots.actions
        maintenance: formatFeeField(feeForm.maintenance),
        registration: formatFeeField(feeForm.registration),
        govFees: formatFeeField(feeForm.legal) // TEMPORARY_GOV_FEES_V200
      };
      const result = await updateBookingFees(booking.id, payload);
      if (result.success) { showToast('Fees updated', 'success'); setShowFeesModal(false); setTimeout(reload, 800); }
      else showToast(result.error || 'Failed to update fees', 'error');
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
        transaction_id: editPaymentForm.transaction_id || '',
        payment_type: editPaymentForm.payment_type
      });
      if (result.success) { showToast('Payment updated', 'success'); setShowEditPaymentModal(false); setTimeout(reload, 800); }
      else showToast(result.error || 'Failed', 'error');
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!confirm('Delete this payment record? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await deletePayment(paymentId);
      if (result.success) { showToast('Payment deleted', 'success'); setTimeout(reload, 800); }
      else showToast(result.error || 'Failed', 'error');
    });
  };

  // --- DERIVED DATA ---
  const isConfirmed = booking.status === 'confirmed';
  const finalDeal = booking.total_amount - (booking.discount_amount || 0);
  const fees = bookingFees[booking.id] || { stampDuty: '0', legal: '0', maintenance: '0', registration: '0', govFees: '0' };
  const stampDutyAmount = parseFee(fees.stampDuty, finalDeal);
  const legalFeesAmount = parseFee(fees.govFees, finalDeal); // TEMPORARY_GOV_FEES_V200 mapping
  const maintenanceAmount = parseFee(fees.maintenance, finalDeal);
  const registrationFeesAmount = parseFee(fees.registration, finalDeal);

  // Plot paid amount
  const paid = (booking.payments || [])
    .filter((p: any) => p.payment_type === 'Plot payment' || !p.payment_type)
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const due = finalDeal - paid;
  const paymentPct = finalDeal > 0 ? Math.round((paid / finalDeal) * 100) : 0;

  const legalFeePaid = (booking.payments || []).filter((p: any) => p.payment_type === 'Legal fees').reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const legalFeePct = legalFeesAmount > 0 ? Math.round((legalFeePaid / legalFeesAmount) * 100) : 0;
  const isLegalFullyPaid = legalFeePaid >= legalFeesAmount;

  const filteredClients = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(partnerSearch.toLowerCase()) ||
    c.client_code?.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-500 border border-gray-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Navigation */}
        <div>
          <Link href={`/projects/${projectId}/plot/${plotId}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-violet-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Plot Details
          </Link>
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Booking Details</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500 font-medium">Plot {booking.plot?.plot_number}</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500 font-medium">{booking.plot?.project?.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Generic Actions Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase mr-2 ${statusBadge(booking.status)}`}>
            Status: {booking.status}
          </span>
          {(isAdmin || isEmployee) && !isConfirmed && booking.status === 'pending' && (
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> {isEmployee ? 'Request Confirmation' : 'Confirm Booking'}
            </button>
          )}
          {(isAdmin || isEmployee) && isConfirmed && (
            <button
              onClick={handleRevert}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors"
            >
              <Clock className="w-4 h-4" /> {isEmployee ? 'Request Revert' : 'Revert to Pending'}
            </button>
          )}
          {(isAdmin || isEmployee) && booking.status === 'pending' && (
            <button
              onClick={openTransferModal}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
            >
              <GitMerge className="w-4 h-4" /> Transfer
            </button>
          )}
          {(isAdmin || isEmployee) && booking.status !== 'cancelled' && (
            <button
              onClick={() => { setPartnerSearch(''); setSelectedPartnerId(''); setShowAddPartnerModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-sm font-bold hover:bg-violet-100 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add Partner
            </button>
          )}
          {isAdmin && isConfirmed && (
            <button
              onClick={handlePrintAllotmentLetter}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Allotment Letter
            </button>
          )}
          {isMasterAdmin && (
            <button
              onClick={() => setShowEditBookingModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit Booking Data
            </button>
          )}
          {(isAdmin || isEmployee) && booking.status === 'pending' && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors ml-auto"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>

        {/* 2. Plot Details & 3. Associated Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plot Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">Plot Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Plot Number</p>
                  <p className="text-lg font-bold text-gray-900">{booking.plot?.plot_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Area</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(booking.plot?.area_sqyd)} <span className="text-sm font-normal text-gray-500">sq.yd</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">List Price</p>
                  <p className="text-lg font-bold text-gray-900">₹{formatNumber(booking.plot?.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Booking Date</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(booking.booking_date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Associated Parties */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">Associated Parties</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Primary Client */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Primary Client</p>
                  <Link href={`/clients/${booking.client_id}`} className="text-base font-bold text-violet-700 hover:underline">
                    {booking.client?.name}
                  </Link>
                  <p className="text-sm text-gray-500">{booking.client?.phone}</p>
                </div>
              </div>
              
              {/* Partners */}
              {(booking.booking_partners || []).length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Partners</p>
                  {(booking.booking_partners || []).map((bp: any) => (
                    <div key={bp.client_id} className="flex items-center justify-between">
                      <div>
                        <Link href={`/clients/${bp.client_id}`} className="text-sm font-bold text-gray-900 hover:text-violet-700 hover:underline">
                          {bp.client?.name}
                        </Link>
                        <p className="text-xs text-gray-500">{bp.client?.phone}</p>
                      </div>
                      <button
                        onClick={() => handleRemovePartner(bp.client_id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Remove Partner"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Consultant */}
              {booking.consultant?.name && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Consultant</p>
                  <p className="text-sm font-bold text-gray-900">{booking.consultant.name}</p>
                  <p className="text-xs text-gray-500">{booking.commission_percent}% Commission</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Financial Details & 6. Legal Fees */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">Financial Summary</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Deal Value</p>
                  <p className="text-xl font-bold text-gray-900">₹{formatNumber(finalDeal)}</p>
                  {booking.discount_amount > 0 && (
                    <p className="text-xs text-red-500 mt-1">₹{formatNumber(booking.discount_amount)} Discount</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Paid</p>
                  <p className="text-xl font-bold text-emerald-600">₹{formatNumber(paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Balance Due</p>
                  <p className="text-xl font-bold text-orange-600">₹{formatNumber(due)}</p>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100"
                  >
                    Manage Discount
                  </button>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-semibold">
                  <span>Payment Progress</span>
                  <span>{paymentPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(paymentPct, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                <h2 className="font-bold text-gray-900">Legal & Gov Fees</h2>
              </div>
              <button
                onClick={() => setShowFeesModal(true)}
                className="text-xs font-semibold text-violet-600 hover:underline"
              >
                Calculate
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              {legalFeesAmount > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className={`${isLegalFullyPaid ? 'text-emerald-500' : 'text-blue-500'}`} strokeDasharray={`${Math.min(legalFeePct, 100)}, 100`} strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-bold text-gray-900">{legalFeePct}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Fees: <span className="font-bold text-gray-900">₹{formatNumber(legalFeesAmount)}</span></p>
                    <p className="text-sm text-gray-600 mt-1">Paid: <span className="font-bold text-emerald-600">₹{formatNumber(legalFeePaid)}</span></p>
                    {isLegalFullyPaid && <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fully Paid</p>}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <p className="text-sm">No legal fees configured.</p>
                  <button onClick={() => setShowFeesModal(true)} className="text-violet-600 text-xs font-semibold mt-2 hover:underline">Calculate Fees</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Payments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-gray-400" /> Payment History
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadMergedReceipt}
                disabled={selectedPayments.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" /> Download Merged Receipt
              </button>
              {(isAdmin || isEmployee) && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Payment
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      checked={selectedPayments.length > 0 && selectedPayments.length === (booking.payments || []).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayments((booking.payments || []).map((p: any) => p.id));
                        } else {
                          setSelectedPayments([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Ref/Desc</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(booking.payments || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  (booking.payments || []).sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((payment: any) => (
                    <tr key={payment.id} className={`hover:bg-gray-50 transition-colors group ${selectedPayments.includes(payment.id) ? 'bg-violet-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          checked={selectedPayments.includes(payment.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPayments([...selectedPayments, payment.id]);
                            } else {
                              setSelectedPayments(selectedPayments.filter(id => id !== payment.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-600">₹{formatNumber(payment.amount)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${payment.payment_type === 'Legal fees' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {payment.payment_type || 'Plot payment'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {payment.payment_mode}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate" title={`${payment.transaction_id || ''} ${payment.description || ''}`}>
                        <div className="font-medium text-gray-700">{payment.transaction_id || '-'}</div>
                        <div className="text-gray-400">{payment.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownloadReceipt(payment)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Download Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {(isAdmin || isEmployee) && (
                          <button
                            onClick={() => {
                              setEditPaymentForm({
                                id: payment.id, amount: payment.amount.toString(), payment_date: payment.payment_date,
                                payment_mode: payment.payment_mode, transaction_id: payment.transaction_id || '',
                                description: payment.description || '', payment_type: payment.payment_type || 'Plot payment'
                              });
                              setActivePaymentId(payment.id);
                              setShowEditPaymentModal(true);
                            }}
                            className="p-1.5 text-violet-600 hover:bg-violet-50 rounded"
                            title="Edit Payment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Documents Section */}
        <DocumentSection bookingId={booking.id} clientId={booking.client_id} />

      </div>

      {/* --- MODALS --- */}
      {/* (All modals remain structurally identical to the previous implementation but tied to `booking` directly) */}
      
      {/* PDF Modal */}
      {showPdfModal && (
        <PDFPreviewModal
          isOpen={!!pdfDoc}
          pdfDoc={pdfDoc}
          fileName={pdfFileName}
          onClose={() => { setShowPdfModal(false); setPdfDoc(null); }}
        />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Type</label>
                  <select value={paymentForm.payment_type} onChange={e => setPaymentForm({...paymentForm, payment_type: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                    <option value="Plot payment">Plot Payment</option>
                    <option value="Legal fees">Legal & Gov Fees</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Company Account</label>
                  <select value={paymentForm.company_id} onChange={e => setPaymentForm({...paymentForm, company_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                    <option value="">-- Unassigned --</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  <option value={booking.client_id}>{booking.client?.name} (Primary)</option>
                  {(booking.booking_partners || []).map((bp: any) => (
                    <option key={bp.client_id} value={bp.client_id}>{bp.client?.name} (Partner)</option>
                  ))}
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

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Set Discount</h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateDiscount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Amount (₹)</label>
                <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                <p className="text-xs text-gray-500 mt-2">This is deducted directly from the plot list price (₹{formatNumber(booking.total_amount)}).</p>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDiscountModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Edit Booking Data</h3>
              <button onClick={() => setShowEditBookingModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditBooking} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total Amount (₹)</label>
                  <input type="number" required value={editBookingForm.total_amount} onChange={e => setEditBookingForm({...editBookingForm, total_amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Discount (₹)</label>
                  <input type="number" value={editBookingForm.discount_amount} onChange={e => setEditBookingForm({...editBookingForm, discount_amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Commission %</label>
                  <input type="number" step="0.1" value={editBookingForm.commission_percent} onChange={e => setEditBookingForm({...editBookingForm, commission_percent: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select value={editBookingForm.status} onChange={e => setEditBookingForm({...editBookingForm, status: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditBookingModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Edit Payment</h3>
              <button onClick={() => setShowEditPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditPayment} className="p-6 space-y-4">
               <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Type</label>
                <select value={editPaymentForm.payment_type} onChange={e => setEditPaymentForm({...editPaymentForm, payment_type: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                  <option value="Plot payment">Plot Payment</option>
                  <option value="Legal fees">Legal & Gov Fees</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹) *</label>
                  <input type="number" required value={editPaymentForm.amount} onChange={e => setEditPaymentForm({...editPaymentForm, amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                  <input type="date" required value={editPaymentForm.payment_date} onChange={e => setEditPaymentForm({...editPaymentForm, payment_date: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <select value={editPaymentForm.payment_mode} onChange={e => setEditPaymentForm({...editPaymentForm, payment_mode: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                    <option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option><option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ref / UTR</label>
                  <input type="text" value={editPaymentForm.transaction_id} onChange={e => setEditPaymentForm({...editPaymentForm, transaction_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <input type="text" value={editPaymentForm.description} onChange={e => setEditPaymentForm({...editPaymentForm, description: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditPaymentModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">Save Changes</button>
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
                <p className="text-sm text-gray-600">Select a destination plot. Plots highlighted in purple indicate this client already has an active negotiation there (selecting one will merge this booking into that partnership).</p>
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
                                const relatedBooking = p.isPartnership ? null : null; // Logic is simplified; full state requires lookup if needed.
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

      {/* Add Partner Modal */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Add Partner</h3>
              <button onClick={() => setShowAddPartnerModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search client by name or code..." 
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredClients.filter((c: any) => c.id !== booking.client_id && !(booking.booking_partners || []).some((bp: any) => bp.client_id === c.id)).map((client: any) => (
                <label key={client.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedPartnerId === client.id ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-gray-200 hover:border-violet-300'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="partner" value={client.id} checked={selectedPartnerId === client.id} onChange={(e) => setSelectedPartnerId(e.target.value)} className="w-4 h-4 text-violet-600" />
                    <div>
                      <p className="font-bold text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.phone} • {client.client_code}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <button onClick={() => setShowAddPartnerModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddPartner} disabled={isPending || !selectedPartnerId} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">Add Partner</button>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Legal Fees Modal */}
      {showFeesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Legal & Gov Fees</h3>
              <button onClick={() => setShowFeesModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateFees} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Total Legal Fees</label>
                <div className="flex gap-2">
                  <input type="number" required value={feeForm.legal.value} onChange={e => setFeeForm({...feeForm, legal: {...feeForm.legal, value: e.target.value}})} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm" placeholder="e.g. 5" />
                  <select value={feeForm.legal.type} onChange={e => setFeeForm({...feeForm, legal: {...feeForm.legal, type: e.target.value as any}})} className="p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm w-20">
                    <option value="%">%</option>
                    <option value="₹">₹</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowFeesModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
