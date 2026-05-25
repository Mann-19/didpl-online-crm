const fs = require('fs');
const file = 'd:/Programming/ELECTRON JS/DIDP - Online/crm/app/(admin)/projects.actions.ts';
let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const search = `  return {
    ...project,
    totalPlots,
    confirmedPlots,
    soldPlots,
    tokenPlots,
  }

  // Fetch all plots with their bookings and payments to calculate stats`;

const replacement = `  return {
    ...project,
    totalPlots,
    confirmedPlots,
    soldPlots,
    tokenPlots,
    cancelledPlots,
    availablePlots,
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

// 1. Get All Projects with Stats
export async function getProjectsWithStats() {
  const supabase = await createClient()

  // Fetch projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
    return []
  }

  // Fetch all plots with their bookings and payments to calculate stats`;

if(code.includes(search)) {
  code = code.replace(search, replacement);
  fs.writeFileSync(file, code);
  console.log('Fixed successfully');
} else {
  console.log('Search string not found!');
}
