// src/components/EventCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./EventCard.css";

export default function EventCard({ event, index }) {
  const navigate = useNavigate();

  if (!event) return null;

  /* ------------------------------
        POSTER HANDLING
  ------------------------------ */
  const poster =
    event.poster ||
    event.Poster ||
    event.image ||
    event.Image ||
    "";

  const posterUrl =
    poster && poster.toString().trim() !== ""
      ? poster
      : "/assets/default.jpg";

  /* ------------------------------
        EVENT ID FIX
  ------------------------------ */
  const id =
    event.id ||
    event.ID ||
    event.rowIndex ||
    (event.name ? event.name.replace(/\s+/g, "-").toLowerCase() : null) ||
    (index !== undefined ? `ev-${index + 1}` : `event-${Date.now()}`);

  /* ------------------------------
        EVENT FIELDS
  ------------------------------ */
  const name = event.name || event.Name || "Untitled Event";
  const category = event.category || event.Category || "";
  const auditorium = event.auditorium || event.Auditorium || "Auditorium";
  const date = event.date || event.Date || "Date TBA";


  // Helper: Format Time 12h
  const rawTime = event.time || event.Time || "";
  let time = rawTime;
  if (rawTime) {
    const [h, m] = rawTime.split(':');
    if (h && m) {
      const d = new Date();
      d.setHours(h, m);
      time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  const college = event.college || event.College || "";
  const capacity = event.capacity ?? event.Capacity ?? "—";

  /* ------------------------------
        OPEN EVENT DETAILS
  ------------------------------ */
  const openDetails = () => {
    // Check if multiple auditoriums (comma-separated)
    const hasMultipleAuditoriums = auditorium && auditorium.includes(',');

    if (hasMultipleAuditoriums) {
      // Navigate to auditorium list page
      navigate(`/event/${id}/auditoriums`, { state: { event } });
    } else {
      // Direct navigation for single auditorium
      navigate(`/event/${id}`, { state: { event } });
    }
  };

  return (
    <div
      className="event-card"
      onClick={openDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && openDetails()}
    >
      {/* ---------------------- Poster ---------------------- */}
      <div className="event-media">
        <img
          src={posterUrl}
          alt={`${name} poster`}
          className="event-poster"
          onError={(e) => {
            e.currentTarget.src = "/assets/default.jpg";
          }}
        />
        {category && <span className="event-badge">{category}</span>}
      </div>

      {/* ---------------------- Body ---------------------- */}
      <div className="event-body">
        <h4 className="event-title">{name}</h4>

        {/* Show multiple auditoriums if comma-separated */}
        {auditorium && auditorium.includes(',') ? (
          <div className="event-audi-chips">
            {auditorium.split(',').map((audi, idx) => (
              <span key={idx} className="event-audi-chip">📍 {audi.trim()}</span>
            ))}
          </div>
        ) : (
          <p className="event-audi">{auditorium}</p>
        )}

        <div className="event-meta">
          <span className="chip">{date}</span>
          {time && <span className="chip muted">{time}</span>}
        </div>

        {/* ---------------------- Footer ---------------------- */}
        <div className="event-footer">
          <div className="chips">
            <span className="small-chip">Capacity: {capacity}</span>
            {college && <span className="small-chip">{college}</span>}
          </div>

          <button
            type="button"
            className="details-btn"
            onClick={(e) => {
              e.stopPropagation(); // stop card click
              openDetails();
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
