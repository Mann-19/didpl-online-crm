// @ts-nocheck

export function renderAeroTown2Layout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    // Establishing a base grid (adjust as needed for the new layout)
    grid.style.gridTemplateColumns = "repeat(50, 1fr)";
    grid.style.gridTemplateRows = "repeat(40, 1fr)"; 
    grid.style.aspectRatio = "50 / 40";

    // ── TEMPLATE: ROAD (Horizontal) ─────────────────────────────────────────
    placeCell({
        row: "1 / 3",    // Start row / End row
        col: 1,          // Start column
        span: 50,        // Column span
        className: "h-road", // Use "vertical-road" for vertical roads
        label: "ROAD NAME"
    });

    // ── TEMPLATE: PLOT ──────────────────────────────────────────────────────
    // Parameters: id, startRow, startCol, dataMapEntry, rowSpan, colSpan
    placePlot(`R1`, 4, 1, dataMap[`R1`], 2, 4);

    // ── TEMPLATE: GARDEN ────────────────────────────────────────────────────
    placeCell({
        row: "10 / 15",
        col: 10,
        span: 10,
        className: "garden",
        label: "GARDEN",
        style: { backgroundColor: "#bbf7d0", color: "#166534", border: "2px solid #22c55e" }
    });
}