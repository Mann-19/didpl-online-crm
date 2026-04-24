import { renderAerotownLayout } from "./AerotownLayout";
import { renderDholeraHomes3Layout } from "./DholeraHomes3Layout";
import { renderCommercialWarehouseLayout } from "./CommercialWarehouseLayout";

// Registry of project renderers - matched by lowercase project name substring
const PROJECT_RENDERERS: Record<string, Function> = {
    // Dholera Homes 3 — must be checked BEFORE 'dholera' alone to avoid false match
    'dholera homes 3': renderDholeraHomes3Layout,
    'dholera-homes-3': renderDholeraHomes3Layout,
    'dholera homes': renderDholeraHomes3Layout,   // catch "Dholera Homes 3" via substring
    // AeroTown — catches "AeroTown Residency", "Aerotown", etc.
    'aerotown': renderAerotownLayout,
    // Commercial Warehouse variants
    'commercial warehouse': renderCommercialWarehouseLayout,
    'airport estate commercial': renderCommercialWarehouseLayout,
    'commercial': renderCommercialWarehouseLayout,
};

export function getLayoutRenderer(projectName: string | undefined): Function {
    if (!projectName) return renderAerotownLayout;

    const normalizedName = projectName.toLowerCase();

    for (const [key, renderer] of Object.entries(PROJECT_RENDERERS)) {
        if (normalizedName.includes(key)) {
            return renderer;
        }
    }

    return renderAerotownLayout; // Default fallback
}
