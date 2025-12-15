import React, { useState } from 'react';
import { apiPost } from '../../utils/api';
import './QuickAddAuditoriumModal.css';

export default function QuickAddAuditoriumModal({ onClose, onSuccess }) {
    const [name, setName] = useState("");
    const [rows, setRows] = useState(10);
    const [cols, setCols] = useState(15);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        setLoading(true);
        setError("");

        // Generate Standard Layout (All seats type 1)
        const grid = [];
        for (let r = 0; r < rows; r++) {
            const rowArr = [];
            for (let c = 0; c < cols; c++) {
                rowArr.push(1); // Standard Seat
            }
            grid.push(rowArr);
        }

        // Construct Layout JSON
        const layoutObj = {
            rows: parseInt(rows),
            cols: parseInt(cols),
            grid: grid
        };

        const payload = {
            Name: name,
            Capacity: rows * cols,
            SeatLayout: JSON.stringify(layoutObj),
            Status: "Active",
            Description: "Quick Added via Event Form"
        };

        try {
            const res = await apiPost("/auditoriums/add", payload);
            if (res && res.status === "success") {
                onSuccess(payload); // Pass back the new object so parent can select it
            } else {
                setError(res.message || "Failed to add auditorium");
            }
        } catch (e) {
            setError("Server Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="qa-modal-overlay">
            <div className="qa-modal-content">
                <h3>Quick Add Auditorium</h3>

                {error && <div className="qa-error">{error}</div>}

                <div className="qa-group">
                    <label>Auditorium Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Mini Hall"
                        autoFocus
                    />
                </div>

                <div className="qa-row">
                    <div className="qa-group">
                        <label>Rows</label>
                        <input
                            type="number"
                            value={rows}
                            onChange={e => setRows(Number(e.target.value))}
                            min={1} max={50}
                        />
                    </div>
                    <div className="qa-group">
                        <label>Cols</label>
                        <input
                            type="number"
                            value={cols}
                            onChange={e => setCols(Number(e.target.value))}
                            min={1} max={50}
                        />
                    </div>
                </div>

                <div className="qa-info">
                    Capacity will be: <strong>{rows * cols}</strong>
                </div>

                <div className="qa-actions">
                    <button onClick={onClose} className="qa-cancel">Cancel</button>
                    <button onClick={handleSave} className="qa-save" disabled={loading}>
                        {loading ? "Saving..." : "Create & Select"}
                    </button>
                </div>
            </div>
        </div>
    );
}
