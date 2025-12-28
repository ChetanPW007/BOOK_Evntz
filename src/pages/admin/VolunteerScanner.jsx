import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../utils/api";
import "./Admin.css";

export default function VolunteerScanner() {
  const [slots, setSlots] = useState([]); // List of { eventId, title, schedule, dateLabel, auditorium }
  const [activeAuditoriums, setActiveAuditoriums] = useState([]);

  // Selection State
  const [selectedAuditorium, setSelectedAuditorium] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState(""); // eventId_ISOString

  const [scanInput, setScanInput] = useState("");
  const [entryMode, setEntryMode] = useState("scan"); // "scan" or "manual"
  const [manualInput, setManualInput] = useState(""); // BookingID or USN
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTodaySlots() {
      try {
        const res = await apiGet("/events/");
        const allEvents = res.events || [];
        const today = new Date().toISOString().split("T")[0];
        console.log("🔍 Scanner Debug: Today's date =", today);
        console.log("🔍 Scanner Debug: Total events =", allEvents.length);
        const todaySlots = [];

        allEvents.forEach(ev => {
          let schedules = [];

          // Parse schedules
          if (ev.Schedules) {
            try {
              const parsed = typeof ev.Schedules === 'string' ? JSON.parse(ev.Schedules) : ev.Schedules;
              if (Array.isArray(parsed)) {
                schedules = parsed.map(s => {
                  if (s.Date && s.Time) return `${s.Date}T${s.Time}:00`;
                  return null;
                }).filter(Boolean);
              }
            } catch (e) { console.warn("Schedules parse error", e); }
          }

          // Fallback if no schedules or none matched
          if (schedules.length === 0 && ev.Date) {
            schedules.push(`${ev.Date}T${ev.Time || "00:00"}:00`);
          }

          console.log(`🔍 Event "${ev.Name}": schedules =`, schedules);

          // Filter for TODAY
          schedules.forEach(s => {
            const scheduleDate = s.split("T")[0]; // Extract just the date part
            console.log(`🔍 Comparing: "${scheduleDate}" === "${today}"`, scheduleDate === today);

            if (scheduleDate === today) {
              const timeLabel = new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
              // Extract ALL auditoriums for this event (comma separated)
              const audiList = (ev.Auditorium || "Main Auditorium").split(',').map(a => a.trim()).filter(Boolean);

              console.log(`✅ TODAY's event: "${ev.Name}" at auditoriums:`, audiList);

              audiList.forEach(audi => {
                todaySlots.push({
                  eventId: ev.ID,
                  eventName: ev.Name,
                  auditorium: audi,
                  schedule: s,
                  label: `${ev.Name} @ ${audi} (${timeLabel})`,
                  key: `${ev.ID}_${s}_${audi}` // Unique key including auditorium
                });
              });
            }
          });
        });

        console.log("🔍 Total today slots found:", todaySlots.length);
        setSlots(todaySlots);

        // Extract unique Auditoriums that have events today
        const uniqueAudis = [...new Set(todaySlots.map(s => s.auditorium))].sort();
        console.log("🔍 Unique auditoriums for today:", uniqueAudis);
        setActiveAuditoriums(uniqueAudis);

      } catch (err) {
        console.error("❌ Failed to load today's events:", err);
      }
    }
    loadTodaySlots();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedSlotKey) return alert("Please select an event first");
    if (!scanInput && !manualInput) return;

    const slot = slots.find(s => s.key === selectedSlotKey);
    if (!slot) return;

    setLoading(true);
    setLastResult(null);

    try {
      let usn = scanInput || manualInput;

      // If manual mode and input might be BookingID, resolve it
      if (entryMode === "manual" && usn) {
        // Check if it looks like a booking ID (starts with BK-)
        if (usn.toUpperCase().startsWith("BK-")) {
          try {
            const lookupRes = await apiPost("/bookings/lookup", {
              bookingId: usn,
              eventId: slot.eventId
            });

            if (lookupRes.status === "success" && lookupRes.data) {
              usn = lookupRes.data.USN;
            } else {
              setLastResult({ success: false, duplicate: false, msg: "Booking not found" });
              setLoading(false);
              return;
            }
          } catch (err) {
            setLastResult({ success: false, duplicate: false, msg: "Error looking up booking" });
            setLoading(false);
            return;
          }
        }
      }

      const payload = {
        eventId: slot.eventId,
        usn: usn,
        schedule: slot.schedule,
        auditorium: slot.auditorium,
        attended: true
      };

      const res = await apiPost("/attendance/mark", payload);

      if (res.status === "success") {
        setLastResult({ success: true, duplicate: false, msg: `Checked In: ${slot.eventName}`, user: usn });
        setScanInput("");
        setManualInput("");
      } else if (res.status === "duplicate") {
        // Duplicate scan - show RED error
        setLastResult({ success: false, duplicate: true, msg: res.message || "Already Entered!" });
      } else {
        setLastResult({ success: false, duplicate: false, msg: res.message || "Check-in failed" });
      }
    } catch (err) {
      // Check if it's a 409 duplicate error
      if (err.response && err.response.status === 409) {
        setLastResult({ success: false, duplicate: true, msg: "Already Entered!" });
      } else {
        setLastResult({ success: false, duplicate: false, msg: "Network error" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on selected auditorium
  const availableEvents = selectedAuditorium
    ? slots.filter(s => s.auditorium === selectedAuditorium)
    : [];

  return (
    <div className="fade-in">
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Volunteer Scanner</h1>
          <p className="admin-page-sub">Check-in attendees for events</p>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* STEP 1: AUDITORIUM SELECTOR */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>1. Select Auditorium (Today)</label>
          <select
            className="admin-actions select"
            style={{ width: "100%", padding: "12px", fontSize: "16px" }}
            value={selectedAuditorium}
            onChange={(e) => {
              setSelectedAuditorium(e.target.value);
              setSelectedSlotKey(""); // Reset event selection
            }}
          >
            <option value="">-- Select Auditorium --</option>
            {activeAuditoriums.map((audi) => (
              <option key={audi} value={audi}>{audi}</option>
            ))}
          </select>
          {activeAuditoriums.length === 0 && (
            <small style={{ color: "#d9534f" }}>No auditoriums have events today.</small>
          )}
        </div>

        {/* STEP 2: EVENT SELECTOR */}
        <div style={{ marginBottom: "24px", opacity: selectedAuditorium ? 1 : 0.5, pointerEvents: selectedAuditorium ? 'auto' : 'none' }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>2. Select Event</label>
          <select
            className="admin-actions select"
            style={{ width: "100%", padding: "12px", fontSize: "16px" }}
            value={selectedSlotKey}
            onChange={(e) => setSelectedSlotKey(e.target.value)}
            disabled={!selectedAuditorium}
          >
            <option value="">-- Select Event --</option>
            {availableEvents.length === 0 && <option value="">No events in this auditorium today</option>}
            {availableEvents.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* STEP 3: SCANNER */}
        {selectedSlotKey && (
          <div className="fade-in">
            {/* MODE TOGGLE */}
            <div style={{ marginBottom: "16px", display: "flex", gap: "10px" }}>
              <button
                className={entryMode === "scan" ? "admin-btn" : "admin-btn-secondary"}
                style={{ flex: 1, borderRadius: "10px" }}
                onClick={() => setEntryMode("scan")}
              >
                📷 QR Scan
              </button>
              <button
                className={entryMode === "manual" ? "admin-btn" : "admin-btn-secondary"}
                style={{ flex: 1, borderRadius: "10px" }}
                onClick={() => setEntryMode("manual")}
              >
                ✍️ Manual Entry
              </button>
            </div>

            {/* SCANNER VISUALIZATION (QR Mode Only) */}
            {entryMode === "scan" && (
              <div
                style={{
                  background: "#000",
                  borderRadius: "20px",
                  height: "300px",
                  position: "relative",
                  overflow: "hidden",
                  border: "2px solid #333",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Animated Scan Line */}
                <div
                  className="scan-line"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "4px",
                    background: "linear-gradient(90deg, transparent, #f9d56e, transparent)",
                    boxShadow: "0 0 15px #f9d56e",
                    animation: "scan 2s linear infinite",
                  }}
                />
                <style>
                  {`@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }`}
                </style>

                <p style={{ color: "#555", fontSize: "14px" }}>Camera / QR Input Active</p>
              </div>
            )}

            {/* INPUT AREA */}
            <form onSubmit={handleCheckIn} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input
                autoFocus
                type="text"
                placeholder={entryMode === "scan" ? "Scan QR or Enter USN..." : "Enter USN or BookingID..."}
                value={entryMode === "scan" ? scanInput : manualInput}
                onChange={(e) => entryMode === "scan" ? setScanInput(e.target.value) : setManualInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #333",
                  background: "#161616",
                  color: "#fff",
                  fontSize: "18px",
                }}
              />
              <button
                type="submit"
                className="admin-btn"
                disabled={loading}
                style={{ borderRadius: "12px" }}
              >
                {loading ? "..." : "CHECK IN"}
              </button>
            </form>

            {/* RESULT CARD */}
            {lastResult && (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  background: lastResult.success
                    ? "rgba(46, 204, 113, 0.2)"
                    : lastResult.duplicate
                      ? "rgba(231, 76, 60, 0.3)"
                      : "rgba(231, 76, 60, 0.2)",
                  border: lastResult.success
                    ? "1px solid #2ecc71"
                    : lastResult.duplicate
                      ? "2px solid #e74c3c"
                      : "1px solid #e74c3c",
                  textAlign: "center",
                  animation: "popIn 0.3s ease",
                }}
              >
                <h2 style={{
                  color: lastResult.success ? "#2ecc71" : "#e74c3c",
                  margin: "0 0 8px 0",
                  fontSize: lastResult.duplicate ? "24px" : "20px"
                }}>
                  {lastResult.success ? "✅ SUCCESS" : lastResult.duplicate ? "⛔ ALREADY ENTERED" : "❌ ERROR"}
                </h2>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: lastResult.duplicate ? "bold" : "normal" }}>
                  {lastResult.msg}
                </p>
                {lastResult.success && <p style={{ marginTop: "8px", fontSize: "13px", opacity: 0.8 }}>ID: {lastResult.user}</p>}
              </div>
            )}

            {/* DEMO QRs */}
            <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #333" }}>
              <h4 style={{ fontSize: '14px', color: '#777' }}>Test Codes (Copy & Paste)</h4>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: '#222', color: '#ccc', cursor: 'pointer' }} onClick={() => entryMode === "scan" ? setScanInput("U24E01CY022") : setManualInput("U24E01CY022")}>U24E01CY022</span>
                <span className="badge" style={{ background: '#222', color: '#ccc', cursor: 'pointer' }} onClick={() => entryMode === "scan" ? setScanInput("U24E01CY001") : setManualInput("U24E01CY001")}>U24E01CY001</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
