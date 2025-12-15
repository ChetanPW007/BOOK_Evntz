import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import Loader from "../../components/Loader";

const toBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

/* ============================
   COORDINATOR FORM MODAL
   ================================ */
function CoordinatorModal({ initial, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: "",
        dept: "",
        contact: "",
        about: "",
        image: ""
    });
    const [loading, setLoading] = useState(false);
    const [imageInputType, setImageInputType] = useState('file'); // 'file' or 'url'

    useEffect(() => {
        if (initial) {
            setForm({
                name: initial.Name || "",
                dept: initial.Department || "",
                contact: initial.Contact || "",
                about: initial.About || "",
                image: initial.Photo || ""
            });
        }
    }, [initial]);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const base64 = await toBase64(file);
            setForm({ ...form, image: base64 });
        }
    };

    const submit = async () => {
        if (!form.name) return alert("Name is required");
        setLoading(true);
        try {
            let res;
            // Coordinators mostly use USN as key but generated TEMP IDs are also possible
            if (initial && initial.USN) {
                res = await apiPut(`/events/coordinators/${initial.USN}`, form);
            } else {
                res = await apiPost("/events/coordinators/add", form);
            }

            if (res && res.status === "success") {
                onSaved();
            } else {
                alert("Failed to save coordinator");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving coordinator");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: '400px' }}>
                <h3>{initial ? "Edit Coordinator" : "Add Coordinator"}</h3>

                <div className="admin-form-group">
                    <label>Name</label>
                    <input className="admin-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>Department</label>
                    <input className="admin-input" value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>Contact Info</label>
                    <input className="admin-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>About</label>
                    <textarea className="admin-textarea" value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>Photo</label>

                    {/* Toggle Buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setImageInputType('file')}
                            style={{
                                padding: '5px 12px',
                                background: imageInputType === 'file' ? 'var(--admin-accent)' : '#333',
                                border: 'none',
                                color: '#fff',
                                fontSize: '12px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Upload File
                        </button>
                        <button
                            type="button"
                            onClick={() => setImageInputType('url')}
                            style={{
                                padding: '5px 12px',
                                background: imageInputType === 'url' ? 'var(--admin-accent)' : '#333',
                                border: 'none',
                                color: '#fff',
                                fontSize: '12px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Enter URL
                        </button>
                    </div>

                    {/* Conditional Input */}
                    {imageInputType === 'file' ? (
                        <input type="file" onChange={handleFile} accept="image/*" />
                    ) : (
                        <input
                            type="text"
                            className="admin-input"
                            placeholder="https://example.com/image.jpg"
                            value={form.image || ""}
                            onChange={(e) => setForm({ ...form, image: e.target.value })}
                        />
                    )}

                    {/* Image Preview */}
                    {form.image && (
                        <div style={{ marginTop: '10px' }}>
                            <img
                                src={form.image}
                                alt="preview"
                                style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #444' }}
                                onError={(e) => e.target.src = "/assets/user.png"}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button className="admin-btn" style={{ background: '#333' }} onClick={onClose}>Cancel</button>
                    <button className="admin-btn" onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                </div>
            </div>
        </div>
    );
}

/* ============================
   MAIN PAGE
   ============================ */
export default function AdminCoordinators() {
    const [coords, setCoords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [editItem, setEditItem] = useState(null);

    const fetchCoords = async () => {
        setLoading(true);
        const res = await apiGet("/events/coordinators");
        if (res && res.data) {
            setCoords(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCoords();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this coordinator?")) return;
        try {
            await apiDelete(`/events/coordinators/delete/${id}`);
            fetchCoords();
        } catch {
            alert("Failed to delete");
        }
    };

    const filtered = coords.filter(s =>
        s.Name?.toLowerCase().includes(search.toLowerCase()) ||
        s.Department?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Coordinators</h1>
                <button className="admin-btn" onClick={() => setEditItem("NEW")}>+ Add Coordinator</button>
            </div>

            <div className="admin-content">
                <input
                    className="admin-input"
                    placeholder="Search coordinators..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: '400px', marginBottom: '20px' }}
                />

                {loading ? <Loader /> : (
                    <div className="admin-grid">
                        {filtered.map((s, i) => (
                            <div key={i} className="admin-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                    <img
                                        src={s.Photo || "/assets/user.png"}
                                        alt={s.Name}
                                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }}
                                        onError={e => e.target.src = "/assets/user.png"}
                                    />
                                    <div>
                                        <h3 style={{ margin: 0, color: '#f9d56e' }}>{s.Name}</h3>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{s.Department}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{s.Contact}</p>
                                    </div>
                                </div>
                                <p style={{ fontSize: '13px', color: '#ccc', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {s.About || "No details."}
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                                    <button className="admin-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#444' }} onClick={() => setEditItem(s)}>Edit</button>
                                    <button className="admin-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#d9534f' }} onClick={() => handleDelete(s.USN)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editItem && (
                <CoordinatorModal
                    initial={editItem === "NEW" ? null : editItem}
                    onClose={() => setEditItem(null)}
                    onSaved={() => {
                        setEditItem(null);
                        fetchCoords();
                    }}
                />
            )}
        </div>
    );
}
