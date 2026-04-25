'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Calendar, Receipt, Download, Printer } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';
import { generateReceipt } from '@/utils/pdf/generateReceipt';
import { exportToPDF } from '@/utils/pdf/exportToPDF';

export default function ReceiptsClient({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [sortKey, setSortKey] = useState('payment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const handlePrintReceipt = async (receiptData: any) => {
    try {
      const result = await generateReceipt(receiptData, true);
      if (result) {
        setPdfDoc(result.doc);
        setPdfFileName(result.fileName);
        setShowPdfModal(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate Receipt');
    }
  };

  const filtered = [...data]
    .filter(r => {
      const s = search.toLowerCase();
      const matchText = (r.client_name || '').toLowerCase().includes(s) ||
        (r.client_code || '').toLowerCase().includes(s) ||
        (r.receipt_no || '').toLowerCase().includes(s) ||
        (r.plot_number || '').toLowerCase().includes(s) ||
        (r.project_name || '').toLowerCase().includes(s) ||
        (r.description || '').toLowerCase().includes(s);
      const matchDate = (!startDate || r.payment_date >= startDate) && (!endDate || r.payment_date <= endDate);
      const matchMode = !modeFilter || r.payment_mode === modeFilter;
      return matchText && matchDate && matchMode;
    })
    .sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalReceipts = filtered.length;
  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleExport = () => {
    exportToPDF({
      title: 'Receipts Report',
      filename: 'Receipts_Report',
      data: filtered,
      headers: [
        { label: 'Date', key: (r) => fmt(r.payment_date) },
        { label: 'Receipt No', key: (r) => r.receipt_no || 'Manual Entry' },
        { label: 'Client', key: 'client_name' },
        { label: 'Client Code', key: (r) => r.client_code || 'No Code' },
        { label: 'Project', key: 'project_name' },
        { label: 'Plot No.', key: 'plot_number' },
        { label: 'Payment Mode', key: 'payment_mode' },
        { label: 'Transaction ID', key: (r) => r.transaction_id || '—' },
        { label: 'Description', key: (r) => r.description || '—' },
        { label: 'Amount', key: (r) => `Rs. ${formatNumber(r.amount)}` }
      ]
    });
  };

  // Get unique payment modes for the filter dropdown
  const uniqueModes = Array.from(new Set(data.map(r => r.payment_mode).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link href="/reports" className="inline-flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Receipt Report</h1>
              <p className="text-gray-500 mt-1">Detailed log of all incoming client payments.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600`}><Receipt className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Receipts</p>
              <p className={`text-2xl font-bold text-gray-900`}>{formatNumber(totalReceipts)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600`}><Receipt className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Amount Collected</p>
              <p className={`text-2xl font-bold text-emerald-600`}>₹{formatNumber(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Table Filter */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search receipt, client, project..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
                <option value="">All Payment Modes</option>
                {uniqueModes.map((mode: any) => (
                  <option key={mode} value={mode}>{mode}</option>
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
                <option value="payment_date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="client_name">Sort: Client</option>
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
                  <th className="px-4 py-3 text-left">Date & Receipt No</th>
                  <th className="px-4 py-3 text-left">Client Details</th>
                  <th className="px-4 py-3 text-left">Property Details</th>
                  <th className="px-4 py-3 text-left">Payment Info</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No receipts found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50/20 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{fmt(r.payment_date)}</div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">{r.receipt_no || 'Manual Entry'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{r.client_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.client_code || 'No Code'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-800">Plot {r.plot_number}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.project_name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 border border-gray-200">
                          {r.payment_mode}
                        </span>
                        {r.transaction_id && <span className="text-xs text-gray-400 font-mono">Ref: {r.transaction_id}</span>}
                      </div>
                      {r.description && <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={r.description}>{r.description}</div>}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-600 text-base bg-emerald-50/30 group-hover:bg-emerald-50 transition-colors">
                      ₹{formatNumber(r.amount)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => handlePrintReceipt(r)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} Receipts</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">₹{formatNumber(totalAmount)}</td>
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
        title="Payment Receipt Preview"
      />
    </div>
  );
}
