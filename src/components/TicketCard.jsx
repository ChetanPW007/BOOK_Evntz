import React from "react";
import QRCode from "qrcode.react";
import "./TicketCard.css";

export default function TicketCard({ ticket }) {
  if (!ticket) return null;

  return (
    <div className="tcard-wrapper fade-in-up">
      <div className="tcard-container premium-glow">

        {/* Left Section */}
        <div className="tcard-left">
          <h2 className="tcard-title gold-text">{ticket.eventName}</h2>

          <div className="tcard-info">
            <div className="t-info-row">
              <span className="t-label">Date:</span>
              <span className="t-value">{ticket.date}</span>
            </div>

            <div className="t-info-row">
              <span className="t-label">Time:</span>
              <span className="t-value">{ticket.time}</span>
            </div>

            <div className="t-info-row">
              <span className="t-label">Venue:</span>
              <span className="t-value">{ticket.venue}</span>
            </div>

            <div className="t-info-row">
              <span className="t-label">Seats:</span>
              <span className="t-value">{ticket.seats.join(", ")}</span>
            </div>

            <div className="t-info-row">
              <span className="t-label">Status:</span>
              <span className="t-value confirmed">✔ Confirmed</span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="tcard-right">
          <div className="qr-wrapper">
            <QRCode
              value={JSON.stringify(ticket)}
              size={130}
              className="qr-box"
            />
            <div className="verified-badge">
              <span className="v-dot"></span> Verified Secure QR
            </div>
          </div>
          <p className="scan-text">Scan at Entry</p>
        </div>

      </div>

      {/* Perforated Cut Line */}
      <div className="tcard-cut-line">
        <span></span>
      </div>
    </div>
  );
}
