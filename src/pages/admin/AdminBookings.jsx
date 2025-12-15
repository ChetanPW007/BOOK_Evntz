import { useEffect, useState } from "react";
import { apiGet, apiDelete, apiPut, apiPost } from "../../utils/api";
import Loader from "../../components/Loader";

/* =========================================
   NEW BOOKING DIALOG (Reusable)
   ========================================= */

function NewBookingDialog({ onClose, onSaved }) {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    userMs: "",
    eventId: "",
    seats: 1, // Fallback for manual
    selectedSeats: [] // Array of seat IDs
  });
  const [loading, setLoading] = useState(false);
  const [eventBookings, setEventBookings] = useState([]); // For visual map
  const [selectedEventObj, setSelectedEventObj] = useState(null); // Full event details

  useEffect(() => {
    async function loadData() {
      const e = await apiGet("/events/");
      setEvents(e.events || e || []);
      const u = await apiGet("/users/");
      setUsers(u.users || u || []);
    }
    loadData();
  }, []);

  // Fetch bookings when event changes
  useEffect(() => {
    if (form.eventId) {
      const ev = events.find(e => e.ID === form.eventId);
      setSelectedEventObj(ev);

      // Fetch bookings to show availability
      apiGet(`/bookings/event/${form.eventId}`).then(res => {
        setEventBookings(res.data || []);
      });
    } else {
      setSelectedEventObj(null);
      setEventBookings([]);
    }
  }, [form.eventId, events]);

  // Helper to check availability
  const isSeatTaken = (seatId) => {
    return eventBookings.some(b => {
      const s = String(b.Seats || "").split(",");
      return s.map(x => x.trim()).includes(seatId);
    });
  };

  // Render Visual Grid
  const renderSeatMap = () => {
    if (!selectedEventObj || !selectedEventObj.SeatLayout) return null;

    try {
      const { rows, cols, grid } = JSON.parse(selectedEventObj.SeatLayout);
      const mapElements = [];
      let rowLabelIdx = 0;

      for (let r = 0; r < rows; r++) {
        const rowCells = [];
        let seatNum = 1;

        // Check if row has seats
        if (!grid[r].some(x => x !== 0)) continue;

        const label = String.fromCharCode(65 + rowLabelIdx);
        rowLabelIdx++;

        for (let c = 0; c < cols; c++) {
          const type = grid[r][c];
          if (type === 0) {
            // Gap
            rowCells.push(<div key={`${r}-${c}`} style={{ width: 25, height: 25, visibility: 'hidden' }} />);
          } else {
            const seatId = `${label}${seatNum}`;
            const taken = isSeatTaken(seatId);
            const selected = form.selectedSeats.includes(seatId);
            const blocked = type === 3;
            const vip = type === 2; // Assuming 2 is VIP

            let bg = '#333';
            let cursor = 'pointer';

            if (blocked) { bg = '#111'; cursor = 'not-allowed'; }
            else if (taken) { bg = '#555'; cursor = 'not-allowed'; }
            else if (selected) { bg = '#00dd00'; } // Green for selected
            else if (vip) { bg = '#ffd700'; color: '#000'; } // Gold for VIP

            // VIP override for selected state (keep green but maybe add border?)
            if (selected) bg = '#00dd00';

            rowCells.push(
              <div
                key={seatId}
                onClick={() => {
                  if (!taken && !blocked) {
                    // Toggle Selection Logic
                    setForm(prev => {
                      const exists = prev.selectedSeats.includes(seatId);
                      let mid = [];
                      if (exists) mid = prev.selectedSeats.filter(s => s !== seatId);
                      else mid = [...prev.selectedSeats, seatId];
                      return { ...prev, selectedSeats: mid };
                    });
                  }
                }}
                title={`Seat ${seatId} ${vip ? '(VIP)' : ''}`}
                style={{
                  width: 25, height: 25,
                  borderRadius: 4,
                  background: bg,
                  color: (selected || vip) ? '#000' : '#aaa',
                  fontWeight: (selected || vip) ? 'bold' : 'normal',
                  fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: cursor,
                  border: '1px solid #444',
                  boxShadow: vip ? '0 0 5px rgba(255, 215, 0, 0.3)' : 'none'
                }}
              >
                {seatNum}
              </div>
            );
            seatNum++;
          }
        }
        mapElements.push(
          <div key={r} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ width: 20, textAlign: 'right', marginRight: 5, fontSize: 10, color: '#888' }}>{label}</div>
            {rowCells}
          </div>
        );
      }
      return (
        <div style={{
          marginTop: 10, padding: 10, border: '1px solid #333', background: '#000', borderRadius: 8,
          overflowX: 'auto', maxHeight: 300
        }}>
          <div style={{ textAlign: 'center', marginBottom: 5, fontSize: 11, color: '#666' }}>SCREEN</div>
          {mapElements}
        </div>
      );
    } catch (e) {
      return <div style={{ color: 'red' }}>Error parsing layout</div>;
    }
  };

  const submit = async () => {
    if (!form.userMs || !form.eventId) return alert("Select User and Event");

    // Use selected seats ARRAY if layout active
    let finalSeats = form.seats; // Fallback to number
    if (selectedEventObj?.SeatLayout && form.selectedSeats.length > 0) {
      finalSeats = form.selectedSeats.join(","); // Send "A1,A2,A3"
    } else if (selectedEventObj?.SeatLayout && form.selectedSeats.length === 0) {
      return alert("Please select at least one seat.");
    }

    setLoading(true);
    try {
      const res = await apiPost("/bookings/add", {
        USN: form.userMs,
        EventID: form.eventId,
        Seats: finalSeats, // Can be "5" or "A1,A2"
        Status: "CONFIRMED"
      });
      if (res.status === "success" || res.bookingId) {
        onSaved();
        onClose();
      } else {
        alert(res.message || "Booking Failed");
      }
    } catch (err) {
      alert("Error creating booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <h3>Create Manual Booking</h3>
        <div className="admin-event-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label>Select User (By USN)</label>
              <input list="user-list" value={form.userMs} onChange={e => setForm({ ...form, userMs: e.target.value })} placeholder="Search USN..." />
              <datalist id="user-list">
                {users.map(u => <option key={u.USN} value={u.USN}>{u.Name} ({u.USN})</option>)}
              </datalist>
            </div>
            <div>
              <label>Select Event</label>
              <select value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })} style={{ width: '100%', padding: '10px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}>
                <option value="">-- Choose Event --</option>
                {events.map(ev => <option key={ev.ID} value={ev.ID}>{ev.Name} ({ev.Date})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label>Seat Selection {form.selectedSeats.length > 0 ? `(${form.selectedSeats.length} Selected)` : ''}</label>
            {selectedEventObj?.SeatLayout ? (
              <>
                {renderSeatMap()}
                <div style={{ marginTop: 5, fontSize: 12, color: '#aaa' }}>
                  Click seats to select multiple. {form.selectedSeats.length > 0 && <span>Selected: <strong>{form.selectedSeats.join(", ")}</strong></span>}
                </div>
              </>
            ) : (
              <input type="number" min="1" max="100" value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} placeholder="Number of seats" />
            )}
          </div>
          <button onClick={submit} disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   EVENT BOOKINGS DETAIL VIEW
   ========================================= */
function EventBookingsList({ event, onBack }) {
  const [bookings, setBookings] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  async function load() {
    // Optimized: Fetch only for this event
    const res = await apiGet(`/bookings/event/${event.ID}`);
    setBookings(res.data || res || []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // Poll every 5 seconds for "Real-time" sync
    return () => clearInterval(interval);
  }, [event]);

  async function updateStatus(id, status) {
    if (!confirm(`Mark as ${status}?`)) return;
    await apiPut(`/bookings/update_status/${id}`, { status });
    load();
  }

  async function remove(id) {
    if (!confirm("Delete booking completely?")) return;
    await apiDelete(`/bookings/delete/${id}`);
    load();
  }

  if (!bookings) return <Loader />;

  const filtered = bookings.filter(b => {
    const matchSearch = (b.USN?.toLowerCase().includes(search.toLowerCase())) ||
      (b.BookingID?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "All" || b.Status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="fade-in">
      <button onClick={onBack} className="btn-back" style={{ marginBottom: '20px', position: 'relative', top: 0, left: 0 }}>← Back to Events</button>

      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0 }}>{event.Name} <span style={{ fontSize: '0.6em', opacity: 0.7, fontWeight: 400 }}>({event.Date})</span></h2>
          <span className="admin-page-sub">{filtered.length} bookings found</span>
        </div>
        {/* CSV Export could go here */}
      </div>

      <div className="admin-actions">
        <input placeholder="Search USN, Booking ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '300px' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Seats</th>
              <th>Attendance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const status = b.Status || "PENDING";
              let badgeClass = "orange";
              if (status === "CONFIRMED") badgeClass = "green";
              if (status === "REJECTED") badgeClass = "red";
              const isAttended = (b.Attended || "").toLowerCase() === "yes";

              return (
                <tr key={b.BookingID}>
                  <td className="admin-muted" style={{ fontFamily: 'monospace' }}>{b.BookingID}</td>
                  <td>
                    <div>{b.UserEmail || b.user || "User"}</div>
                    <small className="admin-muted">{b.USN}</small>
                  </td>
                  <td>
                    {b.Seats}
                  </td>
                  <td>
                    {isAttended ? (
                      <span className="status-badge green">CHECKED IN</span>
                    ) : (
                      <span className="status-badge gray" style={{ opacity: 0.5 }}>Not Arrived</span>
                    )}
                  </td>
                  <td><span className={`status-badge ${badgeClass}`}>{status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {status === "PENDING" && (
                        <>
                          <button className="status-badge green" onClick={() => updateStatus(b.BookingID, "CONFIRMED")}>✓</button>
                          <button className="status-badge red" onClick={() => updateStatus(b.BookingID, "REJECTED")}>✕</button>
                        </>
                      )}
                      <button className="action-icon-btn delete" onClick={() => remove(b.BookingID)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan="6" className="admin-muted" style={{ textAlign: 'center', padding: '20px' }}>No matching bookings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================
   MAIN ADMIN BOOKINGS PAGE
   ========================================= */
export default function AdminBookings() {
  const [events, setEvents] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const res = await apiGet("/events/");
    setEvents(res.events || res || []);
  }

  useEffect(() => { load(); }, []);

  if (events === null) return <Loader />;

  // Create New Booking Handler
  const handleNewBooking = () => {
    // Reload logic if needed, or just close dialog
    load();
  };

  // If event selected, show detail view
  if (selectedEvent) {
    return <EventBookingsList event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  return (
    <div className="fade-in">
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Bookings by Event</h1>
          <span className="admin-page-sub">Select an event to view/manage bookings</span>
        </div>
        <button className="admin-btn" onClick={() => setShowNew(true)}>+ Manual Booking</button>
      </div>

      {showNew && <NewBookingDialog onClose={() => setShowNew(false)} onSaved={() => { load(); /* force refresh logic logic could happen inside dialog too */ }} />}

      <div className="admin-events-grid">
        {events.map((ev) => {
          const id = ev.ID || ev.id;
          const auditoriumField = ev.Auditorium || ev.auditorium || "";
          const auditoriums = auditoriumField.includes(',')
            ? auditoriumField.split(',').map(a => a.trim()).filter(Boolean)
            : [auditoriumField];
          const hasMultipleAuditoriums = auditoriums.length > 1;

          return (
            <div className="event-card" key={id} style={{ cursor: hasMultipleAuditoriums ? 'default' : 'pointer' }} onClick={!hasMultipleAuditoriums ? () => setSelectedEvent(ev) : undefined}>
              <div className="event-poster-wrapper" style={{ height: '180px' }}>
                <img src={ev.Poster || "/assets/default.jpg"} alt={ev.Name} />
                {!hasMultipleAuditoriums && (
                  <div className="event-poster-overlay">
                    <span style={{ color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      View Bookings
                    </span>
                  </div>
                )}
              </div>
              <div className="event-card-content">
                <h3>{ev.Name}</h3>
                <div className="event-meta">{ev.Date} • {ev.Time}</div>

                {hasMultipleAuditoriums ? (
                  <>
                    <div className="event-meta" style={{ color: '#f9d56e', marginBottom: '10px' }}>Select Auditorium:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditoriums.map((audi, idx) => (
                        <button
                          key={idx}
                          className="admin-btn"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'linear-gradient(135deg, rgba(250, 227, 140, 0.15), rgba(249, 213, 110, 0.1))',
                            border: '1.5px solid rgba(250, 227, 140, 0.3)',
                            color: '#fae38c',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(250, 227, 140, 0.25), rgba(249, 213, 110, 0.2))';
                            e.target.style.borderColor = 'rgba(250, 227, 140, 0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(250, 227, 140, 0.15), rgba(249, 213, 110, 0.1))';
                            e.target.style.borderColor = 'rgba(250, 227, 140, 0.3)';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent({ ...ev, Auditorium: audi });
                          }}
                        >
                          🏛️ {audi}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="event-meta" style={{ color: '#f9d56e' }}>{ev.Auditorium}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
