import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../utils/api";
import "./Admin.css";

export default function VolunteerScanner() {
  const [slots, setSlots] = useState([]); // List of { eventId, title, schedule, dateLabel }
  const [selectedSlotKey, setSelectedSlotKey] = useState(""); // eventId_ISOString
  const [scanInput, setScanInput] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTodaySlots() {
      try {
        const res = await apiGet("/events/");
        const allEvents = res.events || [];
        const today = new Date().toISOString().split("T")[0];
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

          // Filter for TODAY
          schedules.forEach(s => {
            if (s.startsWith(today)) {
              const timeLabel = new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              todaySlots.push({
                eventId: ev.ID,
                eventName: ev.Name,
                schedule: s,
                label: `${ev.Name} (${timeLabel})`,
                key: `${ev.ID}_${s}`
              });
            }
          });
        });

        setSlots(todaySlots);
        if (todaySlots.length > 0) setSelectedSlotKey(todaySlots[0].key);
      } catch (err) {
        console.error("Failed to load today's events", err);
      }
    }
    loadTodaySlots();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedSlotKey) return alert("Please select a slot first");
    if (!scanInput) return;

    const slot = slots.find(s => s.key === selectedSlotKey);
    if (!slot) return;

    setLoading(true);
    setLastResult(null);

    try {
      const payload = {
        eventId: slot.eventId,
        usn: scanInput,
        schedule: slot.schedule,
        attended: true
      };
      const res = await apiPost("/attendance/mark", payload);

      if (res.status === "success") {
        setLastResult({ success: true, msg: `Checked In: ${slot.eventName}`, user: scanInput });
      } else {
        setLastResult({ success: false, msg: res.message || "Check-in failed" });
      }
    } catch (err) {
      setLastResult({ success: false, msg: "Network error" });
    } finally {
      setLoading(false);
      setScanInput("");
    }
  };

  return (
    <div className="fade-in">
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Volunteer Scanner</h1>
          <p className="admin-page-sub">Check-in attendees for events</p>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* EVENT SELECTOR */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Select Today's Active Slot</label>
          <select
            className="admin-actions select"
            style={{ width: "100%", padding: "12px", fontSize: "16px" }}
            value={selectedSlotKey}
            onChange={(e) => setSelectedSlotKey(e.target.value)}
          >
            {slots.length === 0 ? (
              <option value="">-- No Events Scheduled Today --</option>
            ) : (
              slots.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* SCANNER VISUALIZATION */}
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

        {/* INPUT AREA */}
        <form onSubmit={handleCheckIn} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            autoFocus
            type="text"
            placeholder="Scan QR or Enter USN..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
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
            disabled={loading || !selectedEvent}
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
              background: lastResult.success ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)",
              border: `1px solid ${lastResult.success ? "#2ecc71" : "#e74c3c"}`,
              textAlign: "center",
              animation: "popIn 0.3s ease",
            }}
          >
            <h2 style={{ color: lastResult.success ? "#2ecc71" : "#e74c3c", margin: "0 0 8px 0" }}>
              {lastResult.success ? "SUCCESS" : "ERROR"}
            </h2>
            <p style={{ margin: 0, fontSize: "16px" }}>{lastResult.msg}</p>
            {lastResult.success && <p style={{ marginTop: "8px", fontSize: "13px", opacity: 0.8 }}>ID: {lastResult.user}</p>}
          </div>
        )}

        {/* DEMO QRs */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #333" }}>
          <h4 style={{ fontSize: '14px', color: '#777' }}>Test Codes (Copy & Paste)</h4>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: '#222', color: '#ccc', cursor: 'pointer' }} onClick={() => setScanInput("U24E01CY022")}>U24E01CY022</span>
            <span className="badge" style={{ background: '#222', color: '#ccc', cursor: 'pointer' }} onClick={() => setScanInput("U24E01CY001")}>U24E01CY001</span>
          </div>
        </div>
      </div>
    </div>
  );
}
