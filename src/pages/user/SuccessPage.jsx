import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SuccessPage.css";

export default function SuccessPage() {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowTicket(true), 900);
    const timer2 = setTimeout(() => setFadeOut(true), 1900);
    const timer3 = setTimeout(() => navigate("/my-tickets"), 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className={`sp-wrapper ${fadeOut ? "fade-out" : ""}`}>
      <div className="sp-card">
        {/* Checkmark */}
        <div className="sp-check-wrapper">
          <div className="sp-circle">
            <div className="sp-check"></div>
          </div>
        </div>

        <h2 className="sp-title">Booking Confirmed</h2>
        <p className="sp-desc">Your seats are successfully reserved.</p>

        {/* Ticket Preview */}
        {showTicket && (
          <div className="sp-ticket-preview">
            <div className="tp-left"></div>

            <div className="tp-body">
              <h4 className="tp-title">Your Ticket is Ready</h4>
              <div className="verified-badge">
                🔒 Verified Secure QR
              </div>

              <div className="tp-lines">
                <div className="tp-line"></div>
                <div className="tp-line short"></div>
                <div className="tp-line medium"></div>
              </div>
            </div>

            <div className="tp-right"></div>
          </div>
        )}

        <div className="sp-redirect">Preparing your ticket...</div>
      </div>
    </div>
  );
}
