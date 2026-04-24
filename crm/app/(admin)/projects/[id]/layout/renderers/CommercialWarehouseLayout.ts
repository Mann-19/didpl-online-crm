// @ts-nocheck

export function renderCommercialWarehouseLayout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    grid.style.width = "60vw";
    grid.style.maxWidth = "100%";
    grid.style.margin = "0 auto";
    grid.style.padding = "10px";

    const PLOT_DIM = 4;
    const ROAD_DIM = 1;
    const TOTAL_COLS = 5;
    const TOTAL_ROWS = 6;
    const GRID_COLS_UNITS = (TOTAL_COLS * PLOT_DIM) + ((TOTAL_COLS + 1) * ROAD_DIM); // 26
    const GRID_ROWS_UNITS = (TOTAL_ROWS * PLOT_DIM) + ((TOTAL_ROWS + 1) * ROAD_DIM); // 31

    grid.style.gridTemplateColumns = `repeat(${GRID_COLS_UNITS}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${GRID_ROWS_UNITS}, 1fr)`;
    grid.style.aspectRatio = `${GRID_COLS_UNITS} / ${GRID_ROWS_UNITS}`;

    const START_COL = 1;
    const START_ROW = 1;

    for (let i = 0; i <= TOTAL_ROWS; i++) {
        const roadRow = START_ROW + (i * (PLOT_DIM + ROAD_DIM));
        placeCell({
            row: roadRow,
            col: START_COL,
            rowSpan: ROAD_DIM,
            span: GRID_COLS_UNITS,
            className: "h-road",
            label: ""
        });
    }

    for (let i = 0; i <= TOTAL_COLS; i++) {
        const roadCol = START_COL + (i * (PLOT_DIM + ROAD_DIM));
        const verticalRoad = document.createElement("div");
        verticalRoad.className = "vertical-road internal-road";
        verticalRoad.style.gridColumn = `${roadCol} / span ${ROAD_DIM}`;
        verticalRoad.style.gridRow = `${START_ROW} / span ${GRID_ROWS_UNITS}`;
        verticalRoad.style.zIndex = "10";
        grid.appendChild(verticalRoad);
    }

    let plotIdx = 1;
    for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < TOTAL_COLS; c++) {
            const plotRow = START_ROW + ROAD_DIM + (r * (PLOT_DIM + ROAD_DIM));
            const plotCol = START_COL + ROAD_DIM + (c * (PLOT_DIM + ROAD_DIM));

            if (plotIdx <= 26) {
                placePlot(plotIdx, plotRow, plotCol, dataMap[plotIdx], PLOT_DIM, PLOT_DIM);
                plotIdx++;
            } else {
                const emptyCell = document.createElement("div");
                emptyCell.style.gridRow = `${plotRow} / span ${PLOT_DIM}`;
                emptyCell.style.gridColumn = `${plotCol} / span ${PLOT_DIM}`;
                emptyCell.style.backgroundColor = "#e0e0e0";
                emptyCell.style.border = "1px dashed #aaaaaa";
                emptyCell.style.borderRadius = "4px";
                emptyCell.style.zIndex = "5";
                grid.appendChild(emptyCell);
            }
        }
    }
}
