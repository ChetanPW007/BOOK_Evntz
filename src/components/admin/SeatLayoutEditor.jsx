import { useState, useEffect } from "react";
import "./SeatLayoutEditor.css";

/* 
  layout structure: 
  {
    rows: 10,
    cols: 10,
    seats: [ 
       // flat array of logic strings or objects? 
       // let's stick to 2D matrix or sparse map 
       // "1-1" -> { type: 'standard', label: 'A1' }
    ],
    // But for a simple grid editor, a 2D array of status codes is easiest.
    // 0 = No Seat (gap), 1 = Standard, 2 = VIP, 3 = Blocked
    grid: [ [1,1,0,1,1], ... ]
  }
*/

export default function SeatLayoutEditor({ initialLayout, onChange, readOnly = false }) {
    const [rows, setRows] = useState(10);
    const [cols, setCols] = useState(15);
    const [grid, setGrid] = useState([]);
    const [selectedTool, setSelectedTool] = useState(1); // 0: Eraser, 1: Standard, 2: VIP, 3: Blocked

    // Init grid
    useEffect(() => {
        if (initialLayout) {
            try {
                const parsed = typeof initialLayout === 'string' ? JSON.parse(initialLayout) : initialLayout;
                if (parsed.grid) {
                    setRows(parsed.rows);
                    setCols(parsed.cols);
                    setGrid(parsed.grid);
                    return;
                }
            } catch (e) {
                console.error("Invalid layout JSON", e);
            }
        }
        // Default Init
        if (initialLayout && !initialLayout.grid) {
            // if initial is null/empty, creates fresh
            createEmptyGrid(10, 15);
        }
    }, [initialLayout]);

    // If no grid exists yet (first mount with no initial), create one
    useEffect(() => {
        if (grid.length === 0 && !initialLayout) {
            createEmptyGrid(rows, cols);
        }
    }, []);

    const createEmptyGrid = (r, c) => {
        const newGrid = [];
        for (let i = 0; i < r; i++) {
            const row = new Array(c).fill(0); // 0 means gap by default? Or 1? Let's say 1 (Standard) is default for ease
            newGrid.push(row);
        }
        setGrid(newGrid);
        notifyChange(newGrid, r, c);
    };

    const handleResize = () => {
        // Resize grid but keep existing data
        const newGrid = [];
        for (let i = 0; i < rows; i++) {
            const newRow = [];
            for (let j = 0; j < cols; j++) {
                if (grid[i] && grid[i][j] !== undefined) {
                    newRow.push(grid[i][j]);
                } else {
                    newRow.push(0); // New cells are gaps
                }
            }
            newGrid.push(newRow);
        }
        setGrid(newGrid);
        notifyChange(newGrid, rows, cols);
    };

    const notifyChange = (g, r, c) => {
        if (onChange) {
            onChange(JSON.stringify({ rows: r, cols: c, grid: g }));
        }
    };

    const handleCellClick = (rIndex, cIndex) => {
        if (readOnly) return;
        const newGrid = [...grid];
        // If clicking with same tool, maybe toggle to 0 (gap)? Or just paint.
        // Let's just paint.
        newGrid[rIndex] = [...newGrid[rIndex]]; // Copy row

        // Toggle logic: if already that type, erase it? No, explicit eraser is better for drawing.
        newGrid[rIndex][cIndex] = selectedTool;

        setGrid(newGrid);
        notifyChange(newGrid, rows, cols);
    };

    // Helper to compute total capacity
    const capacity = grid.flat().filter(x => x !== 0).length;

    return (
        <div className="seat-editor-container">
            {!readOnly && (
                <div className="seat-editor-controls">
                    <div className="dimension-inputs">
                        <label>Rows: <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} /></label>
                        <label>Cols: <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} /></label>
                        <button onClick={handleResize}>Set Size</button>
                    </div>

                    <div className="tool-select">
                        <button className={`tool-btn ${selectedTool === 1 ? "active" : ""}`} onClick={() => setSelectedTool(1)}>
                            💺 Standard
                        </button>
                        <button className={`tool-btn ${selectedTool === 2 ? "active vip" : ""}`} onClick={() => setSelectedTool(2)}>
                            👑 VIP
                        </button>
                        <button className={`tool-btn ${selectedTool === 3 ? "active blocked" : ""}`} onClick={() => setSelectedTool(3)}>
                            🚫 Blocked
                        </button>
                        <button className={`tool-btn ${selectedTool === 0 ? "active eraser" : ""}`} onClick={() => setSelectedTool(0)}>
                            ❌ Eraser (Gap)
                        </button>
                    </div>
                    <div className="stats">
                        Capacity: <strong>{capacity}</strong>
                    </div>
                </div>
            )}

            <div className="seat-grid-wrapper" style={{ '--cols': cols }}>
                {grid.map((row, rIndex) => (
                    <div key={rIndex} className="seat-row">
                        <div className="seat-row-label">{String.fromCharCode(65 + rIndex)}</div>
                        {row.map((cell, cIndex) => (
                            <div
                                key={cIndex}
                                className={`seat-cell type-${cell} ${readOnly ? 'readonly' : ''}`}
                                onClick={() => handleCellClick(rIndex, cIndex)}
                                title={`Row ${rIndex + 1}, Col ${cIndex + 1}`}
                            >
                                {cell !== 0 && (cIndex + 1)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {!readOnly && <div className="legend">
                <small>Click Set Size to reset dimensions. Click cells to paint.</small>
            </div>}
        </div>
    );
}
