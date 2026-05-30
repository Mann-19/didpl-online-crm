'use client';
import { formatNumber } from '@/utils/formatNumber';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export default function PlotsDataTable({ plots, projectId }: { plots: any[], projectId: string }) {
  
  const getStatusBadge = (status: string) => {
    if (status === 'available') return { emoji: '🟢', label: 'Available', color: 'bg-green-100 text-green-800' }
    if (status === 'token_paid') return { emoji: '🟡', label: 'Token Paid', color: 'bg-yellow-100 text-yellow-800' }
    if (status === 'sold') return { emoji: '🔴', label: 'Sold', color: 'bg-red-100 text-red-800' }
    return { emoji: '⚪', label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Plot #</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Area (sq.yd)</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">List Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Collected</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Payment %</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Client</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plots.map((plot, idx) => {
              // Pick the most relevant active booking — confirmed first, then pending, skip cancelled
              const allBookings: any[] = plot.bookings || [];
              const activeBooking =
                allBookings.find((b: any) => b.status === 'confirmed') ||
                allBookings.find((b: any) => b.status === 'pending') ||
                null;

              const totalAmount = activeBooking
                ? (activeBooking.total_amount - (activeBooking.discount_amount || 0))
                : plot.price;
              const payments = activeBooking?.payments || [];
              const amountPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
              const paymentPercentage = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

              // Prefer booking's client name over stale plot join
              const clientName =
                activeBooking?.client?.name ||
                plot.clients?.name ||
                null;

              const badge = getStatusBadge(plot.status);

              return (
                <tr key={plot.id} className={`hover:bg-violet-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{plot.plot_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatNumber(plot.area_sqyd || 0)} sq.yd</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{formatNumber(plot.price)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-emerald-600">₹{formatNumber(amountPaid)}</td>
                  
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-violet-500"
                          style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{formatNumber(paymentPercentage)}%</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max ${badge.color}`}>
                      <span>{badge.emoji}</span> {badge.label}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {clientName ? (
                      <span className="font-medium">{clientName}</span>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/projects/${projectId}/plot/${plot.id}`}
                      className="inline-flex items-center justify-center p-2 text-violet-600 hover:text-violet-800 hover:bg-violet-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {plots.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No plots found for this project.
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-violet-50 rounded border border-violet-100">
        <p className="text-sm text-violet-800 flex items-center gap-3">
          <strong>Legend:</strong>
          <span>🟢 Available</span>
          <span>🟡 Token Paid</span>
          <span>🔴 Sold</span>
        </p>
      </div>
    </div>
  );
}
