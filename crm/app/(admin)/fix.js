const fs = require('fs');
let c = fs.readFileSync('projects.actions.ts', 'utf8');

// 1. Fix getProjectClients
c = c.replace(/  const result: any\[\] = \[\][\s\S]+?  return result/m, `  const clientMap = new Map<string, any>()

  data.forEach((p: any) => {
    // Get all bookings for this plot that might have a client
    const activeBookings = p.bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'pending') || []
    
    // If no active bookings, but the plot has a client linked directly (legacy/sync issue)
    if (activeBookings.length === 0 && p.clients) {
      let isSold = p.status === 'sold'
      let isTokenPaid = (p.status === 'token_paid' || p.status === 'partially_paid') && !isSold
      
      let match = true
      if (status === 'confirmed') match = false // No booking to be confirmed
      if (status === 'sold') match = isSold
      if (status === 'token_paid') match = isTokenPaid

      if (match) {
        const cId = p.clients.id
        if (!clientMap.has(cId)) {
          clientMap.set(cId, { client: p.clients, plots: [] })
        }
        clientMap.get(cId).plots.push({
          _plotNumber: p.plot_number,
          _dealTotal: 0,
          _paidTotal: 0,
          status: p.status,
          booking_status: 'none'
        })
      }
    }

    // Process each active booking
    activeBookings.forEach((b: any) => {
      const clientData = b.client || p.clients
      if (!clientData) return

      const deal = (Number(b.total_amount) || 0) - (Number(b.discount_amount) || 0)
      const paid = (b.payments || []).reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0)
      
      let isFullyPaid = deal > 0 && paid >= deal
      let isSold = isFullyPaid
      let isConfirmed = b.status === 'confirmed'
      let isTokenPaid = (p.status === 'token_paid' || p.status === 'partially_paid') && !isFullyPaid

      let match = true
      if (status === 'confirmed') match = isConfirmed
      if (status === 'sold') match = isSold
      if (status === 'token_paid') match = isTokenPaid

      if (match) {
        const cId = clientData.id
        if (!clientMap.has(cId)) {
          clientMap.set(cId, { client: clientData, plots: [] })
        }
        clientMap.get(cId).plots.push({
          _plotNumber: p.plot_number,
          _dealTotal: deal,
          _paidTotal: paid,
          status: p.status,
          booking_status: b.status
        })
      }
    })
  })

  return Array.from(clientMap.values())`);

// 2. Fix the queries missing client_id
c = c.replace(/id, total_amount, discount_amount, status,\r?\n\s*payments \( amount \)/g, 'id, total_amount, discount_amount, status, client_id,\n        payments ( amount )');

// 3. Fix calculateProjectStats
c = c.replace(/    if \(plot\.status === 'token_paid' \|\| plot\.status === 'partially_paid'\) \{\r?\n\s*tokenPlots\+\+\r?\n\s*\}\r?\n\r?\n\s*if \(isConfirmed \|\| isSold\) \{\r?\n\s*unavailablePlots\+\+\r?\n\s*soldAreaSqYd \+= Number\(plot\.area_sqyd\) \|\| 0\r?\n\s*if \(plot\.client_id\) clients\.add\(plot\.client_id\)\r?\n\s*\} else if \(plot\.status !== 'available'\) \{\r?\n\s*\/\/ If it's not confirmed\/sold but marked as something else not available\r?\n\s*soldAreaSqYd \+= Number\(plot\.area_sqyd\) \|\| 0\r?\n\s*if \(plot\.client_id\) clients\.add\(plot\.client_id\)\r?\n\s*\}/, `    if ((plot.status === 'token_paid' || plot.status === 'partially_paid') && !isSold) {
      tokenPlots++
    }

    // 1. Gather clients from active bookings
    const bookingClientIds = activeBookings.map((b: any) => b.client_id).filter(Boolean)
    bookingClientIds.forEach((id: string) => clients.add(id))
    
    // 2. Gather from plot directly if plot is not available and no active bookings exist
    if (plot.status !== 'available' && bookingClientIds.length === 0 && plot.client_id) {
      clients.add(plot.client_id)
    }

    if (isConfirmed || isSold) {
      unavailablePlots++
      soldAreaSqYd += Number(plot.area_sqyd) || 0
    } else if (plot.status !== 'available') {
      // If it's not confirmed/sold but marked as something else not available
      soldAreaSqYd += Number(plot.area_sqyd) || 0
    }`);

fs.writeFileSync('projects.actions.ts', c);
console.log('File successfully updated with all fixes.');
