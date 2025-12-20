// src/components/SeatBookingPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SeatBookingPage.css";
import { apiPost } from "../utils/api";

function defaultSeatLabel(r, c) {
  return `${String.fromCharCode(65 + r)}${c + 1}`;
}

export default function SeatBookingPage({
  event = {},
  schedule = "",
  initialSeats = null,
  rows = 6,
  cols = 8,
  onConfirm = null,
}) {
  const navigate = useNavigate();

  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTicketPreview, setShowTicketPreview] = useState(false);

  const seatStoreKey = (evId, scheduleVal) =>
    `seats_${evId || event?.id}_${String(scheduleVal || "default").replace(
      /[:.]/g,
      "-"
    )}`;

  const { showDate: derivedShowDate, showTime: derivedShowTime } = useMemo(() => {
    if (!schedule) return { showDate: "", showTime: "" };
    const parts = String(schedule).split(" ");
    return { showDate: parts[0] || "", showTime: parts.slice(1).join(" ") || "" };
  }, [schedule]);

  // Get current user safely
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  })();

  const username = currentUser?.name || currentUser?.usn || "guest";
  const userUSN = currentUser?.usn || "";

  // Check if user already booked (local)
  const bookings = (() => {
    try {
      return JSON.parse(localStorage.getItem("bookings") || "[]");
    } catch {
      return [];
    }
  })();

  const userBooking = bookings.find(
    (b) => b.eventId === event?.id && b.username === username
  );

  // Initialize seats
  useEffect(() => {
    const key = seatStoreKey(event?.id, schedule);
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSeats(parsed);
        const sel = parsed.find((s) => s.selected);
        setSelected(sel ? sel.id : null);
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }

    // Generate seats fresh
    const arr = [];
    if (initialSeats?.length) {
      for (let s of initialSeats) {
        arr.push({
          id: s.id,
          label: s.label ?? s.id,
          occupied: !!s.occupied,
          selected: false,
          locked: !!s.locked,
        });
      }
    } else {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          arr.push({
            id: `R${r + 1}C${c + 1}`,
            label: defaultSeatLabel(r, c),
            occupied: false,
            selected: false,
            locked: r === 0 ? false : true,
          });
        }
      }
    }

    // Enforce previous-row lock logic
    const enforceRows = (list) => {
      const byRow = [];
      for (let r = 0; r < rows; r++) {
        byRow[r] = list.filter((s) => s.id.startsWith(`R${r + 1}C`));
      }

      for (let r = 0; r < rows; r++) {
        const prev = r - 1;
        const unlock = prev < 0 ? true : byRow[prev].every((s) => s.occupied);
        byRow[r] = byRow[r].map((s) => ({
          ...s,
          locked: !unlock && !s.occupied,
        }));
      }
      return byRow.flat();
    };

    const enforced = enforceRows(arr);
    localStorage.setItem(key, JSON.stringify(enforced));
    setSeats(enforced);
  }, [event?.id, schedule, initialSeats, rows, cols]);

  // Persist seats
  const persist = (newSeats) => {
    setSeats(newSeats);
    localStorage.setItem(seatStoreKey(event?.id, schedule), JSON.stringify(newSeats));
  };

  // Toggle seat
  const toggleSeat = (id) => {
    if (userBooking) return;
    setSeats((prev) => {
      const next = prev.map((s) => {
        if (s.id === id) {
          if (s.occupied || s.locked) return s;
          return { ...s, selected: !s.selected };
        }
        return { ...s, selected: false };
      });

      const sel = next.find((s) => s.selected);
      setSelected(sel ? sel.id : null);
      setMessage("");
      persist(next);
      return next;
    });
  };

  // *******************************
  // *** UPDATED BACKEND BOOKING ***
  // *******************************
  const confirmHandler = async () => {
    if (!selected) return setMessage("Select one seat to continue.");
    if (userBooking) return setMessage("You already booked a seat.");

    setLoading(true);

    try {
      const bookingPayload = {
        eventId: event?.id,
        eventName: event?.name,
        seat: selected,
        schedule,
        showDate: derivedShowDate,
        showTime: derivedShowTime,
        user: userUSN,
        poster: event?.poster,
      };

      const data = await apiPost("/bookings/create", bookingPayload);

      if (!data.success) {
        setMessage(data.message || "Booking failed.");
        setLoading(false);
        return;
      }

      // Save in local only for UI
      const updatedSeats = seats.map((s) =>
        s.id === selected ? { ...s, occupied: true, selected: false } : s
      );

      persist(updatedSeats);

      localStorage.setItem(
        "lastTicket",
        JSON.stringify({
          ...data.data,
          qrUrl: data.qr,
        })
      );

      setShowTicketPreview(true);
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to backend.");
    } finally {
      setLoading(false);
    }
  };

  const rowsData = Array.from({ length: rows }, (_, r) =>
    seats.filter((s) => s.id.startsWith(`R${r + 1}C`))
  );

  const lastTicket = (() => {
    try {
      return JSON.parse(localStorage.getItem("lastTicket") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div className="sbp-page">

      {/* Header */}
      <header className="sbp-header">
        <div className="sbp-left">
          <img
            className="sbp-poster"
            src={event?.poster || "/assets/default.jpg"}
            alt="poster"
          />
        </div>

        <div className="sbp-mid">
          <h1 className="sbp-title">{event?.name || "Event"}</h1>
          <div className="sbp-meta">
            <span>{event?.auditorium || "Auditorium"}</span>
            <span>•</span>
            <span>{event?.capacity ? `${event.capacity} seats` : ""}</span>
          </div>

          <div className="sbp-showstrip">
            <div className="sbp-show">{schedule || "Select show time"}</div>
            <div className="sbp-small">
              {derivedShowDate} {derivedShowTime}
            </div>
          </div>
        </div>

        <div className="sbp-actions">
          <div className="sbp-price">Price: ₹{event?.price ?? "FREE"}</div>
        </div>
      </header>

      {/* Seats */}
      <main className="sbp-main">
        <div className="sbp-stage">STAGE</div>

        <div className="sbp-seat-area">
          {rowsData.map((rowSeats, idx) => (
            <div key={idx} className="sbp-row">
              <div className="sbp-row-label">{String.fromCharCode(65 + idx)}</div>
              <div className="sbp-row-seats">
                {rowSeats.map((s) => (
                  <button
                    key={s.id}
                    className={`sbp-seat ${s.occupied ? "occupied" : !s.locked ? "available" : "locked"
                      } ${s.selected ? "selected" : ""}`}
                    onClick={() => toggleSeat(s.id)}
                    disabled={s.occupied || s.locked || loading || !!userBooking}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sbp-legend">
          <div>
            <span className="legend-box available"></span> Available
          </div>
          <div>
            <span className="legend-box selected"></span> Selected
          </div>
          <div>
            <span className="legend-box occupied"></span> Occupied
          </div>
          <div>
            <span className="legend-box locked"></span> Locked
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="sbp-footer">
        <div className="sbp-summary">
          <div>
            <div className="sbp-summary-label">Selected</div>
            <div className="sbp-summary-value">{selected || "None"}</div>
          </div>

          <div>
            <div className="sbp-summary-label">Seats</div>
            <div className="sbp-summary-value">{selected ? "1" : 0}</div>
          </div>
        </div>

        <div className="sbp-actionsbar">
          {!userBooking && (
            <button
              className="sbp-confirm-btn"
              onClick={confirmHandler}
              disabled={loading || !selected}
            >
              {loading ? "Booking..." : "Confirm & Pay"}
            </button>
          )}

          {userBooking && (
            <button
              className="view-ticket-btn"
              onClick={() => setShowTicketPreview(true)}
            >
              View Ticket
            </button>
          )}
        </div>
      </footer>

      {message && <div className="sbp-toast">{message}</div>}

      {/* Ticket Preview */}
      {showTicketPreview && lastTicket.bookingId && (
        <div
          className="sbp-preview-overlay"
          onClick={() => setShowTicketPreview(false)}
        >
          <div className="sbp-ticket-card" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-left">
              <img
                src={lastTicket.eventImage || "/assets/default.jpg"}
                alt="poster"
              />
            </div>

            <div className="ticket-right">
              <h2>{lastTicket.eventName}</h2>
              <p>
                <strong>ID:</strong> {lastTicket.bookingId}
              </p>
              <p>
                <strong>Seat:</strong> {lastTicket.seat}
              </p>
              <p>
                <strong>Date:</strong> {lastTicket.showDate}
              </p>
              <p>
                <strong>Time:</strong> {lastTicket.showTime}
              </p>

              <div className="ticket-qr">
                <img src={lastTicket.qrUrl} alt="QR" />
              </div>

              <button
                className="close-preview"
                onClick={() => setShowTicketPreview(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
