# Layout Customization Guide

This guide explains how to build and customize your project layouts using the CSS Grid system in your layout renderer files (like `AeroTown2Layout.ts`). 

---

## 1. Setting Up the Base Grid

The very first step in your renderer function is defining the grid size. This sets up the "canvas" for your layout.

```typescript
// Define how many columns and rows your grid has
grid.style.gridTemplateColumns = "repeat(32, 1fr)"; // 32 columns
grid.style.gridTemplateRows = "repeat(14, 1fr)";    // 14 rows

// Adjust the aspect ratio based on rows/cols so it renders proportionally
grid.style.aspectRatio = "32 / 14"; // Width / Height

// Set gaps/paddings between all blocks (plots, roads, gardens)
grid.style.gap = "3px"; // Increase for wider spacing between plots
```

---

## 2. Adding a Road (or Custom Block) Snippet

You use the `placeCell` function to render roads, gardens, common areas, or any custom block that isn't a directly mapped plot.

### Horizontal Road Snippet
```typescript
placeCell({
    row: "12 / 14",    // Starts at row 12, ends BEFORE row 14 (so it occupies rows 12 & 13)
    col: 1,            // Starts at column 1
    span: 32,          // Spans across 32 columns (width)
    className: "h-road", // Use CSS classes like "h-road", "h-road wide-road"
    label: "9.0 MTR ROAD"
});
```

### Vertical Road Snippet
```typescript
placeCell({
    row: "1 / 10",     // Starts at row 1, ends before 10
    col: 8,            // Placed exactly in column 8
    span: 1,           // Spans 1 column wide
    className: "vertical-road", 
    label: "7.5 MTR ROAD"
});
```

---

## 3. Manipulating Width and Height of Blocks

Width and height are controlled by how you define the **row ranges** and **column spans**:

- **Height (Rows):** In `placeCell`, `row: "12 / 15"` means the block starts at grid line 12 and stops at grid line 15, meaning it's **3 units tall** (12, 13, 14).
- **Width (Columns):** In `placeCell`, `col: 5` and `span: 4` means it starts at column 5 and stretches for 4 columns (ending at column 8).

---

## 4. Adding Plot Blocks

Plots are placed using the `placePlot` function. This binds the visual block on the grid to actual project data (status, price, buyer).

```typescript
// Parameters: id, startRow, startCol, dataMapEntry, rowSpan, colSpan
placePlot(
    `R1`,              // 1. The ID of the plot (must match your Supabase data exactly)
    30,                // 2. Starting Row
    1,                 // 3. Starting Column
    dataMap[`R1`],     // 4. Data binding (always pass dataMap[`YourPlotID`])
    1,                 // 5. Height (how many rows it spans)
    1                  // 6. Width (how many columns it spans)
);
```

### Pro-Tip: Adding Plots in Bulk
If you have a row of plots (e.g., R1 through R10), you can place them using a `for` loop to save time:

```typescript
// Places R1 to R10 horizontally starting at row 5, col 1
for (let i = 1; i <= 10; i++) {
    // i represents the column index since we are moving horizontally
    placePlot(`R${i}`, 5, i, dataMap[`R${i}`], 1, 1);
}
```

---

## 5. Customizing Labels and Styling

You can inject custom CSS directly into any `placeCell` block to override defaults, change fonts, or align text.

```typescript
placeCell({
    row: "13 / 14",
    col: 1,
    span: 10,
    className: "garden",
    label: "CENTRAL PARK",
    style: { 
        backgroundColor: "#bbf7d0", // Light green background
        color: "#166534",           // Dark green text
        border: "2px solid #22c55e",// Green border
        fontWeight: "bold",
        fontSize: "0.8em",
        textAlign: "center",        // "left", "right", or "center"
        paddingTop: "5px"
    }
});
```

---

## 6. Managing Gaps and Padding

### Global Grid Gaps
The `grid.style.gap = "3px"` property controls the universal spacing between *every single block* (plots, roads, gardens) in the layout. 
- If the entire map feels too tightly packed, increase this to `"4px"` or `"5px"`. 
- Note: This affects *everything* globally.

### Managing Spacing Between Specific Plot Blocks (Margins)
Since plots are placed based on grid coordinates, if you want a larger gap (like a small alleyway or separation margin) between two groups of plots, you simply **skip a row or column** when placing them.

*Example (Leaving a 1-column gap):*
```typescript
// Plots 1-5 in columns 1 through 5
for (let i = 1; i <= 5; i++) {
    placePlot(`R${i}`, 11, i, dataMap[`R${i}`], 1, 2);
}

// SKIP column 6 to create a gap!

// Plots 6-10 start at column 7
for (let i = 6; i <= 10; i++) {
    placePlot(`R${i}`, 11, i + 1, dataMap[`R${i}`], 1, 2); 
}
```

### Inner Padding for Roads and Common Areas
For `placeCell` blocks, you can add inner padding via the `style` object to prevent text from touching the edges:
```typescript
style: { paddingLeft: "10px", paddingTop: "5px" }
```

### Inner Padding for Plots
The `placePlot` function usually relies on the global `.plot` CSS class for its inner padding and text alignment. If you need to change how the text looks inside the plot boxes, you should update the CSS file (e.g., `layout.css` or `globals.css`) for the `.plot` class rather than modifying it here in the layout map file.
