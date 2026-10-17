'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  LayoutGrid,
  Ruler,
  Banknote,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import ProjectNav from '@/components/projects/ProjectNav'
import BackLink from '@/components/ui/BackLink'
import { formatNumber } from '@/utils/formatNumber'
import AssignPlotModal from './AssignPlotModal'

interface FlexLayoutClientProps {
  project: any
  plots: any[]
  clients: any[]
  consultants?: any[]
  role?: string
  basePath?: string
}

export default function FlexLayoutClient({
  project,
  plots = [],
  clients = [],
  consultants = [],
  role = 'admin',
  basePath = '/projects',
}: FlexLayoutClientProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const projectId = project.id

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold':
        return { label: 'Sold', color: 'bg-rose-100 text-rose-700 border-rose-200' }
      case 'fully_paid':
        return { label: 'Fully Paid', color: 'bg-purple-100 text-purple-700 border-purple-200' }
      case 'token_paid':
        return { label: 'Token Paid', color: 'bg-amber-100 text-amber-700 border-amber-200' }
      case 'available':
      default:
        return { label: 'Available', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    }
  }

  // Summary calculations
  const totalAssignedArea = plots.reduce(
    (sum, p) => sum + (Number(p.area_sqyd) || 0),
    0
  )
  const totalListValue = plots.reduce((sum, p) => sum + (Number(p.price) || 0), 0)

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
                <Sparkles className="w-3 h-3" /> Flex Layout
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Custom on-demand plot assignment workflow
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

      {/* ─── STATS & LEGEND BAR ────────────────────────────────────── */}
      <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white z-10 relative mt-4 shadow-xs">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-emerald-500"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-amber-400"></div>
            <span className="text-gray-600">Token Paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-purple-500"></div>
            <span className="text-gray-600">Fully Paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-rose-500"></div>
            <span className="text-gray-600">Sold</span>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-gray-400 font-medium">Assigned Plots: </span>
            <span className="font-bold text-gray-900">{plots.length}</span>
          </div>
          <div className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-gray-400 font-medium">Allocated Area: </span>
            <span className="font-bold text-violet-700">
              {formatNumber(totalAssignedArea)} sq.yd
            </span>
          </div>
          <div className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg hidden md:block">
            <span className="text-gray-400 font-medium">Total Value: </span>
            <span className="font-bold text-emerald-700">
              ₹{formatNumber(totalListValue)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT AREA ─────────────────────────────────────── */}
      <div className="flex-1 p-6">
        {plots.length === 0 ? (
          /* EMPTY STATE */
          <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No Plots Assigned Yet
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              {project.name} operates on a free-assignment structure. Plots are created
              and assigned dynamically with custom dimensions and pricing for each client.
            </p>
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Assign First Custom Plot</span>
            </button>
          </div>
        ) : (
          /* PLOTS GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {plots.map((plot) => {
              const allBookings: any[] = plot.bookings || []
              const activeBooking =
                allBookings.find((b: any) => b.status === 'confirmed') ||
                allBookings.find((b: any) => b.status === 'pending') ||
                null

              const totalAmount = activeBooking
                ? (activeBooking.total_amount || 0) - (activeBooking.discount_amount || 0)
                : plot.price || 0
              const amountPaid = Number(activeBooking?.amount_paid) || 0
              const paymentPercent = totalAmount > 0 ? Math.round((amountPaid / totalAmount) * 100) : 0

              const clientName = activeBooking?.client?.name || plot.client?.name || null
              const badge = getStatusBadge(plot.status)

              return (
                <Link
                  key={plot.id}
                  href={`/projects/${projectId}/plot/${plot.id}`}
                  className="bg-white rounded-xl border border-gray-200 hover:border-violet-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Top row: Plot # & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-gray-900 group-hover:text-violet-600 transition-colors">
                          Plot {plot.plot_number}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Dimensions & Price */}
                    <div className="grid grid-cols-2 gap-2 py-3 border-y border-gray-100 text-xs mb-3">
                      <div>
                        <p className="text-gray-400 font-semibold uppercase text-[10px]">
                          Area
                        </p>
                        <p className="font-bold text-gray-800 mt-0.5">
                          {formatNumber(plot.area_sqyd || 0)} sq.yd
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold uppercase text-[10px]">
                          Agreed Price
                        </p>
                        <p className="font-bold text-emerald-600 mt-0.5">
                          ₹{formatNumber(plot.price || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Client Information */}
                    <div className="space-y-1 mb-3">
                      <p className="text-gray-400 font-semibold uppercase text-[10px]">
                        Client / Investor
                      </p>
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {clientName || <span className="text-gray-400 italic font-normal">—</span>}
                      </p>
                    </div>
                  </div>

                  {/* Payment Progress */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500 mb-1 font-semibold">
                      <span>Collected</span>
                      <span className="text-gray-900 font-bold">{paymentPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-violet-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(paymentPercent, 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-violet-600 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>View details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
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
