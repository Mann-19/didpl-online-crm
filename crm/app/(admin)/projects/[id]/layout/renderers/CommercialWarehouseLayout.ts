// @ts-nocheck

export function renderCommercialWarehouseLayout({ grid, dataMap, utils }) {
    const { placePlot } = utils;

    const TOTAL_COLS = 5;
    const TOTAL_ROWS = 6;
    const TOTAL_PLOTS = 26;

    grid.style.width = "70vw";
    grid.style.maxWidth = "900px";
    grid.style.margin = "0 auto";
    grid.style.gridTemplateColumns = `repeat(${TOTAL_COLS}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${TOTAL_ROWS}, 1fr)`;
    grid.style.aspectRatio = `${TOTAL_COLS} / ${TOTAL_ROWS}`;

    let plotIdx = 1;
    for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < TOTAL_COLS; c++) {
            const row = r + 1;
            const col = c + 1;

            if (plotIdx <= TOTAL_PLOTS) {
                placePlot(plotIdx, row, col, dataMap[plotIdx], 1, 1);
                plotIdx++;
            } else {
                // Empty placeholder cell for the remaining 4 cells (rows 6, cols 2–5)
                const emptyCell = document.createElement("div");
                emptyCell.style.gridRow = `${row}`;
                emptyCell.style.gridColumn = `${col}`;
                emptyCell.style.backgroundColor = "#f1f5f9";
                emptyCell.style.border = "1px dashed #cbd5e1";
                emptyCell.style.borderRadius = "4px";
                emptyCell.style.zIndex = "1";
                grid.appendChild(emptyCell);
            }
        }
    }
}
