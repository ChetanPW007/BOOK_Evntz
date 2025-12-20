import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Events.css";
import EventCard from "../../components/EventCard";
import Loading from "../../components/Loading";
import { apiGet } from "../../utils/api";

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [auditoriums, setAuditoriums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Convert speaker/coordinator strings → array
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value
      .toString()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const normalizeEvent = (ev, i) => ({
    id: ev.ID || ev.id || ev.rowIndex || `EV${i + 1}`,
    name: ev.Name || ev.name || "Untitled Event",
    auditorium: ev.Auditorium || ev.auditorium || "",
    date: ev.Date || ev.date || "",
    time: ev.Time || ev.time || "",
    college: ev.College || ev.college || "",
    capacity: ev.Capacity || ev.capacity || "",
    poster:
      ev.Poster?.toString().trim() ||
      ev.poster?.toString().trim() ||
      "/assets/default.jpg",
    speakers: Array.isArray(ev.Speakers)
      ? ev.Speakers
      : toArray(ev.Speakers || ev.speakers),
    coordinators: Array.isArray(ev.Coordinators)
      ? ev.Coordinators
      : toArray(ev.Coordinators || ev.coordinators),
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Events and Auditoriums in parallel using apiGet
        const [eventsData, auditoriumsData] = await Promise.all([
          apiGet("/events/"),
          apiGet("/auditoriums/"),
        ]);

        // --- Process Events ---
        let eventsArray = Array.isArray(eventsData)
          ? eventsData
          : eventsData?.events && Array.isArray(eventsData.events)
            ? eventsData.events
            : [];

        const visibleEvents = eventsArray.filter(
          (ev) =>
            !ev.Visibility || // Assume visible if missing
            String(ev.Visibility).toLowerCase() === "visible" ||
            String(ev.Visibility).toLowerCase() === "true"
        );

        // Filter out past events
        const now = new Date();
        const futureEvents = visibleEvents.filter((ev) => {
          if (!ev.Date) return true;
          try {
            const evDate = new Date(`${ev.Date} ${ev.Time || "23:59"}`);
            // Check if date is valid before comparing
            if (isNaN(evDate.getTime())) return true;
            return evDate >= now;
          } catch {
            return true;
          }
        });

        if (futureEvents.length === 0) {
          setError("No upcoming events found.");
          setEvents([]);
        } else {
          const normalized = futureEvents.map((ev, i) => normalizeEvent(ev, i));
          setEvents(normalized);
          localStorage.setItem("cachedEvents", JSON.stringify(normalized));
        }

        // --- Process Auditoriums ---
        if (auditoriumsData.status === "success" && Array.isArray(auditoriumsData.data)) {
          const activeAuditoriums = auditoriumsData.data.filter(
            (audi) => audi.Status?.toLowerCase() === "active"
          );
          setAuditoriums(activeAuditoriums);
        }
      } catch (err) {
        console.error("Error fetching data:", err);

        const cached = localStorage.getItem("cachedEvents");
        if (cached) {
          setEvents(JSON.parse(cached));
          setError("Loaded offline cached events");
        } else {
          setError("Error fetching events.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="events-page">
      <h1 className="events-heading">🎭 Upcoming Events</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : events.length === 0 ? (
        <p className="no-events-text">No events found.</p>
      ) : (
        <div className="event-grid">
          {events.map((event, index) => (
            <div key={event.id || index} className="event-card-container">
              <EventCard event={event} index={index} />
            </div>
          ))}
        </div>
      )}

      {/* Auditorium Showcase Section */}
      {auditoriums.length > 0 && (
        <section className="auditorium-section">
          <h2 className="section-title">🏛️ Our Auditoriums</h2>
          <div className="auditorium-grid">
            {auditoriums.map((audi, idx) => (
              <div
                key={idx}
                className="auditorium-card"
                onClick={() => navigate(`/user/auditorium/${encodeURIComponent(audi.Name)}`)}
              >
                <div className="audi-card-content">
                  <h4 className="audi-card-name">{audi.Name}</h4>
                  <p className="audi-card-capacity">
                    <span className="capacity-icon">🪑</span>
                    {audi.Capacity || "N/A"} Seats
                  </p>
                  {audi.Description && (
                    <p className="audi-card-desc">{audi.Description}</p>
                  )}
                </div>
                <div className="audi-card-cta">View Events →</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
