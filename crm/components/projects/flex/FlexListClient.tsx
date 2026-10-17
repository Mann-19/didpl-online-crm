'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus, Eye, Sparkles, Layers, Search, Filter } from 'lucide-react'
import ProjectNav from '@/components/projects/ProjectNav'
import BackLink from '@/components/ui/BackLink'
import { formatNumber } from '@/utils/formatNumber'
import AssignPlotModal from './AssignPlotModal'

interface FlexListClientProps {
  project: any
  plots: any[]
  clients: any[]
  consultants?: any[]
  role?: string
  basePath?: string
}

export default function FlexListClient({
  project,
  plots = [],
  clients = [],
  consultants = [],
  role = 'admin',
  basePath = '/projects',
}: FlexListClientProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const projectId = project.id

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold':
        return { emoji: '🔴', label: 'Sold', color: 'bg-red-100 text-red-800' }
      case 'fully_paid':
        return { emoji: '🟣', label: 'Fully Paid', color: 'bg-purple-100 text-purple-800' }
      case 'token_paid':
        return { emoji: '🟡', label: 'Token Paid', color: 'bg-yellow-100 text-yellow-800' }
      case 'available':
      default:
        return { emoji: '🟢', label: 'Available', color: 'bg-green-100 text-green-800' }
    }
  }

  // Filter plots based on status and search query
  const filteredPlots = plots.filter((plot) => {
    if (selectedStatus !== 'all' && plot.status !== selectedStatus) {
      return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesNum = String(plot.plot_number).toLowerCase().includes(q)
      const allBookings: any[] = plot.bookings || []
      const clientName = allBookings[0]?.client?.name?.toLowerCase() || ''
      const matchesClient = clientName.includes(q)
      return matchesNum || matchesClient
    }

    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col animate-in fade-in duration-300">
      {/* ─── TOP HEADER ────────────────────────────────────────────── */}
      <div className="px-6 pt-4 shrink-0">
        <BackLink href={basePath} dirname="Projects" accent="violet" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {project.name}
              </h1>
              <span className="bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Flex Plots List
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Tabular inventory of custom assigned plots
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Plot</span>
          </button>
        </div>
      </div>

      {/* ─── NAVIGATION TABS ───────────────────────────────────────── */}
      <div className="px-6 shrink-0">
        <ProjectNav projectId={projectId} />
      </div>

      {/* ─── FILTER CONTROLS BAR ───────────────────────────────────── */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 mt-4 bg-white border-y border-gray-200">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'available', 'token_paid', 'fully_paid', 'sold'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                selectedStatus === st
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'all' ? 'All Plots' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plot # or client..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* ─── TABLE VIEW ────────────────────────────────────────────── */}
      <div className="p-6 flex-1">
        <div className="overflow-x-auto bg-white rounded-xl shadow-xs border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Plot #
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Area (sq.yd)
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  List Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Rate/sq.yd
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Payment %
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Active Client
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlots.map((plot, idx) => {
                const allBookings: any[] = plot.bookings || []
                const activeBooking =
                  allBookings.find((b: any) => b.status === 'confirmed') ||
                  allBookings.find((b: any) => b.status === 'pending') ||
                  null

                const totalAmount = activeBooking
                  ? (activeBooking.total_amount || 0) - (activeBooking.discount_amount || 0)
                  : plot.price || 0
                const amountPaid = Number(activeBooking?.amount_paid) || 0
                const paymentPercentage =
                  totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0

                const clientName =
                  activeBooking?.client?.name || plot.client?.name || null
                const badge = getStatusBadge(plot.status)

                return (
                  <tr
                    key={plot.id}
                    className={`hover:bg-violet-50/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      Plot {plot.plot_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatNumber(plot.area_sqyd || 0)} sq.yd
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₹{formatNumber(plot.price || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {plot.price_per_unit
                        ? `₹${formatNumber(plot.price_per_unit)}`
                        : plot.area_sqyd
                        ? `₹${formatNumber(Math.round(plot.price / plot.area_sqyd))}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                      ₹{formatNumber(amountPaid)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-semibold text-gray-800">
                        {formatNumber(paymentPercentage)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max ${badge.color}`}
                      >
                        <span>{badge.emoji}</span> {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
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
                        title="View Plot Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {plots.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <p className="text-gray-900 font-bold mb-1">No custom plots created yet</p>
              <p className="text-gray-500 text-xs mb-4">
                This project has no pre-filled plots. Use the button below to assign your first custom plot.
              </p>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Assign New Plot</span>
              </button>
            </div>
          ) : filteredPlots.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No plots match the selected filters.
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── ASSIGN PLOT MODAL ─────────────────────────────────────── */}
      <AssignPlotModal
        projectId={projectId}
        projectName={project.name}
        clients={clients}
        consultants={consultants}
        role={role}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  )
}
