import { renderAerotownLayout } from "./AerotownLayout";
import { renderAeroTown2Layout } from "./AeroTown2Layout";

import { renderDholeraHomes3Layout } from "./DholeraHomes3Layout";
import { renderCommercialWarehouseLayout } from "./CommercialWarehouseLayout";

// Registry of project renderers — matched by lowercase project name substring.
// ORDER MATTERS: more specific keys must come before broader ones.
// e.g. 'aerotown logistic park' must precede 'aerotown' to avoid false match.
const PROJECT_RENDERERS: Record<string, Function> = {
    // Specific project names first
    'aero town logistic park': renderCommercialWarehouseLayout,
    'aerotown logistic park': renderCommercialWarehouseLayout,
    'logistic park': renderCommercialWarehouseLayout,

    // Dholera Homes 3 — must be checked BEFORE 'dholera' alone to avoid false match
    'dholera homes 3': renderDholeraHomes3Layout,
    'dholera-homes-3': renderDholeraHomes3Layout,
    'dholera homes': renderDholeraHomes3Layout,   // catch "Dholera Homes 3" via substring

    // AeroTown Residency II — must come BEFORE generic 'aerotown residency'
    'aerotown residency ii': renderAeroTown2Layout,
    'aerotown residency 2': renderAeroTown2Layout,
    'aero town residency ii': renderAeroTown2Layout,
    'atc-002': renderAeroTown2Layout,

    // AeroTown Residency (original) — catches "AeroTown Residency", "Aerotown", etc.
    'aerotown residency': renderAerotownLayout,
    'aero town residency': renderAerotownLayout,
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
