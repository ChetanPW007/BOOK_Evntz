// src/pages/user/TicketPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./TicketPage.css";

export default function TicketPage() {
  const { ticketId, id } = useParams();
  const paramId = ticketId || id;

  const [booking, setBooking] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const ticketRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const usn = currentUser?.usn || "";

  const location = useLocation();

  /* ---------------------------------------------------------
      FETCH TICKET BY CURRENT USER → MATCH BOOKING ID
  --------------------------------------------------------- */
  useEffect(() => {
    async function fetchBooking() {
      // 1. Check if we have data passed via router state (from Booking or MyTickets)
      if (location.state && location.state.ticket) {
        const t = location.state.ticket;
        // Ensure it matches the requested ID to be safe
        if (String(t.bookingId || t.BookingID || t.id) === String(paramId)) {
          const normalized = normalizeBooking(t);
          setBooking(normalized);

          // Build QR
          const qrPayload = {
            bookingId: normalized.bookingId,
            eventName: normalized.eventName,
            auditorium: normalized.auditorium, // Include venue
            seats: normalized.seats,
            schedule: normalized.schedule,
            bookedOn: normalized.bookedOn,
            user: normalized.usn || "guest",
          };

          setQrUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
              JSON.stringify(qrPayload)
            )}`
          );

          setLoading(false);
          return;
        }
      }

      try {
        if (!usn) {
          setBooking(null);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/bookings/user/${encodeURIComponent(usn)}`);
        const text = await res.text();

        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Non-JSON backend response:", text);
          setBooking(null);
          return;
        }

        if (!data.success || !Array.isArray(data.data)) {
          setBooking(null);
          return;
        }

        // search the ticket
        const found = data.data.find(
          (b) =>
            String(b.bookingId || b.BookingID || "").trim() === String(paramId).trim() ||
            String(b.id || "").trim() === String(paramId).trim()
        );

        if (!found) {
          setBooking(null);
          return;
        }

        const normalized = normalizeBooking(found);
        setBooking(normalized);

        // Build QR
        const qrPayload = {
          bookingId: normalized.bookingId,
          eventName: normalized.eventName,
          auditorium: normalized.auditorium, // Include venue
          seats: normalized.seats,
          schedule: normalized.schedule,
          bookedOn: normalized.bookedOn,
          user: normalized.usn || "guest",
        };

        setQrUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
            JSON.stringify(qrPayload)
          )}`
        );

      } catch (err) {
        console.error("Error retrieving booking:", err);
        setBooking(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [paramId, usn, location.state]);

  // Helper to normalize data structure
  const normalizeBooking = (found) => {
    return {
      bookingId: found.bookingId || found.BookingID || found.id || `BK-${Date.now()}`,
      eventName: found.eventName || found.EventName || found.event || found.title || "Event",
      seats: (typeof (found.seats || found.Seats || found.seat) === 'string')
        ? (found.seats || found.Seats || found.seat).split(',').map(s => s.trim())
        : (found.seats || found.Seats || found.seat || []),
      schedule: (() => {
        const val = found.schedule || found.Schedule || found.show || found.showTime || found.time || "TBD";
        try {
          if (val.includes("T")) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          }
          if (val.includes(":")) {
            const [h, m] = val.split(":");
            if (!isNaN(h)) {
              const d = new Date();
              d.setHours(h, m);
              return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            }
          }
        } catch { }
        return val;
      })(),
      bookedOn: found.Timestamp
        ? new Date(Number(found.Timestamp) * 1000).toLocaleString()
        : (found.bookedOn || new Date().toLocaleString()),
      poster:
        found.poster ||
        found.eventImage ||
        found.image ||
        "/assets/default.jpg",
      auditorium: found.Auditorium || found.auditorium || found.venue || "", // Add auditorium
      usn: found.usn || found.usn || found.USN || found.usnNo || "",
      ...found,
    };
  };



  /* ---------------------------------------------------------
      Convert image → base64 to fix CORS issues for PDF
  --------------------------------------------------------- */
  const toBase64 = (url) =>
    fetch(url)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          })
      );

  /* ---------------------------------------------------------
      DOWNLOAD TICKET AS PDF
  --------------------------------------------------------- */
  const downloadPDF = async () => {
    if (!ticketRef.current) return;

    try {
      const poster = ticketRef.current.querySelector("#ticketPoster");
      const qr = ticketRef.current.querySelector("#ticketQR");

      if (poster?.src && !poster.src.startsWith("data:"))
        poster.src = await toBase64(poster.src);

      if (qr?.src && !qr.src.startsWith("data:"))
        qr.src = await toBase64(qr.src);

      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`ticket-${paramId}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("PDF generation failed. Try 'Open in New Tab' → Print.");
    }
  };

  /* ---------------------------------------------------------
      SHARE TICKET
  --------------------------------------------------------- */
  const shareTicket = () => {
    if (!booking) return;

    const text = `🎟 Event Ticket — ${booking.eventName}
Seats: ${booking.seats?.join(", ")}
Show: ${booking.schedule}
Booking ID: ${booking.bookingId}`;

    if (navigator.share) {
      navigator.share({
        title: "Event Ticket",
        text,
        url: window.location.href,
      });
    } else {
      navigator.clipboard?.writeText(`${text}\n${window.location.href}`);
      alert("Copied to clipboard!");
    }
  };

  /* ---------------------------------------------------------
      UI STATES
  --------------------------------------------------------- */
  if (loading)
    return (
      <div className="ticket-page-center">
        <p>Loading ticket…</p>
      </div>
    );

  if (!booking)
    return (
      <div className="ticket-page-center">
        <h2>Ticket Not Found</h2>
        <p>No booking found for ID: {paramId}</p>
      </div>
    );

  /* ---------------------------------------------------------
      MAIN TICKET UI
  --------------------------------------------------------- */
  return (
    <div className="ticket-page">
      <div className="ticket-bms-card premium-glow" ref={ticketRef}>
        <div className="ticket-left">
          <img
            id="ticketPoster"
            src={booking.poster || "/assets/default.jpg"}
            alt="event poster"
            crossOrigin="anonymous"
            onError={(e) => (e.currentTarget.src = "/assets/default.jpg")}
          />
        </div>

        <div className="ticket-cut">
          <span></span>
        </div>

        <div className="ticket-right">
          <h1 className="t-event-name gold-text">{booking.eventName}</h1>

          <div className="t-info-grid">
            <div className="t-field">
              <label>Booking ID</label>
              <span>{booking.bookingId}</span>
            </div>
            <div className="t-field">
              <label>Name</label>
              <span>{booking.userName || "Guest"}</span>
            </div>
            <div className="t-field">
              <label>USN</label>
              <span>{booking.usn}</span>
            </div>
            {booking.auditorium && (
              <div className="t-field">
                <label>Venue</label>
                <span className="highlight-text">🏛️ {booking.auditorium}</span>
              </div>
            )}
            <div className="t-field">
              <label>Seats</label>
              <span className="highlight-text">{booking.seats?.join(", ") || "—"}</span>
            </div>
            <div className="t-field">
              <label>Time</label>
              <span>{booking.schedule}</span>
            </div>
            <div className="t-field">
              <label>Date</label>
              <span className="small-text">{booking.bookedOn}</span>
            </div>
          </div>

          <div className="ticket-qr-section">
            {qrUrl ? (
              <img
                id="ticketQR"
                src={qrUrl}
                alt="QR Code"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="no-qr">QR Loading…</div>
            )}
            <p className="scan-text">Scan at entry</p>
          </div>
        </div>
      </div>

      <div className="ticket-buttons-container">
        <button className="btn-download" onClick={downloadPDF}>
          Download Ticket (PDF)
        </button>

        <button className="btn-share" onClick={shareTicket}>
          Share Ticket
        </button>
      </div>
    </div>
  );
}
