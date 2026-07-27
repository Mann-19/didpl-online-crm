// ─────────────────────────────────────────────────────────────────────────────
// Project Statistics Utilities
//
// Canonical shared implementations — previously duplicated across
// dashboard/actions.ts and projects.actions.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Active Plot Filters ──────────────────────────────────────────────────────

/**
 * Dholera Homes 3 — only these plot numbers are active in the system.
 * All other plots in this project are excluded from stats and display.
 */
export const DH3_ACTIVE_PLOTS = new Set([
  1, 30, 33, 48, 49, 61, 62, 63, 71, 72, 73, 78, 92, 97,
  103, 104, 105, 111, 112, 115, 116, 117, 121, 122, 134, 137, 138,
  144, 145, 148, 149, 166, 167, 173, 181, 182, 188, 189, 194, 195,
  199, 207, 208, 217, 218, 219, 220, 225, 236, 243, 244, 245, 247,
  255, 266, 267, 268, 269, 270, 273, 283, 294,
])

/**
 * AeroTown Residency (Phase 1) — only these plot numbers are active.
 * Excludes AeroTown Residency II / Phase 2.
 */
export const AEROTOWN_RESIDENCY_ACTIVE_PLOTS = new Set([
  8, 11, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 94, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107,
  108, 109, 110, 119, 120, 121, 122, 123, 124, 125, 126, 127,
])

/**
 * For projects with partial active-plot lists (Dholera Homes 3, AeroTown Residency),
 * returns only the plots that are active. For all other projects, returns all plots.
 */
export function filterActivePlots(projectName: string, plots: any[]): any[] {
  const pName = projectName?.toLowerCase() || ''

  if (pName.includes('dholera homes 3')) {
    return (plots || []).filter(
      (p: any) => p?.plot_number && DH3_ACTIVE_PLOTS.has(parseInt(String(p.plot_number), 10))
    )
  }

  if (
    pName.includes('aerotown residency') &&
    !pName.includes('aerotown residency ii') &&
    !pName.includes('aerotown residency 2')
  ) {
    return (plots || []).filter(
      (p: any) =>
        p?.plot_number &&
        AEROTOWN_RESIDENCY_ACTIVE_PLOTS.has(parseInt(String(p.plot_number), 10))
    )
  }

  return plots || []
}

// ─── Stats Return Type ────────────────────────────────────────────────────────

export interface ProjectStats {
  // Project identity (spread from project row)
  id: string
  name: string
  location?: string
  status?: string
  project_code?: string
  [key: string]: any

  // Plot counts
  totalPlots: number
  confirmedPlots: number
  soldPlots: number
  fullyPaidPlots: number
  tokenPlots: number
  availablePlots: number
  cancelledPlots: number
  unavailablePlots: number

  // Financial
  totalListPrice: number
  totalRevenue: number
  amountReceived: number
  pendingAmount: number
  collectionRate: number
  pendingPercentage: number

  // Area
  totalAreaSqYd: number
  soldAreaSqYd: number
  remainingAreaSqYd: number
  areaPercentageSold: number

  // Relations
  clientCount: number
  pricePerUnit: number
}

// ─── Core Stats Calculator ────────────────────────────────────────────────────

/**
 * Calculates all statistics for a single project given its plots and their bookings.
 *
 * Plots should be pre-filtered through filterActivePlots() before calling this.
 * Bookings must be joined on each plot with at least:
 *   id, total_amount, discount_amount, amount_paid, status, client_id,
 *   booking_type, booking_partners(client_id), payments(amount)
 */
export function calculateProjectStats(project: any, plots: any[]): ProjectStats {
  const totalPlots = plots.length

  let confirmedPlots = 0
  let soldPlots = 0
  let tokenPlots = 0
  let fullyPaidPlots = 0
  let unavailablePlots = 0
  let cancelledPlots = 0

  let totalRevenue = 0
  let totalListPrice = 0
  let amountReceived = 0
  let totalAreaSqYd = 0
  let soldAreaSqYd = 0
  const clients = new Set<string>()

  plots.forEach((plot: any) => {
    totalAreaSqYd += Number(plot.area_sqyd) || 0
    totalListPrice += Number(plot.price) || 0

    // Separate active from cancelled bookings
    const activeBookings =
      plot.bookings?.filter(
        (b: any) => b.status === 'confirmed' || b.status === 'pending'
      ) || []

    const cancelledBookings =
      plot.bookings?.filter((b: any) => b.status === 'cancelled') || []

    cancelledPlots += cancelledBookings.length

    let isFullyPaid = false
    let isConfirmed = false
    let plotRevenue = 0
    const hasActiveBooking = activeBookings.length > 0

    if (hasActiveBooking) {
      activeBookings.forEach((b: any) => {
        const dealValue =
          (Number(b.total_amount) || 0) - (Number(b.discount_amount) || 0)
        const paid = Number(b.amount_paid) || 0

        if (dealValue > 0 && paid >= dealValue) isFullyPaid = true
        if (b.status === 'confirmed') {
          isConfirmed = true
          plotRevenue += dealValue
        }

        amountReceived += paid
      })
    }

    if (!isConfirmed) {
      plotRevenue += Number(plot.price) || 0
    }

    totalRevenue += plotRevenue

    // Derive plot status from booking state
    let derivedPlotStatus = 'available'
    if (isFullyPaid && isConfirmed) derivedPlotStatus = 'sold'
    else if (isFullyPaid && !isConfirmed) derivedPlotStatus = 'fully_paid'
    else if (hasActiveBooking) derivedPlotStatus = 'token_paid'

    if (isConfirmed && derivedPlotStatus !== 'sold') confirmedPlots++
    if (derivedPlotStatus === 'sold') soldPlots++
    if (derivedPlotStatus === 'fully_paid') fullyPaidPlots++
    if (derivedPlotStatus === 'token_paid') tokenPlots++

    // Gather unique clients from active bookings (including partners)
    activeBookings.forEach((b: any) => {
      if (b.client_id) clients.add(b.client_id)
      ;(b.booking_partners || []).forEach((bp: any) => {
        if (bp.client_id) clients.add(bp.client_id)
      })
    })

    // Fallback: plot directly linked to client with no active bookings
    if (plot.status !== 'available' && activeBookings.length === 0 && plot.client_id) {
      clients.add(plot.client_id)
    }

    if (derivedPlotStatus !== 'available' || plot.status !== 'available') {
      unavailablePlots++
      soldAreaSqYd += Number(plot.area_sqyd) || 0
    }
  })

  const availablePlots = totalPlots - unavailablePlots
  const pendingAmount = totalRevenue - amountReceived
  const areaPercentageSold =
    totalAreaSqYd > 0 ? (soldAreaSqYd / totalAreaSqYd) * 100 : 0
  const collectionRate =
    totalRevenue > 0 ? (amountReceived / totalRevenue) * 100 : 0
  const pendingPercentage =
    totalRevenue > 0 ? (pendingAmount / totalRevenue) * 100 : 0

  return {
    ...project,
    totalPlots,
    confirmedPlots,
    soldPlots,
    fullyPaidPlots,
    tokenPlots,
    availablePlots,
    cancelledPlots,
    unavailablePlots,
    totalListPrice,
    totalRevenue,
    amountReceived,
    pendingAmount,
    totalAreaSqYd,
    soldAreaSqYd,
    remainingAreaSqYd: totalAreaSqYd - soldAreaSqYd,
    areaPercentageSold,
    collectionRate,
    pendingPercentage,
    clientCount: clients.size,
    pricePerUnit: plots.find((p: any) => p.price_per_unit)?.price_per_unit || 0,
  }
}
