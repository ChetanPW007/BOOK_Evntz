// src/pages/user/History.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import "./History.css";

export default function History() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  // ------------------ Backend URL ------------------
  const backendRoot = "https://turbo007.pythonanywhere.com/api";

  // ------------------ HELPER ------------------
  // ------------------ HELPER ------------------
  const formatTime12h = (t) => {
    if (!t || t === "—" || t === "TBA") return t;
    try {
      // If ISO string (2025-12-16T...)
      if (typeof t === 'string' && t.includes("T")) {
        const d = new Date(t);
        if (isNaN(d.getTime())) return t;
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      // If HH:MM
      if (typeof t === 'string' && t.includes(':')) {
        const [h, m] = t.split(':');
        if (h && m) {
          const d = new Date();
          d.setHours(h, m);
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      return t;
    } catch { return t; }
  };

  // ------------------ FETCH BOOKINGS BY USN ------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchBookings() {
      setLoading(true);
      setFetchError("");
      setBookings([]);

      if (!currentUser?.usn) {
        setFetchError("User not logged in or USN missing.");
        setLoading(false);
        return;
      }

      try {
        const usn = encodeURIComponent(String(currentUser.usn).trim());
        const res = await fetch(`${backendRoot}/bookings/user/${usn}`, {
          method: "GET",
        });

        const contentType = res.headers.get("content-type") || "";

        // Accept both JSON and text that is JSON shaped.
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          // try parse anyway
          try {
            const parsed = JSON.parse(text);
            if (!parsed || !Array.isArray(parsed.data)) {
              throw new Error("Server returned non-JSON / unexpected payload.");
            }
            if (cancelled) return;
            normalizeAndSet(parsed.data);
            return;
          } catch (err) {
            throw new Error(
              `Server did not return JSON. Response: ${text || res.status}`
            );
          }
        }

        const data = await res.json();

        if (!data || !data.success || !Array.isArray(data.data)) {
          // If backend returns {success:false} or non-array - treat as empty
          if (data && data.success === false && data.message) {
            throw new Error(data.message);
          }
          setBookings([]);
          setLoading(false);
          return;
        }

        if (cancelled) return;
        normalizeAndSet(data.data);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        if (!cancelled) {
          setFetchError(
            err?.message ||
            "Failed to fetch bookings. Please check your backend or network."
          );
          setBookings([]);
          setLoading(false);
        }
      }
    }



    function normalizeAndSet(rawArr) {
      // Normalize each booking to a consistent shape
      const normalized = rawArr.map((b) => {
        const bookingId =
          b.bookingId ||
          b.BookingID ||
          b.BookingId ||
          b.id ||
          b.ID ||
          b.Booking_Id ||
          String(Date.now()) + Math.random().toString(36).slice(2, 6);

        const eventName =
          b.eventName || b.event || b.Event || b.title || b.EventName || "Event";

        const eventId = b.eventId || b.EventID || b.EventId || b.event || b.Event;

        // seats: allow ["A1","A2"] or "A1,A2" or unexpected
        let seats = [];
        if (Array.isArray(b.seats)) seats = b.seats;
        else if (typeof b.seats === "string") {
          seats = b.seats.split(",").map((s) => s.trim()).filter(Boolean);
        } else if (Array.isArray(b.Seats)) seats = b.Seats;
        else if (typeof b.Seats === "string") {
          seats = b.Seats.split(",").map((s) => s.trim()).filter(Boolean);
        }

        // poster fallback
        const poster = b.poster || b.Poster || b.eventImage || b.image || "/assets/default.jpg";

        // timestamp/bookedOn
        const bookedOn =
          b.Timestamp ||
          b.bookedOn ||
          b.timestamp ||
          b.ts ||
          b.BookedOn ||
          b.time ||
          b.createdAt ||
          null;

        const schedule = b.Schedule || b.schedule || b.show || b.Time || "—";
        const eventDate = b.Date || b.date || ""; // if available from enrichment
        const auditorium = b.Auditorium || b.auditorium || b.venue || ""; // Add auditorium

        // user / usn field
        const usnVal = b.usn || b.USN || b.user || b.userId || b.userIdentifier || currentUser?.usn || "";

        return {
          ...b,
          bookingId,
          eventName,
          eventId,
          seats,
          poster,
          bookedOn,
          schedule,
          eventDate,
          auditorium, // Include auditorium
          usn: usnVal,
        };
      });

      setBookings(normalized);
      setLoading(false);
    }

    fetchBookings();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.usn, backendRoot]);

  // ------------------ SORT BOOKINGS ------------------
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const ta = new Date(a.bookedOn || 0).getTime();
      const tb = new Date(b.bookedOn || 0).getTime();
      return tb - ta;
    });
  }, [bookings]);

  // ------------------ FILTER BOOKINGS ------------------
  const filteredBookings = useMemo(() => {
    if (filter === "all") return sortedBookings;
    const now = Date.now();
    return sortedBookings.filter((b) => {
      const ts = new Date(b.bookedOn || now).getTime();
      if (filter === "today") {
        const start = new Date().setHours(0, 0, 0, 0);
        return ts >= start;
      }
      if (filter === "week") return ts >= now - 7 * 86400000;
      if (filter === "month") return ts >= now - 30 * 86400000;
      return true;
    });
  }, [sortedBookings, filter]);

  // ------------------ GENERATE QR ------------------
  const generateQR = (b) => {
    const payload = {
      bookingId: b.bookingId,
      eventId: b.eventId || b.event,
      eventName: b.eventName,
      auditorium: b.auditorium, // Include venue
      seats: b.seats,
      user: b.usn,
      bookedOn: b.bookedOn,
    };
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      JSON.stringify(payload)
    )}`;
  };

  // ------------------ LOADING STATE ------------------
  if (loading) {
    return (
      <div className="history-screen">
        <div className="history-container">
          <BackButton />
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  // ------------------ ERROR STATE ------------------
  if (fetchError) {
    return (
      <div className="history-screen">
        <div className="history-container">
          <BackButton />
          <p className="empty-text">{fetchError}</p>
        </div>
      </div>
    );
  }

  // ------------------ MAIN UI ------------------
  return (
    <div className="history-screen">
      <div className="history-container">
        <BackButton />
        <div className="history-header-bar">
          <h2 className="history-title">Booking History</h2>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {filteredBookings.length === 0 ? (
          <p className="empty-text">No bookings found for this filter.</p>
        ) : (
          <div className="history-list">
            {filteredBookings.map((b) => {
              const id = b.bookingId;
              const poster = b.poster || "/assets/default.jpg";
              const bookingTime = b.bookedOn
                ? new Date(Number(b.bookedOn) * 1000).toLocaleString()
                : "—";

              const showTime = b.schedule !== "—" ? formatTime12h(b.schedule) : (b.eventDate ? `${b.eventDate}` : "TBA");

              return (
                <div
                  key={id}
                  className="history-card"
                  role="button"
                  onClick={() => navigate(`/ticket/${encodeURIComponent(id)}`, { state: { ticket: b } })}
                >
                  <div className="strip-pulse" />

                  <div className="poster-wrap">
                    <img
                      src={poster}
                      alt={b.eventName}
                      className="poster-img"
                      onError={(e) => (e.currentTarget.src = "/assets/default.jpg")}
                    />
                    <div className="poster-badge">{b.eventName}</div>
                  </div>

                  <div className="history-details">
                    <p className="id-text">
                      Booking ID: <span>{id}</span>
                    </p>

                    <h3 className="event-name">{b.eventName}</h3>

                    {b.auditorium && <p className="info"><strong>Venue:</strong> 🏛️ {b.auditorium}</p>}
                    <p className="info">Seats: {Array.isArray(b.seats) ? b.seats.join(", ") : "—"}</p>
                    <p className="info">USN: {b.usn || "—"}</p>
                    <p className="info"><strong>Show:</strong> {showTime}</p>
                    <p className="timestamp">Booked: {bookingTime}</p>
                  </div>

                  <div className="qr-block">
                    <img
                      src={generateQR(b)}
                      alt="qr"
                      className="qr-img"
                      onError={(e) =>
                      (e.currentTarget.src =
                        "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=invalid")
                      }
                    />

                    <div className="history-buttons">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          navigate(`/ticket/${encodeURIComponent(id)}`, { state: { ticket: b } });
                        }}
                        className="history-btn"
                      >
                        OPEN
                      </button>

                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          window.open(`/ticket/${encodeURIComponent(id)}`, "_blank");
                        }}
                        className="history-btn pdf-btn"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
