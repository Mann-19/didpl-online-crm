// @ts-nocheck

export function renderAerotownLayout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    grid.style.gridTemplateColumns = "repeat(40, 1fr)";
    grid.style.gridTemplateRows = "repeat(14, 1fr)";
    grid.style.aspectRatio = "40 / 14";

    const CENTER_COL = 20;

    const verticalRoad = document.createElement("div");
    verticalRoad.className = "vertical-road";
    verticalRoad.innerHTML = `<span>12.0 M ROAD</span>`;
    verticalRoad.style.gridColumn = `${CENTER_COL} / ${CENTER_COL + 1}`;
    verticalRoad.style.gridRow = "1 / 10";
    verticalRoad.style.zIndex = "20";
    grid.appendChild(verticalRoad);

    const entryMarker = document.createElement("div");
    entryMarker.className = "entry-marker";
    entryMarker.innerHTML = `<div class="entry-arrow">▼</div><div class="entry-text">ENTRY</div>`;
    entryMarker.style.gridColumn = `${CENTER_COL} / ${CENTER_COL + 1}`;
    entryMarker.style.gridRow = "0 / 1";
    grid.appendChild(entryMarker);

    for (let i = 0; i < 12; i++) placePlot(1 + i, 1, CENTER_COL - 12 + i, dataMap[1 + i]);
    for (let i = 0; i < 8; i++) placePlot(13 + i, 1, CENTER_COL + 1 + i, dataMap[13 + i]);

    placeCell({ row: 2, col: 1, span: 40, className: "h-road", label: "7.50 M ROAD" });

    for (let i = 0; i < 17; i++) placePlot(46 - i, 3, CENTER_COL - 17 + i, dataMap[46 - i]);
    for (let i = 0; i < 9; i++) placePlot(29 - i, 3, CENTER_COL + 1 + i, dataMap[29 - i]);

    for (let i = 0; i < 14; i++) placePlot(47 + i, 4, CENTER_COL - 14 + i, dataMap[47 + i]);
    for (let i = 0; i < 11; i++) placePlot(61 + i, 4, CENTER_COL + 1 + i, dataMap[61 + i]);

    placeCell({ row: 5, col: 1, span: 40, className: "h-road", label: "7.50 M ROAD" });

    for (let i = 0; i < 12; i++) placePlot(95 - i, 6, CENTER_COL - 12 + i, dataMap[95 - i]);
    for (let i = 0; i < 12; i++) placePlot(83 - i, 6, CENTER_COL + 1 + i, dataMap[83 - i]);

    for (let i = 0; i < 9; i++) placePlot(96 + i, 7, CENTER_COL - 9 + i, dataMap[96 + i]);
    for (let i = 0; i < 14; i++) placePlot(105 + i, 7, CENTER_COL + 1 + i, dataMap[105 + i]);

    placeCell({ row: 8, col: 1, span: 40, className: "h-road", label: "7.50 M ROAD" });

    placeCell({ row: 9, col: 1, span: 13, className: "bushes", label: "PARK" });
    for (let i = 0; i < 3; i++) placePlot(127 - i, 9, CENTER_COL - 3 + i, dataMap[127 - i]);
    for (let i = 0; i < 6; i++) placePlot(124 - i, 9, CENTER_COL + 1 + i, dataMap[124 - i]);
    placeCell({ row: 9, col: 27, span: 12, className: "garden", label: "GARDEN" });
}
