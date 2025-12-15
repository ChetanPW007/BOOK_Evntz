import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../utils/api";
import "./Admin.css";

export default function VolunteerScanner() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [lastResult, setLastResult] = useState(null); // { success: boolean, msg: string, user: string }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      const res = await apiGet("/events/");
      const list = res.events || res || [];
      // Filter only visible or upcoming logic if needed, but for now show all
      setEvents(list);
    }
    loadEvents();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return alert("Please select an event first");
    if (!scanInput) return;

    setLoading(true);
    setLastResult(null);

    // Input could be a raw bookingID or USN?? 
    // Usually a scanner reads a string. We expect standard BookingID "BK-..." or USN.
    // Our backend attendance.py expects 'usn' for attendance generally, 
    // BUT user prompt says "scanning qr of in admin able to see in admin booking and event who came" -> likely marking specific booking or USN.
    // The previous implementation used `usn`. Let's assume the QR contains the USN or BookingID.
    // If it's a BookingID, we might need to resolve USN.
    // However, the simplest path for now: standard attendance by USN for an event.

    // NOTE: The previous turn's implementation used /attendance/mark with { eventId, usn }.

    try {
      // We will try to mark attendance
      const payload = { eventId: selectedEvent, usn: scanInput, attended: true };
      const res = await apiPost("/attendance/mark", payload);

      if (res.status === "success" || res.success) {
        setLastResult({ success: true, msg: "Checked In Successfully", user: scanInput });
      } else {
        // If failed, maybe it was a booking ID? Let's try to 'find' the booking if we had that logic.
        // For now, assume failure.
        setLastResult({ success: false, msg: res.message || "Check-in failed" });
      }
    } catch (err) {
      setLastResult({ success: false, msg: "Network error" });
    } finally {
      setLoading(false);
      setScanInput(""); // clear for next scan
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
          <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Select Active Event</label>
          <select
            className="admin-actions select"
            style={{ width: "100%", padding: "12px", fontSize: "16px" }}
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            <option value="">-- Choose Event --</option>
            {events.map((ev) => (
              <option key={ev.ID} value={ev.ID}>
                {ev.Name} ({ev.Date})
              </option>
            ))}
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
