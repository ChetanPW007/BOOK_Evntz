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
   SPEAKER FORM MODAL
   ============================ */
function SpeakerModal({ initial, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: "",
        role: "", // Designation
        dept: "",
        about: "", // Bio
        image: ""
    });
    const [loading, setLoading] = useState(false);
    const [imageInputType, setImageInputType] = useState('file'); // 'file' or 'url'

    useEffect(() => {
        if (initial) {
            setForm({
                name: initial.Name || "",
                role: initial.Designation || "",
                dept: initial.Department || "",
                about: initial.Bio || "",
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
            if (initial && initial.ID) {
                res = await apiPut(`/events/speakers/${initial.ID}`, form);
            } else {
                res = await apiPost("/events/speakers/add", form);
            }

            if (res && res.status === "success") {
                onSaved();
            } else {
                alert("Failed to save speaker");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving speaker");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: '400px' }}>
                <h3>{initial ? "Edit Speaker" : "Add Speaker"}</h3>

                <div className="admin-form-group">
                    <label>Name</label>
                    <input className="admin-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>Designation</label>
                    <input className="admin-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>Department</label>
                    <input className="admin-input" value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })} />
                </div>
                <div className="admin-form-group">
                    <label>Bio (About)</label>
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
                                onError={(e) => e.target.src = "/assets/speakers/default.jpg"}
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
export default function AdminSpeakers() {
    const [speakers, setSpeakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [editItem, setEditItem] = useState(null); // null = none, object = edit, "NEW" = new

    const fetchSpeakers = async () => {
        setLoading(true);
        const res = await apiGet("/events/speakers");
        if (res && res.data) {
            setSpeakers(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSpeakers();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this speaker?")) return;
        try {
            await apiDelete(`/events/speakers/delete/${id}`);
            fetchSpeakers();
        } catch {
            alert("Failed to delete");
        }
    };

    const filtered = speakers.filter(s =>
        s.Name?.toLowerCase().includes(search.toLowerCase()) ||
        s.Department?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Speakers Management</h1>
                <button className="admin-btn" onClick={() => setEditItem("NEW")}>+ Add Speaker</button>
            </div>

            <div className="admin-content">
                <input
                    className="admin-input"
                    placeholder="Search speakers..."
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
                                        src={s.Photo || "/assets/speakers/default.jpg"}
                                        alt={s.Name}
                                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }}
                                        onError={e => e.target.src = "/assets/speakers/default.jpg"}
                                    />
                                    <div>
                                        <h3 style={{ margin: 0, color: '#f9d56e' }}>{s.Name}</h3>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{s.Designation}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{s.Department}</p>
                                    </div>
                                </div>
                                <p style={{ fontSize: '13px', color: '#ccc', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {s.Bio || "No bio available."}
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                                    <button className="admin-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#444' }} onClick={() => setEditItem(s)}>Edit</button>
                                    <button className="admin-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#d9534f' }} onClick={() => handleDelete(s.ID)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editItem && (
                <SpeakerModal
                    initial={editItem === "NEW" ? null : editItem}
                    onClose={() => setEditItem(null)}
                    onSaved={() => {
                        setEditItem(null);
                        fetchSpeakers();
                    }}
                />
            )}
        </div>
    );
}
