import { renderAerotownLayout } from "./AerotownLayout";
import { renderAerotownLogisticParkLayout } from "./AerotownLogisticParkLayout";
import { renderDholeraHomes3Layout } from "./DholeraHomes3Layout";
import { renderCommercialWarehouseLayout } from "./CommercialWarehouseLayout";

// Registry of project renderers — matched by lowercase project name substring.
// ORDER MATTERS: more specific keys must come before broader ones.
// e.g. 'aerotown logistic park' must precede 'aerotown' to avoid false match.
const PROJECT_RENDERERS: Record<string, Function> = {
    // Dholera Homes 3 — must be checked BEFORE 'dholera' alone
    'dholera homes 3': renderDholeraHomes3Layout,
    'dholera-homes-3': renderDholeraHomes3Layout,
    'dholera homes': renderDholeraHomes3Layout,

    // AeroTown Logistic Park — must be checked BEFORE 'aerotown' alone
    'aerotown logistic park': renderAerotownLogisticParkLayout,
    'logistic park': renderAerotownLogisticParkLayout,

    // AeroTown Residency — catches "AeroTown Residency", "Aerotown", etc.
    'aerotown': renderAerotownLayout,

    // Commercial Warehouse variants
    'commercial warehouse': renderCommercialWarehouseLayout,
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
