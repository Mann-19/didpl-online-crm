'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Calendar, Receipt, Download, Printer } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';
import { generateReceipt } from '@/utils/pdf/generateReceipt';
import { generateMergedReceipt } from '@/utils/pdf/generateMergedReceipt';
import { exportToPDF } from '@/utils/pdf/exportToPDF';

export default function ReceiptsClient({ data, companies = [] }: { data: any[], companies?: any[] }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sortKey, setSortKey] = useState('payment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const uniqueProjects = Array.from(new Set(data.map(r => r.project_name).filter(p => p && p !== '?'))).sort() as string[];

  const [showStampDuty, setShowStampDuty] = useState(false);
  const [showLegalFees, setShowLegalFees] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  // Merged receipt selection
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);

  const handlePrintReceipt = async (receiptData: any) => {
    try {
      // Look up company details for this receipt's payment so the PDF uses
      // the correct branding (logo, name, phone, email) per company split.
      const paymentCompany = companies.find((c: any) => c.id === receiptData.company_id) || null;
      const enrichedData = {
        ...receiptData,
        company_name: paymentCompany?.name || receiptData.company_name || null,
        company_display_name: paymentCompany?.display_name || paymentCompany?.name || receiptData.company_display_name || null,
        company_phone: paymentCompany?.primary_phone || receiptData.company_phone || null,
        company_email: paymentCompany?.primary_email || receiptData.company_email || null,
        company_logo: paymentCompany?.logo_url || receiptData.company_logo || null,
      };
      const result = await generateReceipt(enrichedData, true);
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

  const handleDownloadMergedReceipt = async () => {
    const rowsToMerge = filtered.filter(r => selectedReceipts.includes(r.id));
    if (rowsToMerge.length === 0) return;

    const enrichedReceipts = rowsToMerge.map(firstRow => {
      const mergedCompany = companies.find((c: any) => c.id === firstRow.company_id) || null;
      return {
        ...firstRow,
        client_name: firstRow.client_name,
        gender: firstRow.gender,
        residential_address: firstRow.residential_address,
        client_city: firstRow.client_city,
        client_state: firstRow.client_state,
        client_pincode: firstRow.client_pincode,
        // Company branding — prefer live companies lookup, fall back to row data
        company_name: mergedCompany?.name || firstRow.company_name || null,
        company_display_name: mergedCompany?.display_name || mergedCompany?.name || firstRow.company_display_name || null,
        company_phone: mergedCompany?.primary_phone || firstRow.company_phone || null,
        company_email: mergedCompany?.primary_email || firstRow.company_email || null,
        company_logo: mergedCompany?.logo_url || firstRow.company_logo || null,
      };
    });

    try {
      const result = await generateMergedReceipt(enrichedReceipts, true);
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
      const matchCompany = !companyFilter || r.company_id === companyFilter;
      const matchProject = !projectFilter || r.project_name === projectFilter;
      
      // Fee toggle logic
      let feeMatch = true;
      // TEMPORARY_GOV_FEES_V200
      // if (r.payment_type === 'Stamp duty fees' && !showStampDuty) feeMatch = false;
      if ((r.payment_type === 'Gov fees' || r.payment_type === 'Legal fees') && !showLegalFees) feeMatch = false;
      // if (r.payment_type === 'Maintenance fees' && !showMaintenance) feeMatch = false;
      // if (r.payment_type === 'Registration fees' && !showRegistration) feeMatch = false;

      return matchText && matchDate && matchMode && feeMatch && matchCompany && matchProject;
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
        { label: 'Receipt Type', key: (r) => r.payment_type || 'Plot payment' },
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
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
                <option value="">All Companies</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                <option value="">All Projects</option>
                {uniqueProjects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Include Fee Receipts:</span>
              {/* TEMPORARY_GOV_FEES_V200: Hidden checkboxes
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showStampDuty} onChange={e => setShowStampDuty(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Stamp Duty
              </label>
              */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showLegalFees} onChange={e => setShowLegalFees(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Legal Fees
              </label>
              {/* TEMPORARY_GOV_FEES_V200: Hidden checkboxes
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showMaintenance} onChange={e => setShowMaintenance(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Maintenance
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showRegistration} onChange={e => setShowRegistration(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                Registration
              </label>
              */}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 items-center pt-2 border-t border-gray-100">
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

          {/* Merged Receipt Toolbar */}
          {selectedReceipts.length > 0 && (
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-700">
                {selectedReceipts.length} receipt{selectedReceipts.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedReceipts([])}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear selection
                </button>
                <button
                  onClick={handleDownloadMergedReceipt}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Download Merged Receipt
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedReceipts.length > 0 && selectedReceipts.length === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReceipts(filtered.map(r => r.id));
                        } else {
                          setSelectedReceipts([]);
                        }
                      }}
                    />
                  </th>
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
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No receipts found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-emerald-50/20 transition-colors group ${selectedReceipts.includes(r.id) ? 'bg-emerald-50/30' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedReceipts.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReceipts([...selectedReceipts, r.id]);
                          } else {
                            setSelectedReceipts(selectedReceipts.filter(id => id !== r.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{fmt(r.payment_date)}</div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">{r.receipt_no || 'Manual Entry'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{r.client_name}</div>
                      {r.partner_names?.length > 0 && (
                        <div className="text-xs text-violet-600 font-semibold mt-0.5">
                          + {r.partner_names.join(', ')}
                        </div>
                      )}
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
                      {r.payment_type && r.payment_type !== 'Plot payment' && (
                        <div className="text-xs text-amber-600 font-semibold mt-1 max-w-[200px] truncate">
                          {r.payment_type === 'Gov fees' ? 'Legal Fees' : r.payment_type}
                        </div>
                      )}
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
                  <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">{filtered.length} Receipts</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">₹{formatNumber(totalAmount)}</td>
                  <td />
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
