// @ts-nocheck

export function renderCommercialWarehouseLayout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    // Layout configuration: 2 rows of 13 plots each = 26 plots
    const PLOTS_PER_ROW = 13;
    const PLOT_WIDTH = 3;
    const PLOT_HEIGHT = 4;
    const ROAD_HEIGHT = 2;
    const GAP = 1;

    const TOTAL_COLS = (PLOTS_PER_ROW * PLOT_WIDTH) + ((PLOTS_PER_ROW - 1) * GAP) + 4; // Adding some padding
    const TOTAL_ROWS = (2 * PLOT_HEIGHT) + ROAD_HEIGHT + 4;

    grid.style.gridTemplateColumns = `repeat(${TOTAL_COLS}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${TOTAL_ROWS}, 1fr)`;
    grid.style.aspectRatio = `${TOTAL_COLS} / ${TOTAL_ROWS}`;
    grid.style.width = "100%";
    grid.style.maxWidth = "1200px";
    grid.style.margin = "0 auto";

    // --- Road ---
    // Central road between the two rows of plots
    placeCell({
        row: PLOT_HEIGHT + 2,
        col: 2,
        span: TOTAL_COLS - 2,
        className: "h-road",
        label: "INTERNAL ROAD (9.0 M)"
    });

    // --- Plots ---
    let plotIdx = 1;

    // Top Row (1-13)
    for (let i = 0; i < PLOTS_PER_ROW; i++) {
        const col = 2 + (i * (PLOT_WIDTH + GAP));
        if (dataMap[plotIdx]) {
            placePlot(plotIdx, 2, col, dataMap[plotIdx], PLOT_HEIGHT, PLOT_WIDTH);
        }
        plotIdx++;
    }

    // Bottom Row (14-26)
    for (let i = 0; i < PLOTS_PER_ROW; i++) {
        const col = 2 + (i * (PLOT_WIDTH + GAP));
        if (dataMap[plotIdx]) {
            placePlot(plotIdx, PLOT_HEIGHT + ROAD_HEIGHT + 2, col, dataMap[plotIdx], PLOT_HEIGHT, PLOT_WIDTH);
        }
        plotIdx++;
    }

    // --- Entrance ---
    const entryMarker = document.createElement("div");
    entryMarker.className = "entry-marker";
    entryMarker.innerHTML = `<div class="entry-arrow">▶</div><div class="entry-text">ENTRY</div>`;
    entryMarker.style.gridColumn = "1 / 2";
    entryMarker.style.gridRow = `${PLOT_HEIGHT + 2} / span ${ROAD_HEIGHT}`;
    entryMarker.style.display = "flex";
    entryMarker.style.flexDirection = "row";
    entryMarker.style.alignItems = "center";
    entryMarker.style.gap = "4px";
    grid.appendChild(entryMarker);
}
