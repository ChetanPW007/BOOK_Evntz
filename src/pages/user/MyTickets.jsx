// src/pages/user/MyTickets.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyTickets.css";

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // CURRENT LOGGED-IN USER
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const usn = currentUser?.usn || "";

  // Helper: Format Show Time
  const formatShowTime = (timeStr) => {
    if (!timeStr || timeStr === "—") return "TBA";
    try {
      // If ISO string (2025-12-16T...)
      if (timeStr.includes("T")) {
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return timeStr;
        // Return Date + Time (12h)
        return d.toLocaleString('en-US', {
          month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true
        });
      }
      // If HH:MM (14:30)
      if (timeStr.includes(":")) {
        const [h, m] = timeStr.split(":");
        if (!isNaN(h)) {
          const d = new Date();
          d.setHours(h, m);
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      return timeStr;
    } catch { return timeStr; }
  };

  useEffect(() => {
    async function fetchTickets() {
      if (!usn) {
        setTickets([]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/bookings/user/${encodeURIComponent(usn)}`);
        const text = await res.text();

        let data = null;
        try {
          data = JSON.parse(text);
        } catch (err) {
          console.error("Non-JSON server response:", text);
          setTickets([]);
          return;
        }

        if (data.success && Array.isArray(data.data)) {
          setTickets([...data.data].reverse()); // newest → oldest
        } else {
          setTickets([]);
        }
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [usn]);

  /* --------------------------------------------------
      LOADING STATE
  -------------------------------------------------- */
  if (loading) {
    return (
      <div className="mytickets-empty">
        <h2>Loading Tickets…</h2>
      </div>
    );
  }

  /* --------------------------------------------------
      EMPTY TICKET LIST
  -------------------------------------------------- */
  if (!tickets.length) {
    return (
      <div className="mytickets-empty">
        <h2>No Tickets Found</h2>
        <p>You haven't booked any events yet.</p>
      </div>
    );
  }

  /* --------------------------------------------------
      TICKETS AVAILABLE – SHOW LIST
  -------------------------------------------------- */
  return (
    <div className="mytickets-container">
      <h1 className="mt-title">🎟 My Tickets</h1>

      <div className="mt-list">
        {tickets.map((t, i) => {
          // Handle various casing from backend
          const id = t.bookingId || t.BookingID || t.id || `BK-${i}`;
          // Fallback for poster
          const poster = t.poster || t.Poster || t.eventImage || "/assets/default.jpg";

          return (
            <div key={id} className="mt-card">
              {/* Poster */}
              <img
                src={poster}
                alt={t.eventName || "Event Poster"}
                className="mt-poster"
                onError={(e) => (e.currentTarget.src = "/assets/default.jpg")}
              />

              {/* Ticket info */}
              <div className="mt-info">
                <h2>{t.eventName || "Untitled Event"}</h2>

                <p>
                  <strong>Show: </strong>
                  {formatShowTime(t.schedule || t.show)}
                </p>

                <p>
                  <strong>Seat: </strong>
                  {Array.isArray(t.seats || t.Seats)
                    ? (t.seats || t.Seats).join(", ")
                    : (typeof (t.seats || t.Seats) === "string" ? (t.seats || t.Seats) : "—")}
                </p>

                <p>
                  <strong>Booked: </strong>
                  {t.Timestamp
                    ? new Date(Number(t.Timestamp) * 1000).toLocaleString()
                    : (t.bookedOn || new Date().toLocaleString())}
                </p>

                <p>
                  <strong>USN: </strong>
                  {t.usn || "—"}
                </p>

                {/* Auditorium Display */}
                {(t.auditorium || t.Auditorium || t.venue) && (
                  <p>
                    <strong>Venue: </strong>
                    {t.auditorium || t.Auditorium || t.venue}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-actions">
                <button
                  className="mt-view-btn"
                  onClick={() => navigate(`/ticket/${encodeURIComponent(id)}`, { state: { ticket: t } })}
                >
                  View Ticket
                </button>

                <button
                  className="mt-open-btn"
                  onClick={() =>
                    window.open(`${window.location.origin}/ticket/${encodeURIComponent(id)}`, "_blank")
                  }
                >
                  Open (New Tab)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
}
