'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Briefcase,
  CreditCard, Building2, Edit2, X, Save, ExternalLink, Calendar, Clock, Trash2, Printer
} from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { updateClient, deleteClient, updateClientPayment, deleteClientPayment } from '../../people.actions';
import { submitChangeRequest } from '@/app/(admin)/change-requests.actions';
import { Toast, useToast } from '@/components/ui/Toast';
import { generateWelcomeLetter } from '@/utils/pdf/generateWelcomeLetter';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';

const InfoRow = ({ icon: Icon, label, value }: any) => (
  <div className="grid grid-cols-3 gap-4 items-start py-2.5 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-2 text-gray-400">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
    </div>
    <div className="col-span-2 text-sm font-medium text-gray-900">{value || <span className="text-gray-300 font-normal">—</span>}</div>
  </div>
);

const statusBadge = (status: string) => {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-500';
  return 'bg-amber-100 text-amber-700';
};

export default function ClientDetailClient({ client, isAdmin, role }: any) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    payment_date: '',
    payment_mode: 'Cash',
    description: '',
    transaction_id: '',
  });
  const [isPending, startTransition] = useTransition();
  const { toast, showToast, hideToast } = useToast();
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const [editForm, setEditForm] = useState({
    name: client.name || '',
    phone: client.phone || '',
    email: client.email || '',
    gender: client.gender || '',
    birthdate: client.birthdate || '',
    occupation: client.occupation || '',
    pan_number: client.pan_number || '',
    aadhar_number: client.aadhar_number || '',
    residential_address: client.residential_address || '',
    residential_city: client.residential_city || '',
    residential_state: client.residential_state || '',
    residential_pincode: client.residential_pincode || '',
    office_address: client.office_address || '',
    office_city: client.office_city || '',
    office_state: client.office_state || '',
    office_pincode: client.office_pincode || '',
  });

  const isEmployee = role === 'employee';
  const isMasterAdmin = role === 'master_admin';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      if (isEmployee) {
        // Stage for review — do NOT write to DB
        const result = await submitChangeRequest({
          entity_type: 'client',
          entity_id: client.id,
          operation: 'update',
          payload: editForm,
          description: `Update client "${client.name}" (${client.client_code}) — fields: ${Object.keys(editForm).join(', ')}`,
        });

        if (result.success) {
          showToast('Edit request submitted for admin review', 'warning');
          setShowEditModal(false);
        } else {
          showToast(result.error || 'Submission failed', 'error');
        }
      } else {
        // Admin: write directly
        const result = await updateClient(client.id, editForm);
        if (result.success) {
          showToast('Client updated successfully', 'success');
          setShowEditModal(false);
          setTimeout(() => window.location.reload(), 800);
        } else {
          showToast(result.error || 'Failed to update', 'error');
        }
      }
    });
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
  };

  const handlePrintWelcomeLetter = async () => {
    try {
      const payload = {
        name: client.name,
        client_name: client.name,
      };
      const result = await generateWelcomeLetter(payload, 'client', true);
      if (result) {
        setPdfDoc(result.doc);
        setPdfFileName(result.fileName);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate Welcome Letter');
    }
  };

  const handleDeleteClient = async () => {
    if (!confirm(`Permanently delete ${client.name} and ALL their bookings, payments, and history? This CANNOT be undone.`)) return;
    const result = await deleteClient(client.id);
    if (result.success) {
      window.location.href = '/clients/list';
    } else {
      alert(result.error || 'Failed to delete client');
    }
  };

  const handleEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentId) return;
    startTransition(async () => {
      const result = await updateClientPayment(activePaymentId, {
        amount: parseFloat(editPaymentForm.amount) || 0,
        payment_date: editPaymentForm.payment_date,
        payment_mode: editPaymentForm.payment_mode,
        description: editPaymentForm.description,
        transaction_id: editPaymentForm.transaction_id || undefined,
      });
      if (result.success) {
        setShowEditPaymentModal(false);
        setTimeout(() => window.location.reload(), 800);
      } else {
        alert(result.error || 'Failed to update payment');
      }
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment record? This cannot be undone.')) return;
    const result = await deleteClientPayment(paymentId);
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || 'Failed to delete payment');
    }
  };

  const bookings: any[] = client.bookings || [];
  const totalPaid = bookings.reduce((sum: number, b: any) =>
    sum + (b.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0), 0);
  const totalDeal = bookings.reduce((sum: number, b: any) =>
    sum + (Number(b.total_amount) - Number(b.discount_amount || 0)), 0);

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <Link href="/clients/list" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Clients
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
                <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {client.client_code || 'NO-CODE'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">Joined {formatDate(client.created_at)}</p>
            </div>
            {/* Show Edit button for both admin and employee */}
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              {isEmployee ? 'Request Edit' : 'Edit Profile'}
            </button>
            <button
              onClick={handlePrintWelcomeLetter}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-100 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Welcome Letter
            </button>
            {isMasterAdmin && (
              <button
                onClick={handleDeleteClient}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-100 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Delete Client
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: bookings.length, color: 'text-blue-600' },
            { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-emerald-600' },
            { label: 'Total Deal Value', value: `₹${formatNumber(totalDeal)}`, color: 'text-gray-900' },
            { label: 'Total Paid', value: `₹${formatNumber(totalPaid)}`, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600"><User className="w-4 h-4" /></div>
              <h2 className="font-bold text-gray-900">Personal Details</h2>
            </div>
            <div className="space-y-0">
              <InfoRow icon={Phone} label="Phone" value={client.phone} />
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Calendar} label="Birthdate" value={formatDate(client.birthdate)} />
              <InfoRow icon={User} label="Gender" value={client.gender} />
              <InfoRow icon={Briefcase} label="Occupation" value={client.occupation} />
              <InfoRow icon={CreditCard} label="PAN" value={<span className="font-mono uppercase">{client.pan_number}</span>} />
              <InfoRow icon={CreditCard} label="Aadhar" value={<span className="font-mono">{client.aadhar_number}</span>} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600"><MapPin className="w-4 h-4" /></div>
              <h2 className="font-bold text-gray-900">Address</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Residential</p>
                {client.residential_address ? (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {client.residential_address}<br />
                    {[client.residential_city, client.residential_state, client.residential_pincode].filter(Boolean).join(', ')}
                  </p>
                ) : <p className="text-sm text-gray-300">Not provided</p>}
              </div>
              {(client.office_address || client.office_city) && (
                <div className="pt-3 border-t border-gray-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Office</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {client.office_address}<br />
                    {[client.office_city, client.office_state, client.office_pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOOKINGS TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-900">Plot Bookings</h2>
            </div>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">{bookings.length} Records</span>
          </div>
          {bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project & Plot</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Deal Value</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b: any) => {
                    const deal = Number(b.total_amount) - Number(b.discount_amount || 0);
                    const paid = (b.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                    const balance = deal - paid;
                    const projectId = b.plots?.projects?.id;
                    const plotId = b.plots?.plot_number;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{b.plots?.projects?.name || '—'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Plot <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{b.plots?.plot_number}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-gray-700">₹{formatNumber(deal)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-emerald-600">₹{formatNumber(paid)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-orange-600">₹{formatNumber(balance)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(b.status)}`}>{b.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {projectId && plotId && (
                            <Link
                              href={`/projects/${projectId}/plot/${plotId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                            >
                              Manage <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 text-sm">No bookings recorded for this client.</div>
          )}
        </div>

        {/* PAYMENT HISTORY */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-900">Payment History</h2>
            </div>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
              {bookings.flatMap((b: any) => b.payments || []).length} Records
            </span>
          </div>
          {bookings.some((b: any) => b.payments?.length > 0) ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plot</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mode</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    {isMasterAdmin && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.flatMap((b: any) =>
                    (b.payments || []).map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs font-mono">
                          {b.plots?.projects?.name} — Plot {b.plots?.plot_number}
                        </td>
                        <td className="px-5 py-3 text-gray-700 font-medium">{p.payment_mode}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs truncate max-w-[180px]">{p.description || p.transaction_id || '—'}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">₹{formatNumber(p.amount)}</td>
                        {isMasterAdmin && (
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
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
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit payment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete payment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 text-sm">No payments recorded yet.</div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isEmployee ? 'Request Profile Edit' : 'Edit Client Profile'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isEmployee
                    ? `Changes will be sent to the admin for approval`
                    : `Update ${client.name}'s information`}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Personal */}
              <div>
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name *', name: 'name', type: 'text' },
                    { label: 'Phone Number', name: 'phone', type: 'tel' },
                    { label: 'Email', name: 'email', type: 'email' },
                    { label: 'Date of Birth', name: 'birthdate', type: 'date' },
                    { label: 'Occupation', name: 'occupation', type: 'text' },
                  ].map(f => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">{f.label}</label>
                      <input
                        type={f.type}
                        className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                        value={(editForm as any)[f.name]}
                        onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}
                      />
                    </div>
                  ))}
                  {isMasterAdmin && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Client Code</label>
                      <input
                        className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono uppercase"
                        value={(editForm as any).client_code || ''}
                        onChange={e => setEditForm({ ...editForm, client_code: e.target.value } as any)}
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Gender</label>
                    <select
                      className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      value={editForm.gender}
                      onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div>
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Identity Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'PAN Number', name: 'pan_number' },
                    { label: 'Aadhar Number', name: 'aadhar_number' },
                  ].map(f => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">{f.label}</label>
                      <input
                        className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono uppercase"
                        value={(editForm as any)[f.name]}
                        onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Residential */}
              <div>
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Residential Address</h4>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Street Address</label>
                    <input
                      className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      value={editForm.residential_address}
                      onChange={e => setEditForm({ ...editForm, residential_address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'City', name: 'residential_city' },
                      { label: 'State', name: 'residential_state' },
                      { label: 'Pincode', name: 'residential_pincode' },
                    ].map(f => (
                      <div key={f.name} className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">{f.label}</label>
                        <input
                          className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                          value={(editForm as any)[f.name]}
                          onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isEmployee
                  ? <><Clock className="w-4 h-4" /> {isPending ? 'Submitting...' : 'Submit for Review'}</>
                  : <><Save className="w-4 h-4" /> {isPending ? 'Saving...' : 'Save Changes'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL (master_admin) */}
      {showEditPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Payment</h3>
              <button onClick={() => setShowEditPaymentModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {pdfDoc && (
        <PDFPreviewModal
          isOpen={!!pdfDoc}
          pdfDoc={pdfDoc}
          fileName={pdfFileName}
          onClose={() => setPdfDoc(null)}
        />
      )}
    </div>
  );
}