import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AuditoriumList.css";

export default function AuditoriumList() {
    const location = useLocation();
    const navigate = useNavigate();
    const event = location.state?.event;

    if (!event) {
        return (
            <div className="auditorium-list-page">
                <p>No event data found.</p>
                <button onClick={() => navigate('/user/home')}>Go Home</button>
            </div>
        );
    }

    // Parse auditoriums from comma-separated string
    const auditoriumField = event.Auditorium || event.auditorium || "";
    const auditoriums = auditoriumField
        ? auditoriumField.split(',').map(a => a.trim()).filter(Boolean)
        : [];

    const eventId = event.ID || event.id;
    const eventName = event.Name || event.name;

    const handleSelectAuditorium = (auditorium) => {
        // Navigate to event details with selected auditorium
        navigate(`/event/${eventId}`, {
            state: { event, selectedAuditorium: auditorium }
        });
    };

    return (
        <div className="auditorium-list-page">
            <div className="auditorium-list-container">
                <button className="back-btn" onClick={() => navigate('/user/home')}>
                    ← Back to Events
                </button>

                <h1 className="page-title">{eventName}</h1>
                <p className="page-subtitle">Select an auditorium to view details and book tickets</p>

                <div className="auditorium-grid">
                    {auditoriums.map((audi, idx) => (
                        <div
                            key={idx}
                            className="auditorium-card"
                            onClick={() => handleSelectAuditorium(audi)}
                        >
                            <div className="audi-icon">🏛️</div>
                            <div className="audi-info">
                                <h3 className="audi-name">{audi}</h3>
                                <p className="audi-action">View Details & Book →</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
