// Dholera Homes 3: Only these 62 plots are active
export const DH3_ACTIVE_PLOTS = new Set([
  1, 30, 33, 48, 49, 61, 62, 63, 71, 72, 73, 78, 92, 97,
  103, 104, 105, 111, 112, 115, 116, 117, 121, 122, 134, 137, 138,
  144, 145, 148, 149, 166, 167, 173, 181, 182, 188, 189, 194, 195,
  199, 207, 208, 217, 218, 219, 220, 225, 236, 243, 244, 245, 247,
  255, 266, 267, 268, 269, 270, 273, 283, 294,
]);

/**
 * If the project is "Dholera Homes 3", only return the 62 active plots.
 * For all other projects, return all plots unchanged.
 */
export function filterActivePlots(projectName: string, plots: any[]): any[] {
  if (projectName === 'Dholera Homes 3') {
    return (plots || []).filter((p: any) => 
      p && p.plot_number && DH3_ACTIVE_PLOTS.has(parseInt(String(p.plot_number), 10))
    );
  }
  return plots || [];
}
