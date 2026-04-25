'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Calendar, FolderHeart, CheckCircle2, TrendingUp, Download, Printer } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { exportToPDF } from '@/utils/pdf/exportToPDF';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';
import { generateWelcomeLetter } from '@/utils/pdf/generateWelcomeLetter';

export default function BookingClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('booking_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const handlePrintWelcomeLetter = async (booking: any) => {
    try {
      const result = await generateWelcomeLetter(booking, 'client', true);
      if (result) {
        setPdfDoc(result.doc);
        setPdfFileName(result.fileName);
        setShowPdfModal(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate Welcome Letter');
    }
  };

  const filtered = [...data]
    .filter(r => {
      const s = search.toLowerCase();
      const matchText = (r.client_name || '').toLowerCase().includes(s) ||
        (r.plot_number || '').toLowerCase().includes(s) ||
        (r.project_name || '').toLowerCase().includes(s) ||
        (r.booking_code || '').toLowerCase().includes(s) ||
        (r.consultant_name || '').toLowerCase().includes(s);
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchText && matchStatus;
    })
    .sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalDeals = filtered.length;
  const totalValue = filtered.reduce((s, r) => s + r.final_deal, 0);
  const totalPaid = filtered.reduce((s, r) => s + r.amount_paid, 0);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-500';
    return 'bg-amber-100 text-amber-700';
  };

  const handleExport = () => {
    exportToPDF({
      title: 'Booking Report',
      filename: 'Booking_Report',
      data: filtered,
      headers: [
        { label: 'Date', key: (r) => fmt(r.booking_date) },
        { label: 'Booking Code', key: (r) => r.booking_code || '—' },
        { label: 'Client', key: 'client_name' },
        { label: 'Consultant', key: 'consultant_name' },
        { label: 'Project', key: 'project_name' },
        { label: 'Plot No.', key: 'plot_number' },
        { label: 'Status', key: (r) => r.status.toUpperCase() },
        { label: 'Agreed Price', key: (r) => `Rs. ${formatNumber(r.total_amount)}` },
        { label: 'Discount', key: (r) => `Rs. ${formatNumber(r.discount_amount)}` },
        { label: 'Final Deal', key: (r) => `Rs. ${formatNumber(r.final_deal)}` },
        { label: 'Paid', key: (r) => `Rs. ${formatNumber(r.amount_paid)}` },
        { label: 'Balance', key: (r) => `Rs. ${formatNumber(r.balance_due)}` }
      ]
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
            <h1 className="text-3xl font-bold text-gray-900">Booking Report</h1>
            <p className="text-gray-500 mt-1">Comprehensive A-Z list of all plot bookings.</p>
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
          {[
            { label: 'Total Bookings', value: totalDeals, isCurrency: false, icon: FolderHeart, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Total Deal Value', value: totalValue, isCurrency: true, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Collections', value: totalPaid, isCurrency: true, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-6 h-6" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>
                  {s.isCurrency ? `₹${formatNumber(s.value)}` : formatNumber(s.value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Filter */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search client, plot, project, consultant..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending / Negotiation</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={sortKey} onChange={e => setSortKey(e.target.value)}>
                <option value="booking_date">Sort: Date</option>
                <option value="client_name">Sort: Client</option>
                <option value="final_deal">Sort: Deal Value</option>
                <option value="amount_paid">Sort: Paid Amount</option>
                <option value="balance_due">Sort: Balance Due</option>
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
                  <th className="px-4 py-3 text-left">Date / ID</th>
                  <th className="px-4 py-3 text-left">Client & Consultant</th>
                  <th className="px-4 py-3 text-left">Property Details</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Agreed Price</th>
                  <th className="px-4 py-3 text-right text-orange-600">Discount</th>
                  <th className="px-4 py-3 text-right">Final Deal</th>
                  <th className="px-4 py-3 text-right text-emerald-600">Paid</th>
                  <th className="px-4 py-3 text-right text-red-600">Balance</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">No bookings found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50/20 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{fmt(r.booking_date)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.booking_code || '—'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{r.client_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Ref: {r.consultant_name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-800">Plot {r.plot_number}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.project_name} • {r.area_sqyd} sq.yd</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600">₹{formatNumber(r.total_amount)}</td>
                    <td className="px-4 py-4 text-right text-orange-600">₹{formatNumber(r.discount_amount)}</td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">₹{formatNumber(r.final_deal)}</td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-600">₹{formatNumber(r.amount_paid)}</td>
                    <td className="px-4 py-4 text-right font-bold text-red-600 bg-red-50/30 group-hover:bg-red-50 transition-colors">
                      ₹{formatNumber(r.balance_due)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {r.status === 'confirmed' && (
                        <button 
                          onClick={() => handlePrintWelcomeLetter(r)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Print Welcome Letter"
                        >
                          <Printer className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} Bookings</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">₹{formatNumber(totalValue)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{formatNumber(totalPaid)}</td>
                  <td colSpan={1} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

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
    </div>
  );
}
