'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Search,
  Ruler,
  Banknote,
  User,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react'
import { formatNumber } from '@/utils/formatNumber'
import {
  createFlexPlotAndBooking,
  getNextSequentialPlotNumber,
} from '@/app/(admin)/flex-plots.actions'
import { submitChangeRequest } from '@/app/(admin)/change-requests.actions'

interface AssignPlotModalProps {
  projectId: string
  projectName: string
  clients: any[]
  consultants?: any[]
  role?: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AssignPlotModal({
  projectId,
  projectName,
  clients = [],
  consultants = [],
  role = 'admin',
  isOpen,
  onClose,
  onSuccess,
}: AssignPlotModalProps) {
  const router = useRouter()
  const isEmployee = role === 'employee'
  const [isPending, startTransition] = useTransition()

  // Form states
  const [plotNumber, setPlotNumber] = useState<string>('')
  const [areaSqYd, setAreaSqYd] = useState<string>('')
  const [pricingMode, setPricingMode] = useState<'per_unit' | 'total'>('total')
  const [pricePerUnit, setPricePerUnit] = useState<string>('')
  const [totalPrice, setTotalPrice] = useState<string>('')

  // Client & Booking states
  const [clientSearch, setClientSearch] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [agreedAmount, setAgreedAmount] = useState<string>('')
  const [discountAmount, setDiscountAmount] = useState<string>('0')
  const [consultantId, setConsultantId] = useState<string>('')
  const [commissionPercent, setCommissionPercent] = useState<string>('0')

  // UI status
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoadingNextNumber, setIsLoadingNextNumber] = useState<boolean>(true)

  // Fetch next sequential plot number when modal opens
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setIsLoadingNextNumber(true)
    setErrorMessage(null)

    getNextSequentialPlotNumber(projectId)
      .then((nextNum) => {
        if (isMounted) {
          setPlotNumber(nextNum)
          setIsLoadingNextNumber(false)
        }
      })
      .catch((err) => {
        console.error('Failed to get next plot number:', err)
        if (isMounted) {
          setPlotNumber('1')
          setIsLoadingNextNumber(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, projectId])

  // Sync pricing calculations
  const handleAreaChange = (val: string) => {
    setAreaSqYd(val)
    const area = parseFloat(val) || 0

    if (pricingMode === 'per_unit') {
      const rate = parseFloat(pricePerUnit) || 0
      const total = area * rate
      const totalStr = total > 0 ? String(Math.round(total)) : ''
      setTotalPrice(totalStr)
      setAgreedAmount(totalStr)
    } else {
      const total = parseFloat(totalPrice) || 0
      const rate = area > 0 ? Math.round(total / area) : 0
      setPricePerUnit(rate > 0 ? String(rate) : '')
    }
  }

  const handlePricePerUnitChange = (val: string) => {
    setPricePerUnit(val)
    const rate = parseFloat(val) || 0
    const area = parseFloat(areaSqYd) || 0
    const total = area * rate
    const totalStr = total > 0 ? String(Math.round(total)) : ''
    setTotalPrice(totalStr)
    setAgreedAmount(totalStr)
  }

  const handleTotalPriceChange = (val: string) => {
    setTotalPrice(val)
    setAgreedAmount(val)
    const total = parseFloat(val) || 0
    const area = parseFloat(areaSqYd) || 0
    const rate = area > 0 ? Math.round(total / area) : 0
    setPricePerUnit(rate > 0 ? String(rate) : '')
  }

  // Filter clients
  const filteredClients = clients.filter((c: any) => {
    const q = clientSearch.toLowerCase().trim()
    if (!q) return true
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.client_code?.toLowerCase().includes(q)
    )
  })

  // Calculations for deal summary
  const numericAgreed = parseFloat(agreedAmount) || 0
  const numericDiscount = parseFloat(discountAmount) || 0
  const netDealValue = Math.max(numericAgreed - numericDiscount, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!plotNumber.trim()) {
      setErrorMessage('Please provide a plot number.')
      return
    }

    const area = parseFloat(areaSqYd)
    if (!area || area <= 0) {
      setErrorMessage('Please enter a valid plot area in sq.yd.')
      return
    }

    const price = parseFloat(totalPrice)
    if (!price || price <= 0) {
      setErrorMessage('Please enter a valid price for the plot.')
      return
    }

    if (!selectedClientId) {
      setErrorMessage('Please select a primary client for this plot booking.')
      return
    }

    startTransition(async () => {
      const payload = {
        projectId,
        plotNumber: plotNumber.trim(),
        areaSqYd: area,
        price,
        pricePerUnit: parseFloat(pricePerUnit) || null,
        clientId: selectedClientId,
        totalAmount: numericAgreed,
        discountAmount: numericDiscount,
        consultantId: consultantId || null,
        commissionPercent: parseFloat(commissionPercent) || 0,
      }

      if (isEmployee) {
        // Employee review-approval flow
        const client = clients.find((c: any) => c.id === selectedClientId)
        const result = await submitChangeRequest({
          entity_type: 'booking',
          operation: 'create',
          payload: {
            ...payload,
            is_flex_plot: true,
          },
          description: `Flex Plot creation & booking: Plot ${plotNumber.trim()} (${area} sq.yd) for "${client?.name || 'Client'}"`,
        })

        if (result.success) {
          onClose()
          if (onSuccess) onSuccess()
          alert('Plot assignment and booking request submitted for Master Admin review.')
        } else {
          setErrorMessage(result.error || 'Failed to submit booking request.')
        }
      } else {
        // Direct admin mutation
        const result = await createFlexPlotAndBooking(payload)

        if (result.success && result.data) {
          onClose()
          if (onSuccess) onSuccess()
          // Navigate to the plot detail page
          router.push(`/projects/${projectId}/plot/${result.data.plotId}`)
        } else {
          setErrorMessage(result.error || 'Failed to assign plot and create booking.')
        }
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Assign New Custom Plot</h2>
              <p className="text-xs text-white/80">{projectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ─── SECTION 1: PLOT SPECIFICATION ────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Ruler className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                1. Plot Specifications
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plot Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plot Number / Label *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={plotNumber}
                    onChange={(e) => setPlotNumber(e.target.value)}
                    placeholder={isLoadingNextNumber ? 'Loading...' : 'e.g. 1, 2, A-1'}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
                  />
                  {isLoadingNextNumber && (
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400">...</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Auto-suggested sequentially, or type any custom label.
                </p>
              </div>

              {/* Area (sq.yd) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plot Area (sq.yd) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={areaSqYd}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Total area in square yards.</p>
              </div>

              {/* Pricing Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pricing Mode
                </label>
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPricingMode('total')}
                    className={`py-1 text-xs font-semibold rounded-md transition-all ${
                      pricingMode === 'total'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Total Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode('per_unit')}
                    className={`py-1 text-xs font-semibold rounded-md transition-all ${
                      pricingMode === 'per_unit'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Per sq.yd
                  </button>
                </div>
              </div>
            </div>

            {/* Price Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-violet-50/50 p-4 rounded-xl border border-violet-100">
              <div>
                <label className="block text-xs font-semibold text-violet-900 mb-1">
                  {pricingMode === 'total' ? 'Total List Price (₹) *' : 'Total List Price (Calculated)'}
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  readOnly={pricingMode === 'per_unit'}
                  value={totalPrice}
                  onChange={(e) => handleTotalPriceChange(e.target.value)}
                  placeholder="e.g. 2500000"
                  className={`w-full px-3 py-2 rounded-lg text-sm font-bold outline-none transition-all ${
                    pricingMode === 'total'
                      ? 'bg-white border border-violet-300 text-violet-900 focus:ring-2 focus:ring-violet-500'
                      : 'bg-violet-100/60 border border-violet-200 text-violet-700 cursor-not-allowed'
                  }`}
                />
                {totalPrice && (
                  <p className="text-xs font-medium text-violet-600 mt-1">
                    ₹{formatNumber(parseFloat(totalPrice) || 0)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-violet-900 mb-1">
                  {pricingMode === 'per_unit' ? 'Rate per sq.yd (₹) *' : 'Rate per sq.yd (Calculated)'}
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  readOnly={pricingMode === 'total'}
                  value={pricePerUnit}
                  onChange={(e) => handlePricePerUnitChange(e.target.value)}
                  placeholder="e.g. 5000"
                  className={`w-full px-3 py-2 rounded-lg text-sm font-bold outline-none transition-all ${
                    pricingMode === 'per_unit'
                      ? 'bg-white border border-violet-300 text-violet-900 focus:ring-2 focus:ring-violet-500'
                      : 'bg-violet-100/60 border border-violet-200 text-violet-700 cursor-not-allowed'
                  }`}
                />
                {pricePerUnit && (
                  <p className="text-xs font-medium text-violet-600 mt-1">
                    ₹{formatNumber(parseFloat(pricePerUnit) || 0)} / sq.yd
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: CLIENT SELECTION ────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  2. Select Primary Client *
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {filteredClients.length} clients available
              </span>
            </div>

            {/* Search Client */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search clients by name, phone or code..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              />
            </div>

            {/* Client List */}
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-44 overflow-y-auto bg-gray-50/50">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  No matching clients found.
                </div>
              ) : (
                filteredClients.map((client: any) => {
                  const isSelected = selectedClientId === client.id
                  return (
                    <label
                      key={client.id}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-violet-100/80 border-l-4 border-violet-600'
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="flex_client"
                          value={client.id}
                          checked={isSelected}
                          onChange={() => setSelectedClientId(client.id)}
                          className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">
                            {client.phone || 'No phone'} • {client.client_code || 'No code'}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                      )}
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* ─── SECTION 3: BOOKING & DEAL VALUE ─────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Banknote className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                3. Booking Deal Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Total Agreed Deal Value (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                  placeholder="Total price"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Consultant (Optional)
                </label>
                <select
                  value={consultantId}
                  onChange={(e) => setConsultantId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="">-- No Consultant --</option>
                  {consultants.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Commission (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>

            {/* Deal Summary Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Net Final Deal Value
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Agreed (₹{formatNumber(numericAgreed)}) - Discount (₹{formatNumber(numericDiscount)})
                </p>
              </div>
              <p className="text-xl font-bold text-emerald-700">₹{formatNumber(netDealValue)}</p>
            </div>
          </div>
        </form>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500">
            {isEmployee
              ? 'Request will be sent to Master Admin for review.'
              : 'Creates plot and opens booking details page.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !selectedClientId || !plotNumber.trim()}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? (
                <span>Processing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEmployee ? 'Submit Request' : 'Assign & Start Booking'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
