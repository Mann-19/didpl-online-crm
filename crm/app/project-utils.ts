// Dholera Homes 3: Only these 62 plots are active
export const DH3_ACTIVE_PLOTS = new Set([
  1, 30, 33, 48, 49, 61, 62, 63, 71, 72, 73, 78, 92, 97,
  103, 104, 105, 111, 112, 115, 116, 117, 121, 122, 134, 137, 138,
  144, 145, 148, 149, 166, 167, 173, 181, 182, 188, 189, 194, 195,
  199, 207, 208, 217, 218, 219, 220, 225, 236, 243, 244, 245, 247,
  255, 266, 267, 268, 269, 270, 273, 283, 294,
]);

// AeroTown Residency: Only these 42 plots are active
export const AEROTOWN_RESIDENCY_ACTIVE_PLOTS = new Set([
  8, 11, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 94, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107,
  108, 109, 110, 119, 120, 121, 122, 123, 124, 125, 126, 127
]);
/**
 * If the project is "Dholera Homes 3" or "AeroTown Residency", only return the active plots.
 * For all other projects, return all plots unchanged.
 */
export function filterActivePlots(projectName: string, plots: any[]): any[] {
  const pName = projectName?.toLowerCase() || '';

  if (pName.includes('dholera homes 3')) {
    return (plots || []).filter((p: any) => 
      p && p.plot_number && DH3_ACTIVE_PLOTS.has(parseInt(String(p.plot_number), 10))
    );
  }

  if (pName.includes('aerotown residency') && !pName.includes('aerotown residency ii') && !pName.includes('aerotown residency 2')) {
    return (plots || []).filter((p: any) => 
      p && p.plot_number && AEROTOWN_RESIDENCY_ACTIVE_PLOTS.has(parseInt(String(p.plot_number), 10))
    );
  }

  return plots || [];
}
