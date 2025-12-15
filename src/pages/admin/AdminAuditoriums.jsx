import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "../../utils/api";
import Loader from "../../components/Loader";
import SeatLayoutEditor from "../../components/admin/SeatLayoutEditor";
import "./Admin.css"; // Reuse general admin styles

export default function AdminAuditoriums() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // If null, means Adding
    const [form, setForm] = useState({
        Name: "",
        Capacity: 0,
        Description: "",
        Status: "Active",
        SeatLayout: null // JSON string or object
    });

    const loadData = async () => {
        setLoading(true);
        const res = await apiGet("/auditoriums/");
        if (res && res.data) {
            setData(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = () => {
        setEditingItem(null);
        setForm({
            Name: "",
            Capacity: 0,
            Description: "",
            Status: "Active",
            SeatLayout: '{"rows":10,"cols":15,"grid":[]}' // Default layout
        });
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setForm({
            Name: item.Name,
            Capacity: item.Capacity,
            Description: item.Description,
            Status: item.Status || "Active",
            SeatLayout: item.SeatLayout || '{"rows":10,"cols":15,"grid":[]}'
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.Name) return alert("Name is required");

        try {
            let res;
            if (editingItem) {
                res = await apiPut(`/auditoriums/update/${editingItem.Name}`, form);
            } else {
                res = await apiPost("/auditoriums/add", form);
            }

            if (res && res.status === "success") {
                alert("Saved successfully!");
                setShowModal(false);
                loadData(); // refresh
            } else {
                alert("Failed to save: " + (res?.message || "Unknown error"));
            }
        } catch (e) {
            alert("Error saving auditorium");
            console.error(e);
        }
    };

    const handleLayoutChange = (layoutJson) => {
        // Calculate capacity from layout
        try {
            const parsed = JSON.parse(layoutJson);
            const cap = parsed.grid.flat().filter(x => x !== 0).length;
            setForm(prev => ({ ...prev, SeatLayout: layoutJson, Capacity: cap }));
        } catch (e) {
            setForm(prev => ({ ...prev, SeatLayout: layoutJson }));
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="fade-in">
            <div className="admin-topbar">
                <h1 className="admin-page-title">Auditorium Management</h1>
                <button className="admin-btn" onClick={handleAdd}>+ Add Auditorium</button>
            </div>

            <div className="admin-events-grid">
                {/* Reusing grid class for consistency, or standard map */}
                {data.length === 0 && <p style={{ padding: 20 }}>No auditoriums found.</p>}
                {data.map((item, idx) => (
                    <div key={idx} className="event-card" style={{ minHeight: '200px' }}>
                        <div className="event-card-content">
                            <h3>{item.Name}</h3>
                            <div className="event-meta">Capacity: {item.Capacity} Seats</div>
                            <div className="event-meta" style={{ color: '#aaa' }}>{item.Description}</div>

                            <div style={{ marginTop: '10px' }}>
                                <span className={`status-badge ${item.Status === 'Active' ? 'green' : 'orange'}`}>
                                    {item.Status}
                                </span>
                            </div>
                        </div>
                        <div className="event-actions">
                            <button className="action-icon-btn" onClick={() => handleEdit(item)}>✏️ Edit</button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: '900px', width: '90vw' }}>
                        <h3>{editingItem ? "Edit Auditorium" : "Add New Auditorium"}</h3>

                        <div className="admin-row-2">
                            <div className="admin-form-group">
                                <label>Name</label>
                                <input
                                    className="admin-input"
                                    value={form.Name}
                                    onChange={e => setForm({ ...form, Name: e.target.value })}
                                    disabled={!!editingItem} // Name is ID?
                                />
                                {editingItem && <small style={{ color: '#666' }}>Name cannot be changed once created (used as ID)</small>}
                            </div>
                            <div className="admin-form-group">
                                <label>Status</label>
                                <select className="admin-input" value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value })}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label>Description (Optional)</label>
                            <input className="admin-input" value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })} />
                        </div>

                        <div className="admin-form-group">
                            <label>Seat Layout & Capacity ({form.Capacity})</label>
                            <div style={{ border: '1px solid #333', padding: '10px', borderRadius: '8px', background: '#222' }}>
                                <SeatLayoutEditor
                                    initialLayout={form.SeatLayout}
                                    onChange={handleLayoutChange}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button className="admin-btn" style={{ background: '#333' }} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="admin-btn" onClick={handleSave}>Save Auditorium</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
