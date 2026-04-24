// @ts-nocheck

export function renderDholeraHomes3Layout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    grid.style.gridTemplateColumns = "repeat(40, 1fr)";
    grid.style.gridTemplateRows = "repeat(34, 1fr)";
    grid.style.aspectRatio = "40 / 34";

    const padPlotNumber = (num) => String(num).padStart(3, '0');
    const LEFT_SINGLE_COL = 1;
    const BLOCK1_LEFT = 3; const BLOCK1_RIGHT = 4;
    const ROAD1 = 5;
    const BLOCK2_LEFT = 6; const BLOCK2_RIGHT = 7;
    const ROAD2 = 8;
    const BLOCK3_LEFT = 9; const BLOCK3_RIGHT = 10;
    const ROAD3 = 11;
    const BLOCK4_LEFT = 12; const BLOCK4_RIGHT = 13;
    const ROAD4 = 14;
    const BLOCK5_LEFT = 15; const BLOCK5_RIGHT = 16;
    const ROAD5 = 17;
    const BLOCK6_LEFT = 18; const BLOCK6_RIGHT = 19;

    const leftRoad = document.createElement("div");
    leftRoad.className = "vertical-road secondary-road left-road";
    leftRoad.innerHTML = `<span>7.50 MT WIDE ROAD</span>`;
    leftRoad.style.gridColumn = "2 / 3";
    leftRoad.style.gridRow = "1 / 30";
    grid.appendChild(leftRoad);

    const rightRoad = document.createElement("div");
    rightRoad.className = "vertical-road main-road";
    rightRoad.innerHTML = `<span>12.00 MT WIDE ROAD</span>`;
    rightRoad.style.gridColumn = "20 / 22";
    rightRoad.style.gridRow = "1 / 30";
    grid.appendChild(rightRoad);

    const commonPlot2 = document.createElement("div");
    commonPlot2.className = "common-plot common-plot-large";
    commonPlot2.innerHTML = `<span>COMMON PLOT - 2</span>`;
    commonPlot2.style.gridColumn = "1 / 2";
    commonPlot2.style.gridRow = "1 / 6";
    grid.appendChild(commonPlot2);

    [319, 318, 317, 316, 315, 314, 313, 312, 311, 310, 309].forEach((p, i) => placePlot(p, 6 + i, LEFT_SINGLE_COL, dataMap[p]));
    [308, 307, 306, 305, 304, 303, 302, 301, 300, 299, 298, 297, 296, 295].forEach((p, i) => placePlot(p, 18 + i, LEFT_SINGLE_COL, dataMap[p]));

    [270, 271, 272, 273].forEach((p, i) => placePlot(p, 1 + i, BLOCK1_LEFT, dataMap[p]));
    [269, 268, 267, 266].forEach((p, i) => placePlot(p, 1 + i, BLOCK1_RIGHT, dataMap[p]));
    [220, 221, 222, 223].forEach((p, i) => placePlot(p, 1 + i, BLOCK2_LEFT, dataMap[p]));
    [219, 218, 217, 216].forEach((p, i) => placePlot(p, 1 + i, BLOCK2_RIGHT, dataMap[p]));
    [170, 171, 172, 173].forEach((p, i) => placePlot(p, 1 + i, BLOCK3_LEFT, dataMap[p]));
    [169, 168, 167, 166].forEach((p, i) => placePlot(p, 1 + i, BLOCK3_RIGHT, dataMap[p]));
    [121, 122, 123].forEach((p, i) => placePlot(p, 2 + i, BLOCK4_LEFT, dataMap[padPlotNumber(p)]));
    [120, 119, 118].forEach((p, i) => placePlot(p, 2 + i, BLOCK4_RIGHT, dataMap[padPlotNumber(p)]));
    [73, 74, 75].forEach((p, i) => placePlot(p, 2 + i, BLOCK5_LEFT, dataMap[padPlotNumber(p)]));
    [72, 71, 70].forEach((p, i) => placePlot(p, 2 + i, BLOCK5_RIGHT, dataMap[padPlotNumber(p)]));
    [25, 26, 27].forEach((p, i) => placePlot(p, 2 + i, BLOCK6_LEFT, dataMap[padPlotNumber(p)]));
    [24, 23, 22].forEach((p, i) => placePlot(p, 2 + i, BLOCK6_RIGHT, dataMap[padPlotNumber(p)]));

    placeCell({ row: 5, col: 2, span: 18, className: "h-road", label: "7.50 MT WIDE ROAD" });

    [274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284].forEach((p, i) => placePlot(p, 6 + i, BLOCK1_LEFT, dataMap[p]));
    [265, 264, 263, 262, 261, 260, 259, 258, 257, 256, 255].forEach((p, i) => placePlot(p, 6 + i, BLOCK1_RIGHT, dataMap[p]));
    [224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234].forEach((p, i) => placePlot(p, 6 + i, BLOCK2_LEFT, dataMap[p]));
    [215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205].forEach((p, i) => placePlot(p, 6 + i, BLOCK2_RIGHT, dataMap[p]));
    [174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184].forEach((p, i) => placePlot(p, 6 + i, BLOCK3_LEFT, dataMap[p]));
    [165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155].forEach((p, i) => placePlot(p, 6 + i, BLOCK3_RIGHT, dataMap[p]));
    [124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134].forEach((p, i) => placePlot(p, 6 + i, BLOCK4_LEFT, dataMap[p]));
    [117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107].forEach((p, i) => placePlot(p, 6 + i, BLOCK4_RIGHT, dataMap[p]));
    [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86].forEach((p, i) => placePlot(p, 6 + i, BLOCK5_LEFT, dataMap[padPlotNumber(p)]));
    [69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59].forEach((p, i) => placePlot(p, 6 + i, BLOCK5_RIGHT, dataMap[padPlotNumber(p)]));
    [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38].forEach((p, i) => placePlot(p, 6 + i, BLOCK6_LEFT, dataMap[padPlotNumber(p)]));
    [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11].forEach((p, i) => placePlot(p, 6 + i, BLOCK6_RIGHT, dataMap[padPlotNumber(p)]));

    placeCell({ row: 17, col: 2, span: 18, className: "h-road wide-road", label: "9.00 MT WIDE ROAD" });

    [285, 286, 287, 288, 289, 290, 291, 292, 293, 294].forEach((p, i) => placePlot(p, 18 + i, BLOCK1_LEFT, dataMap[p]));
    [254, 253, 252, 251, 250, 249, 248, 247, 246, 245].forEach((p, i) => placePlot(p, 18 + i, BLOCK1_RIGHT, dataMap[p]));
    [235, 236, 237, 238, 239, 240, 241, 242, 243, 244].forEach((p, i) => placePlot(p, 18 + i, BLOCK2_LEFT, dataMap[p]));
    [204, 203, 202, 201, 200, 199, 198, 197, 196, 195].forEach((p, i) => placePlot(p, 18 + i, BLOCK2_RIGHT, dataMap[p]));
    [185, 186, 187, 188, 189, 190, 191, 192, 193, 194].forEach((p, i) => placePlot(p, 18 + i, BLOCK3_LEFT, dataMap[p]));
    [154, 153, 152, 151, 150, 149, 148, 147, 146, 145].forEach((p, i) => placePlot(p, 18 + i, BLOCK3_RIGHT, dataMap[p]));
    [135, 136, 137, 138, 139, 140, 141, 142, 143, 144].forEach((p, i) => placePlot(p, 18 + i, BLOCK4_LEFT, dataMap[padPlotNumber(p)]));
    [106, 105, 104, 103, 102, 101, 100, 99, 98, 97].forEach((p, i) => placePlot(p, 18 + i, BLOCK4_RIGHT, dataMap[padPlotNumber(p)]));
    [87, 88, 89, 90, 91, 92, 93, 94, 95, 96].forEach((p, i) => placePlot(p, 18 + i, BLOCK5_LEFT, dataMap[padPlotNumber(p)]));
    [58, 57, 56, 55, 54, 53, 52, 51, 50, 49].forEach((p, i) => placePlot(p, 18 + i, BLOCK5_RIGHT, dataMap[padPlotNumber(p)]));
    [39, 40, 41, 42, 43, 44, 45, 46, 47, 48].forEach((p, i) => placePlot(p, 18 + i, BLOCK6_LEFT, dataMap[padPlotNumber(p)]));
    [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].forEach((p, i) => placePlot(p, 18 + i, BLOCK6_RIGHT, dataMap[padPlotNumber(p)]));

    placeCell({ row: 30, col: 9, span: 5, className: "common-plot", label: "COMMON PLOT - 1" });

    [ROAD1, ROAD2, ROAD3, ROAD4, ROAD5].forEach(colPos => {
        const internalRoad = document.createElement("div");
        internalRoad.className = "vertical-road internal-road";
        internalRoad.innerHTML = `<span>7.50 MT</span>`;
        internalRoad.style.gridColumn = `${colPos} / ${colPos + 1}`;
        internalRoad.style.gridRow = "1 / 30";
        grid.appendChild(internalRoad);
    });

    const leftEntry = document.createElement("div");
    leftEntry.className = "entry-marker";
    leftEntry.innerHTML = `<div class="entry-label">ENTRY</div><div class="entry-arrow">▲</div>`;
    leftEntry.style.gridColumn = "2 / 3";
    leftEntry.style.gridRow = "30 / 32";
    grid.appendChild(leftEntry);

    const rightEntry = document.createElement("div");
    rightEntry.className = "entry-marker";
    rightEntry.innerHTML = `<div class="entry-label">ENTRY</div><div class="entry-arrow">▲</div>`;
    rightEntry.style.gridColumn = "20 / 22";
    rightEntry.style.gridRow = "30 / 32";
    grid.appendChild(rightEntry);
}
