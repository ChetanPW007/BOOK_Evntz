import { useEffect, useState } from "react";
import QuickAddAuditoriumModal from '../../components/admin/QuickAddAuditoriumModal';
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import Loader from "../../components/Loader";
import Toggle from "../../components/ToggleSwitch";
import SeatLayoutEditor from "../../components/admin/SeatLayoutEditor";

/* =========================================
   HELPER: FILE TO BASE64
   ========================================= */
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

/* =========================================
   ADD PERSON MODAL
   ========================================= */
function AddPersonModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    dept: "", // or designation for speaker
    about: "",
    image: "", // base64
    contact: "" // for coordinator
  });
  const [loading, setLoading] = useState(false);

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
      const payload = type === "speaker"
        ? { ...form, role: form.dept } // map dept to role for speaker endpoint
        : form;

      const endpoint = type === "speaker" ? "/events/speakers/add" : "/events/coordinators/add";

      const res = await apiPost(endpoint, payload);
      if (res && res.status === "success") {
        alert(`${type} added successfully!`);
        onSaved();
        onClose();
      } else {
        alert("Failed to add.");
      }
    } catch {
      alert("Error adding person.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        <h3>Add New {type === "speaker" ? "Speaker" : "Coordinator"}</h3>

        <div className="admin-form-group">
          <label>Name</label>
          <input className="admin-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="admin-form-group">
          <label>{type === "speaker" ? "Designation / Role" : "Department"}</label>
          <input className="admin-input" value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })} />
        </div>

        {type === "coordinator" && (
          <div className="admin-form-group">
            <label>Contact (Optional)</label>
            <input className="admin-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
          </div>
        )}

        <div className="admin-form-group">
          <label>Photo</label>
          <input type="file" onChange={handleFile} accept="image/*" />
        </div>

        <div className="admin-form-group">
          <label>About</label>
          <textarea className="admin-textarea" value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
          <button className="admin-btn" style={{ background: '#333' }} onClick={onClose}>Cancel</button>
          <button className="admin-btn" onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   EVENT FORM COMPONENT
   ========================================= */
function EventForm({ initial, onClose, onSaved }) {
  // Pre-load metadata options
  const [auditoriumList, setAuditoriumList] = useState([]); // Full objects
  const [coordOpts, setCoordOpts] = useState([]);
  const [coordData, setCoordData] = useState([]); // Full coordinator objects
  const [speakerOpts, setSpeakerOpts] = useState([]); // Array of speaker names
  const [speakerData, setSpeakerData] = useState([]); // Full speaker objects

  // Add Person Modal State
  const [addPersonType, setAddPersonType] = useState(null); // 'speaker' or 'coordinator'

  // Form State
  const [form, setForm] = useState({
    ID: "",
    Name: "",
    Auditorium: "", // Legacy single auditorium (for backward compatibility)
    // Legacy Date/Time (will store first schedule for compat)
    Date: "",
    Time: "",
    College: "",
    Capacity: "",
    Poster: "",
    About: "",
    Visibility: "visible",
    Featured: "false", // New Field
    SeatLayout: null,
    // New Fields
    Schedules: [], // Array of {Date, Time}
    Duration: "", // e.g. "2h 30m"
    PublishAt: "" // Date-time string or empty
  });

  // Schedule Inputs
  const [newSchedule, setNewSchedule] = useState({ date: "", time: "" });
  const [conflicts, setConflicts] = useState([]); // List of conflict messages

  // State for poster input type: 'file' or 'url'
  const [posterType, setPosterType] = useState('file');

  // Speakers is an array of objects
  const [speakers, setSpeakers] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [auditoriums, setAuditoriums] = useState([]); // Array of selected auditoriums
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      // Fetch full auditoriums
      try {
        const a = await apiGet("/auditoriums/");
        if (a && a.status === "success" && Array.isArray(a.data)) {
          console.log("Auditoriums Loaded:", a.data); // Debug log
          setAuditoriumList(a.data);
        } else {
          console.warn("Auditorium API fallback:", a);
          setAuditoriumList([]);
        }
      } catch (e) {
        console.error("Auditorium Fetch Error:", e);
        setAuditoriumList([]);
      }

      const c = await apiGet("/events/coordinators");
      if (c && c.data) {
        setCoordData(c.data); // Store full objects
        // extract string names if they are objects, or just strings
        const names = c.data.map(i => (typeof i === 'string' ? i : i.Name));
        setCoordOpts(names);
      }

      const s = await apiGet("/events/speakers");
      if (s && s.data) {
        setSpeakerData(s.data); // Store full objects
        const names = s.data.map(i => (typeof i === 'string' ? i : i.Name));
        setSpeakerOpts(names);
      }
    }
    loadMeta();

    if (initial) {
      setForm({ ...initial });

      // Parse Schedules
      let initSchedules = [];
      if (initial.Schedules) {
        try { initSchedules = JSON.parse(initial.Schedules); } catch { }
      }
      // Fallback if no Schedules but legacy Date/Time exists
      if (initSchedules.length === 0 && initial.Date) {
        initSchedules.push({ Date: initial.Date, Time: initial.Time });
      }

      setForm(prev => ({
        ...prev,
        Schedules: initSchedules,
        Duration: initial.Duration || "",
        PublishAt: initial.PublishAt || ""
      }));

      // Parse coordinators if JSON, else wrap string
      try {
        const parsed = JSON.parse(initial.Coordinators);
        if (Array.isArray(parsed)) setCoordinators(parsed);
        else setCoordinators([{ name: initial.Coordinators, dept: "", about: "", image: "" }]);
      } catch {
        // likely just a string (old format)
        if (initial.Coordinators) {
          // Split comma-separated and convert to objects
          const names = initial.Coordinators.split(',').map(n => n.trim()).filter(Boolean);
          setCoordinators(names.map(name => ({ name, dept: "", about: "", image: "" })));
        }
      }

      // Parse speakers if JSON, else wrap string
      try {
        const parsed = JSON.parse(initial.Speakers);
        if (Array.isArray(parsed)) setSpeakers(parsed);
        else setSpeakers([{ name: initial.Speakers, dept: "", about: "", image: "" }]);
      } catch {
        // likely just a string
        if (initial.Speakers) {
          setSpeakers([{ name: initial.Speakers, dept: "", about: "", image: "" }]);
        }
      }

      // Initialize auditoriums array from Auditorium field (could be comma-separated)
      if (initial.Auditorium) {
        // Split by comma if multiple auditoriums
        const audiList = initial.Auditorium.split(',').map(a => a.trim()).filter(Boolean);
        setAuditoriums(audiList);
      }
    }
  }, [initial]);

  // Conflict Check
  const checkConflicts = async (currentSchedules, auditorium, duration) => {
    if (!currentSchedules.length || !auditorium) {
      setConflicts([]);
      return;
    }
    setValidating(true);
    try {
      const res = await apiPost("/events/check_conflict", {
        Auditorium: auditorium,
        Schedules: currentSchedules,
        Duration: duration,
        ExcludeEventID: form.ID
      });
      if (res.conflicts) {
        setConflicts(res.conflicts);
      }
    } catch (e) {
      console.error("Conflict check failed", e);
    } finally {
      setValidating(false);
    }
  };

  // Run validation when relevant fields change
  useEffect(() => {
    const timer = setTimeout(() => {
      checkConflicts(form.Schedules, form.Auditorium, form.Duration);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [form.Schedules, form.Auditorium, form.Duration, checkConflicts]);


  const addSchedule = () => {
    if (!newSchedule.date || !newSchedule.time) return;
    const updated = [...form.Schedules, { Date: newSchedule.date, Time: newSchedule.time }];
    setForm({ ...form, Schedules: updated });
    setNewSchedule({ date: "", time: "" });
  };

  const removeSchedule = (idx) => {
    const updated = [...form.Schedules];
    updated.splice(idx, 1);
    setForm({ ...form, Schedules: updated });
  };

  // Handle Auditorium Change

  const handleLayoutChange = (json) => {
    // Update capacity based on new layout
    try {
      const parsed = JSON.parse(json);
      const cap = parsed.grid.flat().filter(x => x !== 0).length;
      setForm(prev => ({ ...prev, SeatLayout: json, Capacity: cap }));
    } catch {
      setForm(prev => ({ ...prev, SeatLayout: json }));
    }
  };

  // --- Handlers ---

  const handleFile = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await toBase64(file);
    if (field === "Poster") {
      setForm({ ...form, Poster: base64 });
    }
  };

  const handleSpeakerFile = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await toBase64(file);
    const updated = [...speakers];
    updated[index].image = base64;
    setSpeakers(updated);
  };

  const handleCoordinatorFile = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await toBase64(file);
    const updated = [...coordinators];
    updated[index].image = base64;
    setCoordinators(updated);
  };

  const updateSpeaker = (index, key, val) => {
    const updated = [...speakers];
    updated[index][key] = val;

    // Auto-populate if name matches existing speaker
    if (key === 'name' && val) {
      const matchedSpeaker = speakerData.find(s =>
        s.Name && s.Name.toLowerCase() === val.toLowerCase()
      );

      if (matchedSpeaker) {
        // Auto-fill if fields are empty, but don't override existing data
        if (!updated[index].dept) {
          updated[index].dept = matchedSpeaker.Designation || matchedSpeaker.Department || "";
        }
        if (!updated[index].about) {
          updated[index].about = matchedSpeaker.Bio || "";
        }
        if (!updated[index].image) {
          updated[index].image = matchedSpeaker.Photo || "";
        }
      }
    }

    setSpeakers(updated);
  };

  const updateCoordinator = (index, key, val) => {
    const updated = [...coordinators];
    updated[index][key] = val;

    // Auto-populate if name matches existing coordinator
    if (key === 'name' && val) {
      const matchedCoord = coordData.find(c =>
        c.Name && c.Name.toLowerCase() === val.toLowerCase()
      );

      if (matchedCoord) {
        // Auto-fill if fields are empty, but don't override existing data
        if (!updated[index].dept) {
          updated[index].dept = matchedCoord.Department || "";
        }
        if (!updated[index].about) {
          updated[index].about = matchedCoord.About || "";
        }
        if (!updated[index].image) {
          updated[index].image = matchedCoord.Photo || "";
        }
      }
    }

    setCoordinators(updated);
  };

  const addSpeaker = () => {
    setSpeakers([...speakers, { name: "", dept: "", about: "", image: "" }]);
  };

  const addCoordinator = () => {
    setCoordinators([...coordinators, { name: "", dept: "", about: "", image: "" }]);
  };

  const removeSpeaker = (index) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const removeCoordinator = (index) => {
    setCoordinators(coordinators.filter((_, i) => i !== index));
  };

  const addAuditoriumToList = (audiName) => {
    if (!audiName || auditoriums.includes(audiName)) return;
    setAuditoriums([...auditoriums, audiName]);
  };

  const removeAuditoriumFromList = (audiName) => {
    setAuditoriums(auditoriums.filter(a => a !== audiName));
  };

  const submit = async () => {
    if (!form.Name) return alert("Event name is required");
    if (auditoriums.length === 0) return alert("Select at least one auditorium");
    if (form.Schedules.length === 0) return alert("Add at least one schedule (Date & Time)");
    if (conflicts.length > 0) return alert("Resolve scheduling conflicts before saving.");

    setLoading(true);

    // Sync legacy fields with first schedule
    const first = form.Schedules[0];
    // Use first auditorium as primary (for backward compatibility)
    // Save all auditoriums as comma-separated string
    const auditoriumsString = auditoriums.join(', ');

    const payload = {
      ...form,
      Auditorium: auditoriumsString, // Save ALL auditoriums (comma-separated)
      Date: first.Date,
      Time: first.Time,
      Coordinators: JSON.stringify(coordinators),
      Speakers: JSON.stringify(speakers),
    };

    try {
      let res;
      if (form.ID) {
        res = await apiPut(`/events/update/${form.ID}`, payload);
      } else {
        // Remove ID if empty so backend sees it as missing
        if (!payload.ID) delete payload.ID;
        res = await apiPost("/events/add", payload);
      }

      console.log("Submit Response:", res);

      if (res && (res.status === "success" || res.success)) {
        // Success
        await new Promise(r => setTimeout(r, 1000)); // Short delay to allow Sheet propagation
        if (onSaved) await onSaved();
        onClose();
      } else {
        alert("Failed to save event: " + (res.message || "Unknown Error"));
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("Error saving event");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{form.ID ? "Edit Event" : "Add Event"}</h3>

        <div className="admin-event-form" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>

          {/* Top Row: Basic Info */}
          <div className="admin-row-2">
            <div className="admin-form-group">
              <label>Event Name</label>
              <input
                className="admin-input"
                value={form.Name}
                onChange={e => setForm({ ...form, Name: e.target.value })}
                placeholder="e.g. Annual Day"
              />
            </div>
            <div className="admin-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Auditoriums</label>
                <button type="button"
                  className="admin-text-btn"
                  onClick={() => setShowAudiModal(true)}
                  style={{ fontSize: '0.8rem', color: 'var(--admin-accent)' }}>
                  + Create New
                </button>
              </div>

              {/* Selected Auditoriums Chips */}
              {auditoriums.length > 0 && (
                <div className="chip-container" style={{ marginBottom: '10px' }}>
                  {auditoriums.map((audi, idx) => {
                    const audiObj = auditoriumList.find(a => a.Name === audi);
                    return (
                      <div key={idx} className="chip">
                        {audi} {audiObj && `(${audiObj.Capacity} seats)`}
                        <button onClick={() => removeAuditoriumFromList(audi)}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Auditorium Selector */}
              <select
                className="admin-input"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addAuditoriumToList(e.target.value);
                    // Also set as primary auditorium (backward compat)
                    if (auditoriums.length === 0) {
                      const matched = auditoriumList.find(a => a.Name === e.target.value);
                      if (matched) {
                        setForm(prev => ({
                          ...prev,
                          Auditorium: e.target.value,
                          Capacity: matched.Capacity,
                          SeatLayout: matched.SeatLayout,
                        }));
                      }
                    }
                  }
                }}
              >
                <option value="">-- Add Auditorium --</option>
                {auditoriumList
                  .filter(a => !auditoriums.includes(a.Name))
                  .map((a, i) => (
                    <option key={i} value={a.Name}>
                      {a.Name} ({a.Capacity} Seats)
                    </option>
                  ))}
              </select>
              {auditoriumList.length === 0 && <small style={{ color: 'orange' }}>No auditoriums found. Please add one first.</small>}
              {auditoriums.length === 0 && <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>Select at least one auditorium</small>}
            </div>
          </div>

          {/* --- SCHEDULING SECTION --- */}
          <div style={{ background: '#1a1a1a', padding: 15, borderRadius: 8, marginBottom: 15, border: '1px solid #333' }}>
            <h4 style={{ marginTop: 0, color: '#f1c40f', marginBottom: '10px' }}>Event Schedule</h4>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' }}>
              <input type="date" className="admin-input" style={{ width: '140px' }} value={newSchedule.date} onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} />
              <input type="time" className="admin-input" style={{ width: '100px' }} value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} />
              <button className="admin-btn" style={{ padding: '8px 12px' }} onClick={addSchedule}>+ Add Slot</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                <label style={{ fontSize: '0.9em', color: '#ccc' }}>Duration:</label>
                <input className="admin-input" style={{ width: '100px' }} placeholder="2h 30m" value={form.Duration} onChange={e => setForm({ ...form, Duration: e.target.value })} />
              </div>
            </div>

            {/* List of slots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: '200px', overflowY: 'auto' }}>
              {form.Schedules.length === 0 && <div style={{ color: '#666', fontStyle: 'italic', padding: 10 }}>No slots added yet.</div>}
              {form.Schedules.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#222', borderRadius: 4, border: '1px solid #333' }}>
                  <span style={{ color: '#fff' }}>📅 {s.Date}</span>
                  <span style={{ color: '#fff' }}>⏰ {s.Time}</span>
                  {/* Conflict Indicator */}
                  {conflicts.some(c => c.Date === s.Date && c.Time === s.Time) ?
                    <span style={{ color: '#e74c3c', fontSize: '0.8em', fontWeight: 'bold' }}>❌ CONFLICT</span> :
                    <span style={{ color: '#2ecc71', fontSize: '0.8em', fontWeight: 'bold' }}>✅ AVAILABLE</span>
                  }
                  <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => removeSchedule(idx)}>🗑</button>
                </div>
              ))}
            </div>

            {conflicts.length > 0 && (
              <div style={{ marginTop: 10, padding: 10, background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: 4, fontSize: '0.9em' }}>
                <strong>⚠ Conflicts Detected:</strong>
                <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                  {conflicts.map((c, i) => <li key={i}><strong>{c.Date} {c.Time}</strong>: {c.Reason}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="admin-form-group">
            <label>Publish Schedule <small style={{ fontWeight: 'normal', color: '#888' }}>(Auto-publish at future date)</small></label>
            <input type="datetime-local" className="admin-input" value={form.PublishAt} onChange={e => setForm({ ...form, PublishAt: e.target.value })} />
          </div>

          <div className="admin-form-group">
            <label>Capacity</label>
            <input type="number" className="admin-input" value={form.Capacity} onChange={e => setForm({ ...form, Capacity: e.target.value })} />
          </div>

          {/* SEAT LAYOUT EDITOR */}
          <div className="admin-form-group" style={{ marginTop: 15, background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ margin: 0 }}>Seating Arrangement</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  {form.SeatLayout ? "Custom Layout Active" : "Using Default Capacity Logic"}
                </span>
                <Toggle
                  checked={!!form.SeatLayout}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Init new layout if empty
                      // Try to find auditorium default again or use empty
                      const match = auditoriumList.find(a => a.Name === form.Auditorium);
                      setForm({ ...form, SeatLayout: (match && match.SeatLayout) ? match.SeatLayout : JSON.stringify({ rows: 10, cols: 15, grid: [] }) });
                    } else {
                      // Clear layout
                      setForm({ ...form, SeatLayout: "" });
                    }
                  }}
                />
              </div>
            </div>

            {form.SeatLayout && (
              <div style={{ border: '1px solid #333', borderRadius: 8, padding: 10, background: '#111' }}>
                <SeatLayoutEditor
                  initialLayout={form.SeatLayout}
                  onChange={handleLayoutChange}
                />
              </div>
            )}
          </div>

          {/* POSTER */}
          <div className="admin-form-group">
            <label>Event Poster</label>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setPosterType('file')}
                style={{
                  padding: '5px 12px',
                  background: posterType === 'file' ? 'var(--admin-accent)' : '#333',
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
                className="admin-btn"
                onClick={() => setPosterType('url')}
                style={{
                  padding: '5px 12px',
                  background: posterType === 'url' ? 'var(--admin-accent)' : '#333',
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

            {posterType === 'file' ? (
              <div className="dropzone" style={{ padding: '10px', fontSize: '13px', border: '1px dashed #333', borderRadius: '8px' }}>
                <input type="file" onChange={(e) => handleFile(e, 'Poster')} accept="image/*" />
                {form.Poster && form.Poster.startsWith("data") ? (
                  <p style={{ color: '#0f0', margin: '5px 0' }}>Image Selected</p>
                ) : <p style={{ color: '#666' }}>Maximum size: 5MB</p>}
              </div>
            ) : (
              <input
                type="text"
                className="admin-input"
                placeholder="https://example.com/image.jpg"
                value={form.Poster || ""}
                onChange={(e) => setForm({ ...form, Poster: e.target.value })}
              />
            )}

            {form.Poster && (
              <div style={{ marginTop: '10px' }}>
                <img src={form.Poster} alt="Preview" style={{ height: '100px', borderRadius: '4px', border: '1px solid #444', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          <div className="admin-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Coordinators</label>
              <button
                type="button"
                onClick={() => setAddPersonType('coordinator')}
                style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                + Create New
              </button>
            </div>

            {coordinators.map((coord, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    className="admin-input"
                    list="coord-suggestions"
                    placeholder="Name"
                    value={coord.name}
                    onChange={e => updateCoordinator(idx, 'name', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="admin-input"
                    placeholder="Department"
                    value={coord.dept}
                    onChange={e => updateCoordinator(idx, 'dept', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <textarea
                  className="admin-textarea"
                  placeholder="About Coordinator"
                  value={coord.about}
                  onChange={e => updateCoordinator(idx, 'about', e.target.value)}
                  style={{ height: '60px', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="file" onChange={e => handleCoordinatorFile(e, idx)} style={{ fontSize: '12px', color: '#888' }} />
                  {coord.image && <img src={coord.image} alt="coord" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #444' }} />}
                  <button type="button" onClick={() => removeCoordinator(idx)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #d9534f', color: '#d9534f', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Remove Coordinator</button>
                </div>
              </div>
            ))}

            <datalist id="coord-suggestions">
              {coordOpts.map((c, i) => <option key={i} value={c} />)}
            </datalist>

            <button type="button" onClick={addCoordinator} className="admin-btn" style={{ width: '100%', background: '#222', border: '1px dashed #555', color: '#aaa' }}>+ Add Coordinator</button>
          </div>

          {/* ABOUT */}
          <div className="admin-form-group">
            <label>About Event</label>
            <textarea className="admin-textarea" value={form.About} onChange={e => setForm({ ...form, About: e.target.value })} />
          </div>

          {/* SPEAKERS SECTION */}
          <div className="admin-form-group" style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ color: '#f9d56e' }}>Speakers</label>
              <button
                type="button"
                onClick={() => setAddPersonType('speaker')}
                style={{ background: 'none', border: 'none', color: 'var(--admin-accent)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                + Create New
              </button>
            </div>

            {speakers.map((sp, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    className="admin-input"
                    list="speaker-suggestions"
                    placeholder="Name"
                    value={sp.name}
                    onChange={e => updateSpeaker(idx, 'name', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="admin-input"
                    placeholder="Dept / Role"
                    value={sp.dept}
                    onChange={e => updateSpeaker(idx, 'dept', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <textarea
                  className="admin-textarea"
                  placeholder="About Speaker"
                  value={sp.about}
                  onChange={e => updateSpeaker(idx, 'about', e.target.value)}
                  style={{ height: '60px', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="file" onChange={e => handleSpeakerFile(e, idx)} style={{ fontSize: '12px', color: '#888' }} />
                  {sp.image && <img src={sp.image} alt="sp" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #444' }} />}
                  <button type="button" onClick={() => removeSpeaker(idx)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #d9534f', color: '#d9534f', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Remove Speaker</button>
                </div>
              </div>
            ))}

            <datalist id="speaker-suggestions">
              {speakerOpts.map((s, i) => <option key={i} value={s} />)}
            </datalist>

            <button type="button" onClick={addSpeaker} className="admin-btn" style={{ width: '100%', background: '#222', border: '1px dashed #555', color: '#aaa' }}>+ Add Start Speaker</button>
          </div>

          {/* VISIBILITY & FEATURED TOGGLE */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Hide Event?</span>
              <Toggle
                checked={form.Visibility === "hidden"}
                onChange={(e) => setForm({ ...form, Visibility: e.target.checked ? "hidden" : "visible" })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#f9d56e' }}>🔥 Feature this?</span>
              <Toggle
                checked={form.Featured === "true" || form.Featured === true}
                onChange={(e) => setForm({ ...form, Featured: e.target.checked ? "true" : "false" })}
              />
            </div>

          </div>

        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: 'flex-end', borderTop: '1px solid #333', paddingTop: '15px' }}>
          <button className="admin-btn" style={{ background: '#333', color: '#fff' }} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="admin-btn" onClick={submit} disabled={loading}>
            {loading ? "Saving..." : "Save Event"}
          </button>
        </div>
      </div>
      {addPersonType && (
        <AddPersonModal
          type={addPersonType}
          onClose={() => setAddPersonType(null)}
          onSaved={async () => {
            const c = await apiGet("/events/coordinators");
            if (c && c.data) {
              setCoordData(c.data);
              setCoordOpts(c.data.map(i => (typeof i === 'string' ? i : i.Name)));
            }
            const s = await apiGet("/events/speakers");
            if (s && s.data) {
              setSpeakerData(s.data);
              setSpeakerOpts(s.data.map(i => (typeof i === 'string' ? i : i.Name)));
            }
          }}
        />
      )}
    </div>
  );
}

/* =========================================
   MAIN ADMIN PAGE
   ========================================= */
/* =========================================
   ATTENDEES DIALOG
   ========================================= */
function AttendeesDialog({ event, onClose }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttendees() {
      // Need an endpoint to get bookings for event: /bookings/event/:id
      const res = await apiGet(`/bookings/event/${event.ID || event.id}`);
      setAttendees(res.data || res || []);
      setLoading(false);
    }
    fetchAttendees();
  }, [event]);

  // Handle delete booking from this view
  const deleteBooking = async (bid) => {
    if (!confirm("Remove this attendee?")) return;
    await apiDelete(`/bookings/delete/${bid}`);
    setAttendees(attendees.filter(a => a.BookingID !== bid));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Attendees: {event.Name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {loading ? <Loader /> : (
          <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User / USN</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map(a => (
                  <tr key={a.BookingID}>
                    <td>
                      <div>{a.UserEmail || "Unknown"}</div>
                      <small style={{ color: '#888' }}>{a.USN}</small>
                    </td>
                    <td>{a.Seats}</td>
                    <td>
                      {a.Attended ? <span className="status-badge green">CHECKED IN</span> :
                        <span className={`status-badge ${a.Status === 'CONFIRMED' ? 'blue' : 'orange'}`}>{a.Status}</span>
                      }
                    </td>
                    <td>
                      <button onClick={() => deleteBooking(a.BookingID)} className="action-icon-btn delete">🗑</button>
                    </td>
                  </tr>
                ))}
                {attendees.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No attendees found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================
   MAIN ADMIN PAGE
   ========================================= */
export default function AdminEvents() {
  const [events, setEvents] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewAttendees, setViewAttendees] = useState(null); // Event object
  const [edit, setEdit] = useState(null);

  // Sorting State
  const [sortOrder, setSortOrder] = useState('none'); // 'none', 'newest', 'oldest'

  // Filter/Sort Logic
  const getSortedEvents = () => {
    if (!events) return [];
    let processed = [...events];

    if (sortOrder !== 'none') {
      processed.sort((a, b) => {
        const dateA = new Date(`${a.Date}T${a.Time || '00:00'}`);
        const dateB = new Date(`${b.Date}T${b.Time || '00:00'}`);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
    }
    return processed;
  };

  const sortedEvents = getSortedEvents();

  async function load() {
    const res = await apiGet("/events/");
    setEvents(res.events || res || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (!confirm("Delete this event?")) return;
    await apiDelete(`/events/delete/${id}`);
    await load();
  }

  async function toggleVisibility(id, currentVisibility) {
    const isVisible = currentVisibility === "visible";
    const newStatus = isVisible ? "hidden" : "visible";
    await apiPut(`/events/update/${id}`, { Visibility: newStatus });
    await load();
    await load();
  }

  const formatTime = (t) => {
    if (!t) return "";
    try {
      const [h, m] = t.split(':');
      const d = new Date();
      d.setHours(h, m);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return t; }
  };



  if (events === null) return <Loader />;

  return (
    <div className="fade-in">
      <div className="admin-topbar">
        <h1 className="admin-page-title">Events Management</h1>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* SORT DROPDOWN */}
          <select
            className="admin-actions select"
            style={{ padding: '10px', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="none">Sort: Default</option>
            <option value="newest">Date: Newest to Oldest</option>
            <option value="oldest">Date: Oldest to Newest</option>
          </select>

          <button
            className="admin-btn"
            onClick={() => {
              setEdit(null);
              setShowForm(true);
            }}
          >
            + Add New Event
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <EventForm
            initial={edit}
            onClose={() => setShowForm(false)}
            onSaved={load}
          />
        </div>
      )}

      {viewAttendees && (
        <AttendeesDialog event={viewAttendees} onClose={() => setViewAttendees(null)} />
      )}

      <div className="admin-events-grid">
        {sortedEvents.map((ev) => {
          const id = ev.ID || ev.id || ev.Id;
          const isVisible = (ev.Visibility === "visible");
          // Calculate registered count if available? 
          // (Usually requires API support, for now we just show generic meta)

          return (
            <div className="event-card" key={id} style={{ opacity: isVisible ? 1 : 0.7 }}>
              <div className="event-poster-wrapper">
                <img src={ev.Poster || "/assets/default.jpg"} alt={ev.Name} />
                <div className="event-poster-overlay"></div>
                {!isVisible && (
                  <div className="event-visibility-badge" style={{ background: '#e74c3c' }}>
                    HIDDEN
                  </div>
                )}
                {isVisible && (
                  <div className="event-visibility-badge" style={{ background: 'rgba(46, 204, 113, 0.8)' }}>
                    VISIBLE
                  </div>
                )}
              </div>

              <div className="event-card-content">
                <h3>{ev.Name}</h3>
                <div className="event-meta">{ev.Date} • {formatTime(ev.Time)}</div>
                <div className="event-meta" style={{ color: '#f9d56e' }}>{ev.Auditorium}</div>

                {/* Capacity Bar (Mock for now, or use real booked count if we fetched it) */}
                <div style={{ height: '4px', background: '#333', borderRadius: '2px', marginTop: '10px' }}>
                  <div style={{ width: '0%', height: '100%', background: '#f9d56e' }}></div>
                </div>
              </div>

              <div className="event-actions">
                <button className="action-icon-btn" title="View Attendees" onClick={() => setViewAttendees(ev)}>👥</button>
                <button className="action-icon-btn" title="Edit" onClick={() => { setEdit(ev); setShowForm(true); }}>✏️</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Toggle Visibility">
                  <Toggle
                    checked={isVisible}
                    onChange={() => toggleVisibility(id, ev.Visibility)}
                  />
                </div>
                <button className="action-icon-btn delete" title="Delete" onClick={() => remove(id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
