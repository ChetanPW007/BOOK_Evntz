import React, { useState } from "react";
import { motion } from "framer-motion";
import SeatBookingModal from "./SeatBookingModal";
import "./EventModal.css";

export default function EventModal({ event, onClose }) {
  const [openBooking, setOpenBooking] = useState(false);

  return (
    <>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="event-modal glass"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 18 }}
        >
          {/* Close Button */}
          <button className="modal-close" onClick={onClose}>✕</button>

          {/* Modal Content */}
          <div className="modal-body">

            {/* Left Poster */}
            <div className="left">
              <img
                src={event.poster || "/assets/default.jpg"}
                alt={event.title}
                className="poster"
              />
            </div>

            {/* Right Details */}
            <div className="right">

              <h2 className="event-title">{event.title}</h2>

              <p className="event-meta">
                📅 {event.date} <br />
                🕒 {event.time} <br />
                📍 {event.auditorium}
              </p>

              <p className="event-desc">{event.description}</p>

              {/* SPEAKERS */}
              <h3 className="section-title">Guests / Speakers</h3>
              <div className="people-grid">
                {(event.speakers?.length ? event.speakers : ["Guest 1", "Guest 2"]).map((s, idx) => (
                  <div className="person-card" key={idx}>
                    <img
                      src={s.image || "/assets/user-placeholder.png"}
                      alt={s.name || s}
                      className="avatar"
                    />
                    <p>{s.name || s}</p>
                    <small>{s.role || "Guest Speaker"}</small>
                  </div>
                ))}
              </div>

              {/* COORDINATORS */}
              <h3 className="section-title">Coordinators</h3>
              <div className="people-grid">
                {(event.coordinators?.length ? event.coordinators : ["Coordinator 1"]).map((c, idx) => (
                  <div className="person-card" key={idx}>
                    <img
                      src={c.image || "/assets/user-placeholder.png"}
                      alt={c.name || c}
                      className="avatar"
                    />
                    <p>{c.name || c}</p>
                    <small>{c.role || "Event Coordinator"}</small>
                  </div>
                ))}
              </div>

              {/* ACTIONS */}
              <div className="actions">
                <button
                  className="book-btn"
                  onClick={() => setOpenBooking(true)}
                >
                  🎟 Book Tickets
                </button>

                <button className="close-btn" onClick={onClose}>
                  Close
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Booking Modal */}
      {openBooking && (
        <SeatBookingModal event={event} onClose={() => setOpenBooking(false)} />
      )}
    </>
  );
}
