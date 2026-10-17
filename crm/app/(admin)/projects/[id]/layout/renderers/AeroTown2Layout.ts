// @ts-nocheck

export function renderAeroTown2Layout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    // ─────────────────────────────────────────────────────────────────────────
    // Grid: 17 cols × 35 rows
    //
    //  Max triangle width = 17 units:
    //    7 plots (R1–R7) | 1 col road | 7 plots (R79–R85) | 2 col common
    //  = 7 + 1 + 7 + 2 = 17  ← this is also the road width at the base
    //
    //  aspect-ratio 17:35 → each grid cell renders as a perfect 1×1 square
    //  gap: 3px           → visual separation between plot tiles ("padding")
    // ─────────────────────────────────────────────────────────────────────────
    grid.style.gridTemplateColumns = "repeat(50, 1fr)";
    grid.style.gridTemplateRows = "repeat(40, 1fr)";
    grid.style.aspectRatio = "50 / 40";
    grid.style.gap = "5px";

    // ── EXISTING ROAD — base of triangle (3 units tall, full 17-col width) ──
    //  Col split:  4  +  9  +  4  = 17
    placeCell({
        row: "38 / 40",
        col: 1,
        span: 48,
        className: "h-road wide-road",
        label: "← Dholera Intl. Airport",
        style: { textAlign: "left", paddingLeft: "4px", fontSize: "0.8rem" }
    });

    // ── 9.0 MTR ROAD (2 units tall, full 17-col width) ──────────────────────
    placeCell({
        row: "36 / 38",
        col: 1,
        span: 48,
        className: "h-road",
        label: "9.0 mtr road"
    });

    // ── 7.5 MTR VERTICAL ROAD — col 8, full plot-area height ────────────────
    // Runs from the top of the triangle all the way down to row 30
    placeCell({
        row: "18 / 36",
        col: 22,
        span: 2,
        className: "vertical-road",
        label: "12 mtr road"
    });

    // ── PLOT ROW 1 — row 30 (immediately above 9.0 mtr road) ─────────────────
    //
    //  Col:  1   2   3   4   5   6   7  | 8 (road) |  9  10  11  12  13  14  15 | 16–17
    //       [R1][R2][R3][R4][R5][R6][R7]  [7.5m rd] [R79][R80][R81][R82][R83][R84][R85][Com]

    // Section A — Plots 1 to 7 (cols 1–7)
    for (let i = 1; i <= 21; i += 3) {
        const num = (i + 2) / 3;
        placePlot(`${num}`, 34, i, dataMap[num] || dataMap[`${num}`], 2, 3);
    }

    // Section B — Plots 79 to 85 (cols 24+)
    for (let i = 1; i <= 21; i += 3) {
        const num = 78 + (i + 2) / 3;
        placePlot(`${num}`, 34, i + 23, dataMap[num] || dataMap[`${num}`], 2, 3);
    }


    // ── PLOT ROW 2 ─────────────────
    //
    //  Col:  1   2   3   4   5   6   7  | road |  9  10  11  12  13  14  15 | common
    //        [17][16][15][14][13][12][11][10]  [9][8]    [78][77][76][75][74][73][72][71][70]

    // Section A — Plots 17 to 8 (Descending order from left to right)
    let colA = 1;
    for (let i = 17; i >= 8; i--) {
        placePlot(`${i}`, 32, colA, dataMap[i] || dataMap[`${i}`], 2, 2);
        colA += 2;
    }
    // Section B — Plots 78 to 70 (Descending)
    let colB = 1;
    for (let i = 78; i >= 70; i--) {
        placePlot(`${i}`, 32, colB + 23, dataMap[i] || dataMap[`${i}`], 2, 2);
        colB += 2;
    }

    // Common plot block
    placeCell({
        row: "32 / 34",
        col: 42,
        span: 3,
        className: "h-road",
        label: "Common Plot 2"
    });
    placeCell({
        row: "32 / 36",
        col: 45,
        span: 4,
        className: "h-road",
        label: "Common Plot 2"
    });

    // ── 7.5 MTR ROAD  ──────────────────────
    placeCell({
        row: "30 / 32",
        col: 1,
        span: 44,
        className: "h-road",
        label: "7.5 mtr road"
    });

    // Plots 18 to 26 (vertical column, left side)
    let row = 1;
    for (let i = 18; i <= 26; i++) {
        placePlot(`${i}`, 29 - row, 1, dataMap[i] || dataMap[`${i}`], 2, 2);
        row += 2;
    }

    placeCell({
        row: "14 / 30",
        col: 3,
        span: 2,
        className: "vertical-road",
        label: "7.5 MTR ROAD"
    });

    // Plots 37 to 44
    let rowB = 15;
    for (let i = 37; i <= 44; i++) {
        placePlot(`${i}`, 29 - rowB, 5, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowB -= 2;
    }
    // Plots 45 to 51
    let rowC = 1;
    for (let i = 45; i <= 51; i++) {
        placePlot(`${i}`, 29 - rowC, 7, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowC += 2;
    }

    placeCell({
        row: "15 / 30",
        col: 9,
        span: 2,
        className: "vertical-road",
        label: "7.5 MTR ROAD"
    });

    // Plots 52 to 54
    let rowD = 5;
    for (let i = 52; i <= 54; i++) {
        placePlot(`${i}`, 29 - rowD, 11, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowD -= 2;
    }
    // Plots 55 to 56
    let rowE = 3;
    for (let i = 55; i <= 56; i++) {
        placePlot(`${i}`, 31 - rowE, 13, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowE += 2;
    }

    placeCell({
        row: "20 / 24",
        col: 11,
        span: 2,
        className: "h-road",
        label: "Common"
    });

    placeCell({
        row: "22 / 26",
        col: 13,
        span: 2,
        className: "h-road",
        label: "Common"
    });

    // Plots 57 to 61
    let rowF = 20;
    for (let i = 57; i <= 61; i++) {
        placePlot(`${i}`, rowF, 24, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowF += 2;
    }
    // Plots 62 to 65
    let rowG = 28;
    for (let i = 62; i <= 65; i++) {
        placePlot(`${i}`, rowG, 26, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowG -= 2;
    }

    placeCell({
        row: "20 / 30",
        col: 28,
        span: 2,
        className: "vertical-road",
        label: "7.5 MTR ROAD"
    });

    // Plots 66 to 68
    let rowH = 24;
    for (let i = 66; i <= 68; i++) {
        placePlot(`${i}`, rowH, 30, dataMap[i] || dataMap[`${i}`], 2, 2);
        rowH += 2;
    }

    // Plot 69
    placePlot(
        `69`,
        26,
        32,
        dataMap[69] || dataMap['69'],
        4,
        4
    );

    // DIAGONAL ROAD TOP
    placeCell({
        row: "10 / 12",
        col: 1,
        span: 14,
        className: "vertical-road",
        label: ""
    });

    // Plots 27 to 36 (top row)
    for (let i = 1; i <= 20; i += 2) {
        const num = 26 + (i + 1) / 2;
        placePlot(`${num}`, 8, i, dataMap[num] || dataMap[`${num}`], 2, 2);
    }

    // ── Next plot row goes at row 29 (triangle narrows going up) ─────────────
}