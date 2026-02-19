import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiPost } from "../../utils/api";
import "./BookingConfirmation.css";

export default function BookingConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const { event, schedule, seats } = location.state || {}; // seats is likely ["General Entry"] or similar

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookingId, setBookingId] = useState(null);

    // User check
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const usn = currentUser?.usn || "";

    if (!event) {
        return (
            <div className="confirmation-page">
                <div className="confirmation-card error">
                    <h2>No Booking Details Found</h2>
                    <button className="btn secondary" onClick={() => navigate("/user/home")}>Go Home</button>
                </div>
            </div>
        );
    }

    const handleConfirm = async () => {
        if (!usn) {
            alert("Please login first.");
            navigate("/login");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                USN: usn,
                EventID: event.id || event.ID,
                Auditorium: event.Auditorium || event.auditorium,
                Seats: "General Entry",
                Schedule: schedule
            };

            const res = await apiPost("/bookings/add", payload);
            if (res && res.status === "success") {
                setSuccess(true);
                setBookingId(res.bookingId || "CONFIRMED");
            } else {
                alert("Booking failed: " + (res?.message || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            alert("Server error during booking.");
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="confirmation-page">
                <div className="confirmation-card success">
                    <div className="icon-circle">✓</div>
                    <h1>Booking Confirmed!</h1>
                    <p>Your spot for <strong>{event.name || event.Name}</strong> is reserved.</p>

                    <div className="details-box">
                        <p><strong>Date & Time:</strong> {new Date(schedule).toLocaleString()}</p>
                        <p><strong>Venue:</strong> {event.Auditorium || event.auditorium}</p>
                        <p><strong>Booking ID:</strong> {bookingId}</p>
                    </div>

                    <div className="actions">
                        <button className="btn primary" onClick={() => navigate("/my-tickets")}>View Ticket</button>
                        <button className="btn secondary" onClick={() => navigate("/user/home")}>Back to Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="confirmation-page">
            <div className="confirmation-card">
                <h1>Confirm Booking</h1>
                <p className="subtitle">Please review your details before confirming.</p>

                <div className="event-summary">
                    <img src={event.poster || event.Poster || "/assets/default.jpg"} alt="Event" className="summary-poster" />
                    <div className="summary-info">
                        <h2>{event.name || event.Name}</h2>
                        <p className="summary-loc">📍 {event.Auditorium || event.auditorium}</p>
                        <p className="summary-time">📅 {new Date(schedule).toLocaleString()}</p>
                    </div>
                </div>

                <div className="info-row">
                    <span>Entry Type:</span>
                    <strong>General Entry (Free Seating)</strong>
                </div>
                <div className="info-row">
                    <span>Applicant:</span>
                    <strong>{currentUser.name || usn}</strong>
                </div>

                <div className="actions">
                    <button className="btn primary full-width" onClick={handleConfirm} disabled={submitting}>
                        {submitting ? "Confirming..." : "Confirm Booking"}
                    </button>
                    <button className="btn text" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
