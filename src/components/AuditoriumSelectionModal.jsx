import React from "react";
import { useNavigate } from "react-router-dom";
import "./AuditoriumSelectionModal.css";

export default function AuditoriumSelectionModal({ event, onClose }) {
    const navigate = useNavigate();

    if (!event) return null;

    // Parse auditoriums from comma-separated string
    const auditoriums = event.Auditorium
        ? event.Auditorium.split(',').map(a => a.trim()).filter(Boolean)
        : [];

    const handleSelect = (auditorium) => {
        // Navigate to event details with selected auditorium
        navigate(`/event/${event.ID || event.id}`, {
            state: { event, selectedAuditorium: auditorium }
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="audi-modal" onClick={(e) => e.stopPropagation()}>
                <div className="audi-modal-header">
                    <h2>Select Auditorium</h2>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>

                <p className="audi-modal-subtitle">{event.Name || event.name}</p>

                <div className="audi-grid">
                    {auditoriums.map((audi, idx) => (
                        <div
                            key={idx}
                            className="audi-card"
                            onClick={() => handleSelect(audi)}
                        >
                            <div className="audi-icon">🏛️</div>
                            <div className="audi-name">{audi}</div>
                            <div className="audi-action">Select →</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
