const fs = require('fs');
let c = fs.readFileSync('projects.actions.ts', 'utf8');

// Add cancelledPlots to calculateProjectStats
c = c.replace(/  let confirmedPlots = 0\r?\n\s*let soldPlots = 0\r?\n\s*let tokenPlots = 0/, `  let confirmedPlots = 0
  let soldPlots = 0
  let tokenPlots = 0
  let cancelledPlots = 0`);

c = c.replace(/    if \(\(plot\.status === 'token_paid' \|\| plot\.status === 'partially_paid'\) && !isSold\) \{\r?\n\s*tokenPlots\+\+\r?\n\s*\}/, `    if ((plot.status === 'token_paid' || plot.status === 'partially_paid') && !isSold) {
      tokenPlots++
    }

    const cancelledBookings = plot.bookings?.filter((b: any) => b.status === 'cancelled') || []
    if (cancelledBookings.length > 0) {
      cancelledPlots += cancelledBookings.length
    }`);

c = c.replace(/    soldPlots,\r?\n\s*tokenPlots,/, `    soldPlots,
    tokenPlots,
    cancelledPlots,`);

// Update getProjectOverview statusCounts
c = c.replace(/const statusCounts = \{ available: 0, token: 0, partial: 0, sold: 0 \}/, `const statusCounts = { available: 0, token: 0, partial: 0, sold: 0, cancelled: stats.cancelledPlots }`);


// Update getProjectClients activeBookings logic
c = c.replace(/const activeBookings = p\.bookings\?\.filter\(\(b: any\) => b\.status === 'confirmed' \|\| b\.status === 'pending'\) \|\| \[\]/, `const activeBookings = status === 'cancelled'
      ? p.bookings?.filter((b: any) => b.status === 'cancelled') || []
      : p.bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'pending') || []`);

c = c.replace(/      let match = true\r?\n\s*if \(status === 'confirmed'\) match = false \/\/ No booking to be confirmed\r?\n\s*if \(status === 'sold'\) match = isSold\r?\n\s*if \(status === 'token_paid'\) match = isTokenPaid/, `      let match = true
      if (status === 'confirmed') match = false // No booking to be confirmed
      if (status === 'sold') match = isSold
      if (status === 'token_paid') match = isTokenPaid
      if (status === 'cancelled') match = false // No active cancelled booking without booking record`);

c = c.replace(/      let match = true\r?\n\s*if \(status === 'confirmed'\) match = isConfirmed\r?\n\s*if \(status === 'sold'\) match = isSold\r?\n\s*if \(status === 'token_paid'\) match = isTokenPaid/, `      let match = true
      if (status === 'confirmed') match = isConfirmed
      if (status === 'sold') match = isSold
      if (status === 'token_paid') match = isTokenPaid
      if (status === 'cancelled') match = b.status === 'cancelled'`);

fs.writeFileSync('projects.actions.ts', c);
console.log('Done!');
