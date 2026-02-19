import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "./EventDetail.css";
import { apiGet } from "../../utils/api";

/* ------------------------------ Helpers ------------------------------ */

const safeDate = (input) => {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d) ? null : d;
};

const formatTimeLabel = (slot) => {
  const d = safeDate(slot);
  if (!d) return slot;
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`;
};

const generateDefaultSlots = (dateStr) => {
  const base = safeDate(`${dateStr || "2025-11-12"} 10:00`) || new Date();
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const t = new Date(base);
    t.setHours(base.getHours() + i * 2);
    slots.push(t.toISOString());
  }
  return slots;
};

const normalizeList = (raw) => {
  if (!raw) return [];

  // If already a proper array of objects, return it
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0].name) {
    return raw;
  }

  // If it's an array of strings that look like split JSON, rejoin them
  if (Array.isArray(raw) && raw.length > 0) {
    const firstElem = String(raw[0]).trim();
    const lastElem = String(raw[raw.length - 1]).trim();

    // Check if it looks like a broken JSON array
    if (firstElem.startsWith('[{') || firstElem.startsWith('"{')) {
      try {
        const rejoined = raw.join(',');
        const parsed = JSON.parse(rejoined);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Failed to rejoin and parse split JSON:', e);
      }
    }
  }

  // If it's a string, try to parse as JSON first
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Not valid JSON, try comma-separated
    }
  }

  // Fallback: comma-separated string (for simple name lists)
  return String(raw)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
};

/* ------------------------------ Components ------------------------------ */

const PosterBlock = ({ src, alt }) => {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img
      className="poster"
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc("/assets/default.jpg")}
    />
  );
};

const SpeakerCard = ({ speaker }) => {
  const imgSrc = speaker.image || "/assets/speakers/default.jpg";
  return (
    <div className="speaker-card">
      <img
        src={imgSrc}
        alt={speaker.name}
        onError={(e) => (e.target.src = "/assets/speakers/default.jpg")}
      />
      <div className="speaker-name">{speaker.name || "Guest Speaker"}</div>
      {speaker.role && <div className="muted">{speaker.role}</div>}
    </div>
  );
};

const CoordinatorCard = ({ coord }) => {
  const imgSrc = coord.image || "/assets/user.png";
  return (
    <div className="coord-card">
      <img
        src={imgSrc}
        alt={coord.name}
        onError={(e) => (e.target.src = "/assets/user.png")}
      />
      <div className="speaker-name">{coord.name || "Coordinator"}</div>
      {coord.role && <div className="muted">{coord.role}</div>}
    </div>
  );
};

/* ------------------------------ MAIN ------------------------------ */

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Get selected auditorium from navigation state (if user selected specific auditorium)
  const selectedAuditorium = location.state?.selectedAuditorium;

  /* ------------------------------ LOAD EVENT ------------------------------ */

  useEffect(() => {
    async function loadEventData() {
      setLoadingEvent(true);

      try {
        // STEP 1: Fetch event by ID
        const eventData = await apiGet("/events/");

        if (!eventData.status || eventData.status !== "success") {
          throw new Error("Failed to fetch events");
        }

        // Find the specific event
        const foundEvent = eventData.events.find(
          e => (e.ID || e.id) === eventId
        );

        if (!foundEvent) {
          setEvent(null);
          setLoadingEvent(false);
          return;
        }

        // STEP 2: Fetch coordinators and speakers data
        const [cRes, sRes] = await Promise.all([
          apiGet("/events/coordinators"),
          apiGet("/events/speakers")
        ]);

        const allCoords = cRes.data || [];
        const allSpeakers = sRes.data || [];

        // Helper to find match with null safety
        const findCoord = (name) => {
          if (!name) return null;
          return allCoords.find(c => c && c.Name && c.Name.toLowerCase() === name.toLowerCase());
        };

        const findSpeaker = (name) => {
          if (!name) return null;
          return allSpeakers.find(s => s && s.Name && s.Name.toLowerCase() === name.toLowerCase());
        };

        // STEP 3: Parse and hydrate coordinators
        const coordsField = foundEvent.Coordinators || foundEvent.coordinators || "";
        const rawCoords = normalizeList(coordsField);
        const hydratedCoords = rawCoords.map(c => {
          const match = findCoord(c.name);
          if (match) {
            return {
              name: match.Name,
              role: match.Department || "Coordinator",
              image: match.Photo,
              contact: match.Contact
            };
          }
          return c;
        });

        // STEP 4: Parse and hydrate speakers
        const speakersField = foundEvent.Speakers || foundEvent.speakers || "";
        const rawSpeakers = normalizeList(speakersField);
        const hydratedSpeakers = rawSpeakers.map(s => {
          const match = findSpeaker(s.name);
          if (match) {
            return {
              name: match.Name,
              role: match.Designation || match.Department || s.dept || s.role || "Speaker",
              image: match.Photo || s.image,
              about: match.Bio || s.about || ""
            };
          }
          return s;
        });

        console.log("✅ Event loaded:", foundEvent.Name);

        // STEP 5: Parse dynamic schedules from admin configuration
        let parsedSchedules = [];
        const schedulesField = foundEvent.Schedules || foundEvent.schedules;

        if (schedulesField) {
          try {
            // Try to parse as JSON first
            const schedArr = typeof schedulesField === 'string'
              ? JSON.parse(schedulesField)
              : schedulesField;

            if (Array.isArray(schedArr) && schedArr.length > 0) {
              // Convert {Date, Time} objects to ISO strings
              parsedSchedules = schedArr.map(s => {
                const dateStr = s.Date || s.date;
                const timeStr = s.Time || s.time;
                if (dateStr && timeStr) {
                  return `${dateStr}T${timeStr}:00`;
                }
                return null;
              }).filter(Boolean);
            }
          } catch (e) {
            console.warn("Failed to parse Schedules:", e);
          }
        }

        // Fallback to default slots if no schedules configured
        if (parsedSchedules.length === 0) {
          parsedSchedules = generateDefaultSlots(foundEvent.Date || foundEvent.date);
        }

        console.log("✅ Parsed Schedules:", parsedSchedules);

        // STEP 6: Set normalized event data
        setEvent({
          id: foundEvent.ID || foundEvent.id || eventId,
          name: foundEvent.Name || foundEvent.name || "Event",
          auditorium: selectedAuditorium || foundEvent.Auditorium || foundEvent.auditorium || "Auditorium", // Use selected auditorium if provided
          date: foundEvent.Date || foundEvent.date || "Date TBA",
          time: foundEvent.Time || foundEvent.time || "",
          description: foundEvent.About || foundEvent.Description || foundEvent.description || "",
          poster: foundEvent.Poster || foundEvent.poster || "/assets/default.jpg",
          capacity: foundEvent.Capacity || foundEvent.capacity || "—",
          eventType: foundEvent.EventType || "Auditorium", // Add EventType
          speakers: hydratedSpeakers,
          coordinators: hydratedCoords,
          schedules: parsedSchedules, // Use dynamic schedules
          feedbackFormLink: foundEvent.FeedbackFormLink || "",
          feedbackEnabled: String(foundEvent.FeedbackEnabled || "false"),
        });

        setLoadingEvent(false);

      } catch (err) {
        console.error("❌ Failed to load event:", err);
        setEvent(null);
        setLoadingEvent(false);
      }
    }

    if (eventId) {
      loadEventData();
    } else {
      setLoadingEvent(false);
    }
  }, [eventId]);

  // Realtime feedback polling — refresh feedback status every 15s
  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiGet("/events");
        if (res?.data) {
          const arr = Array.isArray(res.data) ? res.data : [];
          const found = arr.find(
            (e) => String(e.ID || e.id) === String(eventId)
          );
          if (found) {
            setEvent((prev) =>
              prev
                ? {
                  ...prev,
                  feedbackEnabled: String(found.FeedbackEnabled || "false"),
                  feedbackFormLink: found.FeedbackFormLink || prev.feedbackFormLink,
                }
                : prev
            );
          }
        }
      } catch (e) {
        /* silent — polling failure should not break UI */
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [eventId]);


  /* ------------------------------ LOGIC ------------------------------ */

  // Organise schedules by Date: { "YYYY-MM-DD": [ISOStrings] }
  const groupedSchedules = (event?.schedules || []).reduce((acc, s) => {
    const d = safeDate(s);
    if (!d) return acc;
    const dateKey = d.toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(s);
    return acc;
  }, {});

  const availableDates = Object.keys(groupedSchedules).sort();

  // Track active date for the time strip
  const [activeDate, setActiveDate] = useState(null);

  useEffect(() => {
    if (availableDates.length > 0 && !activeDate) {
      setActiveDate(availableDates[0]);
    }
  }, [availableDates, activeDate]);

  const handleTimeClick = (slot) => {
    setSelectedSchedule(slot);
  };

  if (loadingEvent)
    return (
      <div className="event-detail-page">
        <p>Loading event...</p>
      </div>
    );

  if (!event)
    return (
      <div className="event-detail-page">
        <p>Event not found.</p>
      </div>
    );

  /* ------------------------------ UI ------------------------------ */

  return (
    <div className="event-detail-page">
      {/* ------------------------------ Banner ------------------------------ */}
      <div
        className="event-banner"
        style={{
          backgroundImage: `url(${event.poster})`,
        }}
      >
        <div className="event-banner-overlay" />

        <div className="banner-content">
          <div className="banner-left">
            <PosterBlock src={event.poster} alt={event.name} />
          </div>

          <div className="banner-right">
            <h1>{event.name}</h1>

            <div className="event-meta">
              {event.eventType === "Venue" ? (
                <>{`📍 ${event.auditorium}`}</>
              ) : (
                <>{event.auditorium} • {event.capacity} seats</>
              )}
            </div>

            <button
              className="btn secondary ticket-btn"
              onClick={() => navigate("/my-tickets")}
            >
              🎟 View My Tickets
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------ BookMyShow Date Selection ------------------------------ */}
      <div className="section-container time-selection-section">
        <h2 className="section-heading">Select Date & Time</h2>

        {/* Date Strip */}
        <div className="date-strip">
          {availableDates.map((dateKey) => {
            const d = new Date(dateKey);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = d.getDate();
            const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

            return (
              <div
                key={dateKey}
                className={`date-item ${activeDate === dateKey ? "active" : ""}`}
                onClick={() => setActiveDate(dateKey)}
              >
                <span className="day-name">{dayName}</span>
                <span className="day-num">{dayNum}</span>
                <span className="month-name">{monthName}</span>
              </div>
            );
          })}
        </div>

        {/* Time Slots for selected date */}
        <div className="showtime-panel">
          {activeDate && groupedSchedules[activeDate] ? (
            groupedSchedules[activeDate].map((s) => (
              <button
                key={s}
                className={`showtime-btn ${selectedSchedule === s ? "active" : ""}`}
                onClick={() => handleTimeClick(s)}
              >
                {new Date(s).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </button>
            ))
          ) : (
            <p className="muted">No showtimes available for this date</p>
          )}
        </div>
      </div>

      {/* ------------------------------ About Event ------------------------------ */}
      <div className="section-container">
        <h2 className="section-heading">About the Event</h2>
        <p className="event-description-text">
          {event.description || "No description available."}
        </p>
      </div>

      {/* ------------------------------ Speakers/Guests ------------------------------ */}
      {event.speakers.length > 0 && (
        <div className="section-container">
          <h2 className="section-heading">Speakers / Guests</h2>
          <div className="speaker-list">
            {event.speakers.map((sp, i) => (
              <SpeakerCard key={i} speaker={sp} />
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------ Coordinators ------------------------------ */}
      {event.coordinators.length > 0 && (
        <div className="section-container">
          <h2 className="section-heading">Event Coordinators</h2>
          <div className="coord-list">
            {event.coordinators.map((c, i) => (
              <CoordinatorCard key={i} coord={c} />
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------ Venue Info ------------------------------ */}
      <div className="section-container">
        <h2 className="section-heading">Venue</h2>
        <div className="venue-info">
          <div className="venue-name">{event.eventType === "Venue" ? "📍" : "🏛️"} {event.auditorium}</div>
          {event.eventType !== "Venue" && (
            <div className="venue-capacity">Capacity: {event.capacity} seats</div>
          )}
        </div>
      </div>

      {/* ------------------------------ Feedback Link ------------------------------ */}
      {event.feedbackEnabled === "true" && event.feedbackFormLink && (
        <div className="section-container feedback-section">
          <h2 className="section-heading">📝 Event Feedback</h2>
          <p style={{ color: '#aaa', marginBottom: '15px', fontSize: '0.95rem' }}>
            Your feedback helps us improve! Share your experience by filling out the quick form below.
          </p>
          <a
            href={event.feedbackFormLink}
            target="_blank"
            rel="noopener noreferrer"
            className="feedback-link-btn"
          >
            ✨ Share Your Feedback →
          </a>
        </div>
      )}

      {/* ------------------------------ Booking CTA ------------------------------ */}
      <div className="booking-footer">
        {selectedSchedule ? (
          <div className="selection-info">
            <span className="selected-label">Selected:</span>
            <span className="selected-value">
              {new Date(selectedSchedule).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        ) : (
          <div className="selection-info">
            <span className="muted">Please select a time slot above</span>
          </div>
        )}

        <button
          className="btn primary book-now-btn"
          disabled={!selectedSchedule}
          onClick={() => {
            if (event.eventType === "Venue") {
              // Direct Booking Confirmation for Venue
              navigate(`/booking-confirmation`, {
                state: {
                  event: { ...event, Auditorium: event.auditorium },
                  schedule: selectedSchedule,
                  seats: ["General Entry"] // Dummy seat
                }
              });
            } else {
              // Seat Selection for Auditorium
              navigate(`/event/${event.id}/booking`, {
                state: {
                  event: { ...event, Auditorium: event.auditorium },
                  schedule: selectedSchedule
                },
              });
            }
          }}
        >
          {event.eventType === "Venue" ? "Book Entry" : "Select Seats"}
        </button>
      </div>
    </div>
  );
}
