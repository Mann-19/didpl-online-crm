const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const envFile = process.argv.includes('--prod') ? '.env.production' : '.env.local';
require('dotenv').config({ path: envFile });

console.log(`\nUsing environment file: ${envFile}`);

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parses plot numbers string, handling formats like "1", "22 TO 28", or "29, 30"
 */
function parsePlotNumbers(plotStr) {
  if (!plotStr) return [];
  const result = [];
  // Remove quotes and split by comma
  const parts = plotStr.replace(/"/g, '').split(',');
  
  for (let part of parts) {
    part = part.trim();
    if (part.includes(' TO ')) {
      const [startStr, endStr] = part.split(' TO ');
      const start = parseInt(startStr.trim());
      const end = parseInt(endStr.trim());
      
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          result.push(i.toString());
        }
      }
    } else {
      if (part) result.push(part);
    }
  }
  return result;
}

/**
 * Reads a CSV line considering quotes for commas inside strings
 */
function parseCSVLine(line) {
  let cols = [];
  let inQuotes = false;
  let current = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current.trim());
  return cols;
}

/**
 * Syncs plots from a CSV file into the database for a specific project
 */
async function syncPlotsForProject(projectName, csvFileName, plotNoColIndex, areaSqMtColIndex, areaSqYdColIndex) {
  console.log(`\n--- Processing project: ${projectName} ---`);
  
  // 1. Resolve project from DB
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', `%${projectName}%`);
    
  if (projError) {
    console.error(`Error fetching project ${projectName}:`, projError);
    return;
  }
  
  if (!projects || projects.length === 0) {
    console.warn(`Project matching "${projectName}" not found in database. Skipping...`);
    // Output available projects to assist debugging
    const { data: allProjects } = await supabase.from('projects').select('name');
    console.log("Available projects in DB:", allProjects?.map(p => p.name).join(', '));
    return;
  }
  
  const projectId = projects[0].id;
  console.log(`Found Project in DB: ${projects[0].name} (ID: ${projectId})`);
  
  // 2. Read CSV
  const csvPath = path.join(__dirname, '../documentation/assets', csvFileName);
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    return;
  }
  
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Remove header
  lines.shift();
  
  let updatedCount = 0;
  let insertedCount = 0;
  
  for (const line of lines) {
    const cols = parseCSVLine(line);
    
    if (cols.length < Math.max(plotNoColIndex, areaSqYdColIndex)) continue;
    
    const plotStr = cols[plotNoColIndex];
    let areaSqMt = areaSqMtColIndex !== null && cols[areaSqMtColIndex] ? parseFloat(cols[areaSqMtColIndex]) : null;
    let areaSqYd = areaSqYdColIndex !== null && cols[areaSqYdColIndex] ? parseFloat(cols[areaSqYdColIndex]) : null;
    
    // Auto convert missing values (1 sq meter = ~1.19599 sq yards)
    if (areaSqMt === null && areaSqYd !== null && !isNaN(areaSqYd)) {
      areaSqMt = parseFloat((areaSqYd / 1.19599).toFixed(2));
    } else if (areaSqYd === null && areaSqMt !== null && !isNaN(areaSqMt)) {
      areaSqYd = parseFloat((areaSqMt * 1.19599).toFixed(2));
    }
    
    if (isNaN(areaSqMt)) areaSqMt = null;
    if (isNaN(areaSqYd)) areaSqYd = null;
    
    const plotNumbers = parsePlotNumbers(plotStr);
    
    for (const plotNo of plotNumbers) {
      // Find if plot exists
      const { data: existingPlots, error: findError } = await supabase
        .from('plots')
        .select('id')
        .eq('project_id', projectId)
        .eq('plot_number', plotNo);
        
      if (findError) {
        console.error(`Error finding plot ${plotNo}:`, findError.message);
        continue;
      }
      
      if (existingPlots && existingPlots.length > 0) {
        // Update existing plot area
        const { error: updateError } = await supabase
          .from('plots')
          .update({ area_sqyd: areaSqYd })
          .eq('id', existingPlots[0].id);
          
        if (updateError) {
          console.error(`Failed to update plot ${plotNo}:`, updateError.message);
        } else {
          updatedCount++;
        }
      } else {
        // Create new plot since it doesn't exist
        const { error: insertError } = await supabase
          .from('plots')
          .insert({
            project_id: projectId,
            plot_number: plotNo,
            area_sqyd: areaSqYd,
            status: 'available' // default status based on schema
          });
          
        if (insertError) {
          console.error(`Failed to create plot ${plotNo}:`, insertError.message);
        } else {
          insertedCount++;
        }
      }
    }
  }
  
  console.log(`Finished processing ${projectName}:`);
  console.log(` - Updated: ${updatedCount} plots`);
  console.log(` - Inserted: ${insertedCount} new plots`);
}

async function main() {
  console.log("Starting DB plot sync script...");
  
  // 1. Aerotown Residency
  // Header: PLOT NO.,SALEABLE AREA (IN SQ.MT.),SALEABLE AREA (IN SQ.YD.)
  await syncPlotsForProject('Aerotown Residency', 'aerotown_residency.csv', 0, 1, 2);
  
  // 2. Aerotown Logistics
  // Header: Sr. No.,Plot No.,Plot Area in Sq. Yds.
  await syncPlotsForProject('Aerotown Logistics', 'aerotown_logistics.csv', 1, null, 2);
  
  // 3. Dholera Homes
  // Header: Sr. No.,New Plot No,Total Plot Area
  await syncPlotsForProject('Dholera Homes', 'dholera_homes.csv', 1, null, 2);
  
  console.log('\nAll projects processed successfully.');
}

main().catch(error => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
