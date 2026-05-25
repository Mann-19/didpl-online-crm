'use client';

import { useEffect, useState } from 'react';
import { getClientDashboardData } from './actions';
import { Home, FileText, CheckCircle2, Eye, MapPin, Ruler } from 'lucide-react';
import { generateReceipt, ReceiptData } from '@/utils/generateReceipt';
import PDFPreviewModal from '@/components/PDFPreviewModal';
import { formatNumber } from '@/utils/formatNumber';

export default function MyPortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'properties' | 'receipts'>('properties');
  
  // PDF State
  const [previewData, setPreviewData] = useState<{ isOpen: boolean, doc: any, fileName: string }>({
    isOpen: false,
    doc: null,
    fileName: ''
  });

  useEffect(() => {
    getClientDashboardData().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const handlePreviewReceipt = (payment: any) => {
    try {
      const clientProfile = payment.bookings?.clients || {};
      
      const receiptData: ReceiptData = {
        receipt_date: new Date().toISOString(),
        date: payment.payment_date,
        client_name: clientProfile.name || data.client?.name,
        gender: clientProfile.gender,
        client_address: clientProfile.residential_address,
        client_city: clientProfile.residential_city,
        client_state: clientProfile.residential_state,
        client_pincode: clientProfile.residential_pincode,
        amount: Number(payment.amount),
        transaction_id: payment.transaction_id || payment.description || "N/A",
        payment_mode: payment.payment_mode
      };

      const result = generateReceipt(receiptData, true);
      if (result) {
        setPreviewData({
          isOpen: true,
          doc: result.doc,
          fileName: result.fileName
        });
      }
    } catch (err) {
      console.error("Failed to generate receipt preview", err);
      alert("Failed to generate preview. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading your portfolio...</p>
      </div>
    );
  }

  if (data?.error || !data?.client) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Profile Found</h2>
        <p className="text-gray-500 text-sm">Your account hasn't been linked to a client profile yet. Please contact administration.</p>
      </div>
    );
  }

  const properties = data.properties || [];
  const payments = data.payments || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your properties and payment receipts.</p>
        </div>
        
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'properties' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Home className="w-4 h-4" /> Properties
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'receipts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" /> Receipts
          </button>
        </div>
      </div>

      {activeTab === 'properties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
              <p className="text-gray-500 text-sm mt-1">You don't have any finalized properties yet.</p>
            </div>
          ) : (
            properties.map((booking: any) => (
              <div key={booking.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-700 p-6 relative flex items-end">
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Owned</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">Plot {booking.plots?.plot_number}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.plots?.projects?.name}</p>
                      <p className="text-xs text-gray-500">{booking.plots?.projects?.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Ruler className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.plots?.area_sqyd} Sq.Yd</p>
                      <p className="text-xs text-gray-500">({booking.plots?.area_sqm} Sq.M)</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Booked: {new Date(booking.booking_date).toLocaleDateString()}</span>
                  <span className="text-xs font-mono text-gray-400">#{booking.booking_code}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No receipts found</h3>
              <p className="text-gray-500 text-sm mt-1">You haven't made any payments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plot / Project</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 tabular-nums">
                        {payment.receipt_no || payment.transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Plot {payment.bookings?.plots?.plot_number} <span className="text-gray-400">({payment.bookings?.plots?.projects?.name})</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right tabular-nums">
                        ₹{formatNumber(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handlePreviewReceipt(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reusable PDF Viewer Modal */}
      <PDFPreviewModal
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData({ isOpen: false, doc: null, fileName: '' })}
        pdfDoc={previewData.doc}
        fileName={previewData.fileName}
      />
    </div>
  );
}
