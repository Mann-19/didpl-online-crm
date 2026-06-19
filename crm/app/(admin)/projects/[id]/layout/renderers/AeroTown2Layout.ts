// @ts-nocheck

export function renderAeroTown2Layout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    // Establishing a base grid (can be adjusted as we add more elements)
    grid.style.gridTemplateColumns = "repeat(54, 1fr)";
    grid.style.gridTemplateRows = "repeat(35, 1fr)"; // Increased to 35
    grid.style.aspectRatio = "54 / 35";

    // ── MAIN ROAD (Top Horizontal) ──────────────────────────────────────────
    placeCell({ 
        row: "1 / 3",
        col: 1, 
        span: 54, 
        className: "h-road wide-road", 
        label: "MAIN ROAD" 
    });

    // ── SHOPS (Left side of 12 mt road) ─────────────────────────────────────
    // Made deeper (span 3 instead of 2)
    for (let i = 0; i <= 12; i++) {
        const shopNum = 22 - i;
        placePlot(`S${shopNum}`, 3, 5 + (i * 2), dataMap[`S${shopNum}`], 3, 2);
    }

    // ── 12 MT ROAD ──────────────────────────────────────────────────────────
    // Placed between S10 and S9 (span 6), reaching down to row 32
    placeCell({
        row: "3 / 32",
        col: 31,
        span: 6, 
        className: "vertical-road wide-road",
        label: "12-mt road"
    });

    // ── SHOPS (Right side of 12 mt road) ────────────────────────────────────
    // Made deeper (span 3 instead of 2)
    for (let i = 0; i <= 8; i++) {
        const shopNum = 9 - i;
        placePlot(`S${shopNum}`, 3, 37 + (i * 2), dataMap[`S${shopNum}`], 3, 2);
    }

    // ── 7.5 MT ROAD & PLOT R1 ───────────────────────────────────────────────
    // Shifted from row 5 to row 6
    placeCell({
        row: "6 / 8",
        col: 1,
        span: 50,
        className: "h-road",
        label: "7.5 mt road"
    });

    placePlot(`R1`, 6, 51, dataMap[`R1`], 2, 4);

    // ── 6 MT VERTICAL ROAD ──────────────────────────────────────────────────
    // Shifted from row 7 to row 8
    placeCell({
        row: "8 / 18",
        col: 10,
        span: 3,
        className: "vertical-road",
        label: "6 mt road"
    });

    // ── PLOT R79 ────────────────────────────────────────────────────────────
    placePlot(`R79`, 8, 13, dataMap[`R79`], 4, 2);

    // ── PLOTS R78, R77, R76 ─────────────────────────────────────────────────
    placePlot(`R78`, 8, 15, dataMap[`R78`], 2, 2);
    placePlot(`R77`, 10, 15, dataMap[`R77`], 2, 2);
    placePlot(`R76`, 12, 15, dataMap[`R76`], 2, 2);

    // ── 7.5 MT VERTICAL ROAD (First internal) ───────────────────────────────
    placeCell({
        row: "8 / 16",
        col: 17,
        span: 3,
        className: "vertical-road",
        label: "7.5 mt road"
    });

    // ── PLOTS R72, R73, R74, R75 ────────────────────────────────────────────
    placePlot(`R72`, 8, 20, dataMap[`R72`], 2, 2);
    placePlot(`R73`, 10, 20, dataMap[`R73`], 2, 2);
    placePlot(`R74`, 12, 20, dataMap[`R74`], 2, 2);
    placePlot(`R75`, 14, 20, dataMap[`R75`], 2, 2);

    // ── PLOTS R71, R70, R69, R68, R67 ───────────────────────────────────────
    placePlot(`R71`, 8, 22, dataMap[`R71`], 2, 2);
    placePlot(`R70`, 10, 22, dataMap[`R70`], 2, 2);
    placePlot(`R69`, 12, 22, dataMap[`R69`], 2, 2);
    placePlot(`R68`, 14, 22, dataMap[`R68`], 2, 2);
    placePlot(`R67`, 16, 22, dataMap[`R67`], 2, 2);

    // ── 7.5 MT VERTICAL ROAD (Second internal) ──────────────────────────────
    placeCell({
        row: "8 / 22",
        col: 24,
        span: 3,
        className: "vertical-road",
        label: "7.5 mt road"
    });

    // ── PLOTS R60 TO R66 ────────────────────────────────────────────────────
    for (let i = 0; i <= 6; i++) {
        const plotNum = 60 + i;
        placePlot(`R${plotNum}`, 8 + (i * 2), 27, dataMap[`R${plotNum}`], 2, 2);
    }

    // ── PLOTS R59 TO R52 ────────────────────────────────────────────────────
    for (let i = 0; i <= 7; i++) {
        const plotNum = 59 - i;
        placePlot(`R${plotNum}`, 8 + (i * 2), 29, dataMap[`R${plotNum}`], 2, 2);
    }

    // ── PLOTS R47 TO R51 ────────────────────────────────────────────────────
    for (let i = 0; i <= 4; i++) {
        const plotNum = 47 + i;
        placePlot(`R${plotNum}`, 8 + (i * 2), 37, dataMap[`R${plotNum}`], 2, 2);
    }

    // ── PLOTS R46 TO R41 ────────────────────────────────────────────────────
    for (let i = 0; i <= 5; i++) {
        const plotNum = 46 - i;
        placePlot(`R${plotNum}`, 8 + (i * 2), 39, dataMap[`R${plotNum}`], 2, 2);
    }

    // ── 7.5 MT VERTICAL ROAD (Right internal) ───────────────────────────────
    placeCell({
        row: "8 / 20",
        col: 41,
        span: 3,
        className: "vertical-road",
        label: "7.5 mt road"
    });

    // ── GARDEN BLOCK ────────────────────────────────────────────────────────
    // Small extension exactly under R51
    placeCell({
        row: "18 / 20",
        col: 37,
        span: 2,
        className: "garden",
        label: "",
        style: { backgroundColor: "#bbf7d0", borderBottom: "none" }
    });

    // Main merged garden block below R51, R41, R40
    placeCell({
        row: "20 / 30", // Ends exactly where R24 ends
        col: 37,
        span: 9,
        className: "garden",
        label: "GARDEN",
        style: { backgroundColor: "#bbf7d0", color: "#166534", fontWeight: "bold", border: "2px solid #22c55e" }
    });

    // ── PLOTS R35 TO R40 ────────────────────────────────────────────────────
    for (let i = 0; i <= 5; i++) {
        const plotNum = 35 + i;
        placePlot(`R${plotNum}`, 8 + (i * 2), 44, dataMap[`R${plotNum}`], 2, 2);
    }

    // ── PLOTS R34 TO R24 ────────────────────────────────────────────────────
    for (let i = 0; i <= 10; i++) {
        const plotNum = 34 - i;
        placePlot(`R${plotNum}`, 8 + (i * 2), 46, dataMap[`R${plotNum}`], 2, 2);
    }

    // ── 7.5 MT VERTICAL ROAD (Rightmost internal) ───────────────────────────
    placeCell({
        row: "8 / 32", // Extended down to connect to bottom road
        col: 48,
        span: 3,
        className: "vertical-road",
        label: "7.5 mt road"
    });

    // ── VERTICAL RESIDENTIAL COLUMN (R2 - R13) ──────────────────────────────
    for (let i = 2; i <= 13; i++) {
        const rowPos = 8 + ((i - 2) * 2);
        placePlot(`R${i}`, rowPos, 51, dataMap[`R${i}`], 2, 4);
    }

    // ── BOTTOM HORIZONTAL ROAD ──────────────────────────────────────────────
    placeCell({
        row: "32 / 34",
        col: 37,
        span: 18,
        className: "h-road",
        label: "7.5 mt road"
    });

    // ── HORIZONTAL RESIDENTIAL ROW (R23 - R14) ──────────────────────────────
    for (let i = 0; i <= 9; i++) {
        const plotNum = 23 - i;
        placePlot(`R${plotNum}`, 34, 35 + (i * 2), dataMap[`R${plotNum}`], 2, 2);
    }
}