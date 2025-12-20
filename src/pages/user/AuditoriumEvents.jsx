import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventCard from "../../components/EventCard";
import Loading from "../../components/Loading";
import "./AuditoriumEvents.css";
import { apiGet } from "../../utils/api";

export default function AuditoriumEvents() {
    const { name } = useParams();
    const navigate = useNavigate();
    const [auditorium, setAuditorium] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch Auditorium Details
                const audiData = await apiGet("/auditoriums/");

                if (audiData.status === "success") {
                    const found = audiData.data.find(
                        a => a.Name.toLowerCase() === name.toLowerCase()
                    );
                    setAuditorium(found);
                }

                // Fetch Events
                const evData = await apiGet("/events/");

                if (evData.status === "success") {
                    // Filter: This Auditorium + Visible + Future
                    const now = new Date();
                    const filtered = evData.events.filter(ev => {
                        const matchAudi = ev.Auditorium?.toLowerCase() === name.toLowerCase();
                        const isVisible = !ev.Visibility ||
                            ev.Visibility.toLowerCase() === "visible" ||
                            ev.Visibility.toLowerCase() === "true";

                        let isFuture = true;
                        if (ev.Date) {
                            try {
                                const evDate = new Date(`${ev.Date} ${ev.Time || "23:59"}`);
                                isFuture = evDate >= now;
                            } catch { }
                        }

                        return matchAudi && isVisible && isFuture;
                    });

                    const normalized = filtered.map((ev, i) => ({
                        id: ev.ID || `EV${i + 1}`,
                        name: ev.Name || "Untitled Event",
                        auditorium: ev.Auditorium || "",
                        date: ev.Date || "",
                        time: ev.Time || "",
                        college: ev.College || "",
                        capacity: ev.Capacity || "",
                        poster: ev.Poster && ev.Poster.trim() !== "" ? ev.Poster : "/assets/default.jpg",
                        speakers: Array.isArray(ev.Speakers) ? ev.Speakers : [],
                        coordinators: Array.isArray(ev.Coordinators) ? ev.Coordinators : [],
                    }));

                    setEvents(normalized);
                }
            } catch (err) {
                console.error("Failed to load data:", err);
            }
            setLoading(false);
        }
        loadData();
    }, [name]);

    if (loading) {
        return (
            <div className="audi-events-page">
                <Loading />
            </div>
        );
    }

    if (!auditorium) {
        return (
            <div className="audi-events-page">
                <div className="not-found">
                    <h2>Auditorium Not Found</h2>
                    <button onClick={() => navigate("/user/home")} className="back-btn">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="audi-events-page">
            {/* Header */}
            <div className="audi-header">
                <button onClick={() => navigate(-1)} className="back-icon">
                    ← Back
                </button>
                <div className="audi-info">
                    <h1 className="audi-name">{auditorium.Name}</h1>
                    <p className="audi-capacity">Capacity: {auditorium.Capacity || "N/A"} seats</p>
                    {auditorium.Description && (
                        <p className="audi-desc">{auditorium.Description}</p>
                    )}
                </div>
            </div>

            {/* Events List */}
            <section className="events-section">
                <h2 className="section-title">Current & Upcoming Events</h2>
                {events.length > 0 ? (
                    <div className="event-grid">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <p className="no-events">No upcoming events scheduled for this auditorium.</p>
                )}
            </section>
        </div>
    );
}
